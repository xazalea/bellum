import { fabricScheduler } from "./scheduler";
import { SemanticMemoStore, semanticMemo } from "./memo";
import { DeterministicStateMachine } from "./state_machine";

export interface SpeculativeCandidate<Request> {
  request: Request;
  probability: number; // 0..1
}

// Generic speculative executor: precomputes likely transitions during idle time.
export class SpeculativeExecutor<State, Request, Response> {
  constructor(private memo: SemanticMemoStore = semanticMemo) {}

  speculate(
    machine: DeterministicStateMachine<State, Request, Response>,
    candidates: SpeculativeCandidate<Request>[]
  ) {
    const head = machine.getHead();

    for (const c of candidates) {
      const utility = Math.max(0.1, Math.min(1, c.probability));

      fabricScheduler.enqueue({
        id: `spec-${head.serviceId}-${Math.random().toString(16).slice(2)}`,
        kind: "speculate",
        utility,
        checkpointCost: 0.1,
        run: async () => {
          // Attempt memo hit first.
          const keyCid = await this.memo.keyForDescriptor({
            scope: "transition",
            serviceId: head.serviceId,
            codeCid: head.codeCid,
            prevStateCid: head.stateCid,
            request: c.request
          });
          const existing = await this.memo.get(keyCid);
          if (existing) return "done";

          // Compute without mutating authoritative head; machine.simulate memoizes the transition.
          await machine.simulate(c.request, head.stateCid, head.lastSeq + 1);
          return "done";
        }
      });
    }
  }
}

export const speculativeExecutor = new SpeculativeExecutor();
