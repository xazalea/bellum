import { fabricCas } from "./cas";
import { cidForText, CID } from "./cid";
import { DeterministicStateMachine, ReducerFn } from "./state_machine";
import { fabricMesh } from "./mesh";
import { speculativeExecutor, SpeculativeCandidate } from "./speculative";
import { semanticMemo } from "./memo";

export interface FabricServiceHandle<State, Request, Response> {
  serviceId: string;
  serviceName: string;
  address: string; // fabric://<serviceId>
  machine: DeterministicStateMachine<State, Request, Response>;
}

export interface FabricRuntimeStats {
  nodeId: string | null;
  servicesHosted: number;
  peers: number;
  knownServices: number;
}

export class FabricRuntime {
  private services = new Map<string, FabricServiceHandle<any, any, any>>();
  private initialized = false;
  private advertiseTimer: number | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await semanticMemo.load();

    // Handle incoming RPC requests.
    fabricMesh.onRpcRequest(async ({ id, serviceId, request, fromPeerId }) => {
      const svc = this.services.get(serviceId);
      if (!svc) {
        fabricMesh.respondRpc(fromPeerId, id, false, undefined, `Service not hosted: ${serviceId}`);
        return;
      }
      try {
        const { response } = await svc.machine.apply(request);
        fabricMesh.respondRpc(fromPeerId, id, true, response, undefined);
      } catch (e: any) {
        fabricMesh.respondRpc(fromPeerId, id, false, undefined, e?.message || "Service error");
      }
    });

    // Periodically re-advertise hosted services so late joiners discover them.
    if (typeof window !== "undefined" && this.advertiseTimer === null) {
      this.advertiseTimer = window.setInterval(() => {
        for (const s of this.services.values()) fabricMesh.advertiseService(s.serviceId, s.serviceName);
      }, 5000);
    }
  }

  getStats(): FabricRuntimeStats {
    return {
      nodeId: fabricMesh.getLocalNodeId(),
      servicesHosted: this.services.size,
      peers: fabricMesh.getPeers().length,
      knownServices: fabricMesh.getServices().length
    };
  }

  listHostedServices(): { serviceId: string; serviceName: string; address: string }[] {
    return Array.from(this.services.values()).map((s) => ({ serviceId: s.serviceId, serviceName: s.serviceName, address: s.address }));
  }

  // Register a deterministic service as a state machine.
  async hostService<State, Request, Response>(args: {
    serviceName: string;
    codeId: string; // versioned identifier (used to derive CodeCID)
    initialState: State;
    reducer: ReducerFn<State, Request, Response>;
  }): Promise<FabricServiceHandle<State, Request, Response>> {
    await this.initialize();

    const serviceId = crypto.randomUUID();
    const codeCid: CID = await cidForText(`code:${args.serviceName}:${args.codeId}`);
    const { cid: initialStateCid } = await fabricCas.putJSON(args.initialState);

    const machine = new DeterministicStateMachine<State, Request, Response>({
      serviceId,
      codeCid,
      initialStateCid,
      reducer: args.reducer
    });

    const handle: FabricServiceHandle<State, Request, Response> = {
      serviceId,
      serviceName: args.serviceName,
      address: `fabric://${serviceId}`,
      machine
    };

    this.services.set(serviceId, handle);
    fabricMesh.advertiseService(serviceId, args.serviceName);

    return handle;
  }

  // Call a service by fabric:// address. If hosted locally, executes locally; otherwise uses P2P RPC.
  async call<Request, Response>(address: string, request: Request): Promise<Response> {
    await this.initialize();

    const serviceId = address.replace(/^fabric:\/\//, "");
    const local = this.services.get(serviceId);
    if (local) {
      const { response } = await local.machine.apply(request);
      return response as Response;
    }

    const res = await fabricMesh.rpcCall(serviceId, request);
    return res as Response;
  }

  // Temporal compute amplification: speculative precompute of likely next requests.
  speculate<State, Request, Response>(handle: FabricServiceHandle<State, Request, Response>, candidates: SpeculativeCandidate<Request>[]) {
    speculativeExecutor.speculate(handle.machine, candidates);
  }

  // General temporal compute amplification hook: compute and memoize any deterministic function of a descriptor.
  async precomputeJSON(scope: "task" | "render" | "compile" | "inference", descriptor: unknown, compute: () => Promise<unknown>) {
    await this.initialize();
    const keyCid = await semanticMemo.keyForDescriptor({ scope, descriptor });
    const existing = await semanticMemo.get(keyCid);
    if (existing) return existing;
    const output = await compute();
    return semanticMemo.memoizeJSON(scope, descriptor, output);
  }
}

export const fabricRuntime = new FabricRuntime();
