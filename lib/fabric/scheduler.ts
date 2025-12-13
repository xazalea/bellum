export type FabricTaskKind = "compute" | "io" | "gpu" | "speculate";

export interface FabricTask {
  id: string;
  kind: FabricTaskKind;
  utility: number; // higher = more valuable
  checkpointCost: number; // higher = harder to stop
  run: (budgetMs: number) => Promise<"done" | "yield">;
}

export interface SchedulerStats {
  queued: number;
  running: boolean;
  completed: number;
  yields: number;
  lastTickAt?: number;
}

// Idle-slice scheduler used for temporal compute amplification.
export class FabricIdleScheduler {
  private queue: FabricTask[] = [];
  private running = false;
  private completed = 0;
  private yields = 0;
  private lastTickAt?: number;

  enqueue(task: FabricTask) {
    this.queue.push(task);
    // Highest utility first; ties broken by lower checkpoint cost.
    this.queue.sort((a, b) => (b.utility - a.utility) || (a.checkpointCost - b.checkpointCost));
    if (!this.running) void this.pump();
  }

  getStats(): SchedulerStats {
    return { queued: this.queue.length, running: this.running, completed: this.completed, yields: this.yields, lastTickAt: this.lastTickAt };
  }

  private async pump() {
    this.running = true;

    const tick = async (timeRemainingMs: number) => {
      this.lastTickAt = performance.now();
      const sliceBudget = Math.max(0.5, Math.min(2.0, timeRemainingMs));

      while (this.queue.length > 0) {
        const task = this.queue[0];
        const result = await task.run(sliceBudget);
        if (result === "done") {
          this.queue.shift();
          this.completed++;
        } else {
          this.yields++;
          // rotate to avoid starvation
          this.queue.push(this.queue.shift()!);
          break;
        }

        if ((performance.now() - (this.lastTickAt ?? 0)) > timeRemainingMs) break;
      }
    };

    while (this.queue.length > 0) {
      if (typeof (window as any).requestIdleCallback === "function") {
        await new Promise<void>((resolve) => {
          (window as any).requestIdleCallback(
            async (deadline: any) => {
              const budget = Math.max(1, deadline.timeRemaining?.() ?? 1);
              await tick(budget);
              resolve();
            },
            { timeout: 1000 }
          );
        });
      } else {
        // Fallback: small timeout slices.
        await new Promise((r) => setTimeout(r, 8));
        await tick(2);
      }
    }

    this.running = false;
  }
}

export const fabricScheduler = new FabricIdleScheduler();
