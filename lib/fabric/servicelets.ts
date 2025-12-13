import { FabricIdleScheduler, fabricScheduler } from "./scheduler";

export interface Servicelet<Request, Response> {
  id: string;
  name: string;
  handle: (req: Request) => Promise<Response>;
}

export interface ServiceletHostStats {
  servicelets: number;
  scheduler: ReturnType<FabricIdleScheduler["getStats"]>;
}

// Extreme density execution: many logical servicelets share one scheduler.
export class ServiceletHost {
  private servicelets = new Map<string, Servicelet<any, any>>();

  register<Request, Response>(servicelet: Servicelet<Request, Response>) {
    this.servicelets.set(servicelet.id, servicelet);
  }

  list() {
    return Array.from(this.servicelets.values()).map((s) => ({ id: s.id, name: s.name }));
  }

  getStats(): ServiceletHostStats {
    return { servicelets: this.servicelets.size, scheduler: fabricScheduler.getStats() };
  }

  // Schedule a request to a servicelet as a micro-task.
  schedule<Request, Response>(serviceletId: string, req: Request): Promise<Response> {
    const s = this.servicelets.get(serviceletId);
    if (!s) return Promise.reject(new Error(`Unknown servicelet: ${serviceletId}`));

    return new Promise<Response>((resolve, reject) => {
      fabricScheduler.enqueue({
        id: `svc-${serviceletId}-${crypto.randomUUID()}`,
        kind: "compute",
        utility: 1,
        checkpointCost: 0.2,
        run: async () => {
          try {
            const res = await s.handle(req);
            resolve(res);
          } catch (e) {
            reject(e);
          }
          return "done";
        }
      });
    });
  }
}

export const serviceletHost = new ServiceletHost();
