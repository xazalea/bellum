import { fabricCas } from "./cas";
import { cidForJSON, CID } from "./cid";
import { semanticMemo } from "./memo";

export interface Transition<Request, Response> {
  seq: number;
  request: Request;
  requestCid: CID;
  prevStateCid: CID;
  nextStateCid: CID;
  responseCid: CID;
  traceCid: CID;
  createdAt: number;
}

export interface MachineHead {
  serviceId: string;
  codeCid: CID;
  stateCid: CID;
  lastSeq: number;
  logCids: CID[];
}

export type ReducerFn<State, Request, Response> = (state: State, request: Request) => {
  nextState: State;
  response: Response;
  trace?: Record<string, unknown>;
};

// Deterministic state machine: all authority is CodeCID + StateCID + ordered transitions.
export class DeterministicStateMachine<State, Request, Response> {
  private head: MachineHead;
  private reducer: ReducerFn<State, Request, Response>;

  constructor(args: { serviceId: string; codeCid: CID; initialStateCid: CID; reducer: ReducerFn<State, Request, Response> }) {
    this.head = {
      serviceId: args.serviceId,
      codeCid: args.codeCid,
      stateCid: args.initialStateCid,
      lastSeq: 0,
      logCids: []
    };
    this.reducer = args.reducer;
  }

  getServiceId(): string {
    return this.head.serviceId;
  }

  getHead(): MachineHead {
    return { ...this.head, logCids: [...this.head.logCids] };
  }

  // Apply a request as a deterministic transition.
  async apply(request: Request): Promise<{ response: Response; transition: Transition<Request, Response> }> {
    const { response, transition } = await this.simulate(request, this.head.stateCid, this.head.lastSeq + 1);

    // Commit: advance authoritative head.
    this.head.lastSeq = transition.seq;
    this.head.stateCid = transition.nextStateCid;
    this.head.logCids.push(transition.traceCid);

    return { response, transition };
  }

  // Simulate a transition from a given state CID without mutating the machine head.
  // This is used for speculative execution / temporal amplification.
  async simulate(
    request: Request,
    fromStateCid: CID,
    seq: number = 1
  ): Promise<{ response: Response; transition: Transition<Request, Response> }> {
    const prevState = await fabricCas.getJSON<State>(fromStateCid);

    const keyCid = await semanticMemo.keyForDescriptor({
      scope: "transition",
      serviceId: this.head.serviceId,
      codeCid: this.head.codeCid,
      prevStateCid: fromStateCid,
      request
    });

    const existing = await semanticMemo.get(keyCid);
    if (existing) {
      const cached = await fabricCas.getJSON<{ nextStateCid: CID; response: Response; transition: Transition<Request, Response> }>(existing.outputCid);
      return { response: cached.response, transition: cached.transition };
    }

    const result = this.reducer(prevState, request);

    const requestCid = await cidForJSON(request);
    const { cid: nextStateCid } = await fabricCas.putJSON(result.nextState);
    const { cid: responseCid } = await fabricCas.putJSON(result.response);
    const traceObj = result.trace ?? { ok: true };
    const { cid: traceCid } = await fabricCas.putJSON({ trace: traceObj, requestCid, prevStateCid: fromStateCid, nextStateCid });

    const transition: Transition<Request, Response> = {
      seq,
      request,
      requestCid,
      prevStateCid: fromStateCid,
      nextStateCid,
      responseCid,
      traceCid,
      createdAt: Date.now()
    };

    await semanticMemo.put({
      keyCid,
      scope: "transition",
      outputCid: (await fabricCas.putJSON({ nextStateCid, response: result.response, transition })).cid,
      meta: { serviceId: this.head.serviceId, seq: transition.seq }
    });

    return { response: result.response, transition };
  }

  // Recompute the state by replaying trace CIDs from an initial state.
  async replayFrom(initialStateCid: CID, traceCids: CID[]): Promise<CID> {
    let stateCid = initialStateCid;
    for (const traceCid of traceCids) {
      const trace = await fabricCas.getJSON<{ requestCid: CID; prevStateCid: CID; nextStateCid: CID }>(traceCid);
      // For now, trust trace nextStateCid; deeper verification would re-execute reducer in a deterministic VM.
      stateCid = trace.nextStateCid;
    }
    return stateCid;
  }
}
