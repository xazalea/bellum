/**
 * Nacho CPU Worker Pool
 * 
 * Manages a pool of Web Workers dedicated to CPU emulation.
 * Implements the "Thread-per-Core" model for multi-core guest emulation.
 */

export enum WorkerType {
    DECODER = 'decoder',
    EXECUTOR = 'executor',
    IO = 'io'
}

export class WorkerPool {
    private static instance: WorkerPool;
    private workers: Map<string, Worker> = new Map();
    private activeJobs: Map<string, number> = new Map();

    private constructor() {
        // SSR safety: never touch Worker during prerender.
        if (typeof window === 'undefined' || typeof Worker === 'undefined') {
            return;
        }
        // Initialize default pool
        const logicalCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
        console.log(`[CPU] Initializing Worker Pool with ${logicalCores} logical cores`);
        
        for (let i = 0; i < logicalCores; i++) {
            this.spawnWorker(`cpu_core_${i}`, WorkerType.EXECUTOR);
        }
    }

    static getInstance(): WorkerPool {
        if (!WorkerPool.instance) {
            WorkerPool.instance = new WorkerPool();
        }
        return WorkerPool.instance;
    }

    private spawnWorker(id: string, type: WorkerType) {
        if (typeof Worker === 'undefined') return;
        // In a real app, this would load a dedicated worker script
        // For POC, we use a blob or placeholder
        
        const workerScript = `
            self.onmessage = function(e) {
                const { cmd, payload } = e.data;
                if (cmd === 'EXECUTE_BLOCK') {
                    // Simulate JIT execution
                    // Access SharedMemory via payload.heap (if transferred)
                    // Atomics.add(payload.heap, 0, 1);
                    self.postMessage({ status: 'DONE', result: 0 });
                }
            };
        `;
        
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = (e) => {
            // Handle completion
            this.activeJobs.set(id, (this.activeJobs.get(id) || 1) - 1);
        };

        this.workers.set(id, worker);
        this.activeJobs.set(id, 0);
    }

    /**
     * Dispatch a task to the least busy worker
     */
    dispatch(type: WorkerType, data: any) {
        if (typeof window === 'undefined') return;
        // Simple load balancing
        let bestWorkerId = '';
        let minLoad = Infinity;

        for (const [id, load] of this.activeJobs.entries()) {
            if (load < minLoad) {
                minLoad = load;
                bestWorkerId = id;
            }
        }

        if (bestWorkerId) {
            const worker = this.workers.get(bestWorkerId);
            if (worker) {
                this.activeJobs.set(bestWorkerId, minLoad + 1);
                worker.postMessage(data);
            }
        }
    }

    /**
     * Speculative Execution Hook
     * Spawns a task on a worker without waiting for result immediately
     */
    speculate(branchId: number, data: any) {
        // Dispatch to a lower-priority worker or reserved "speculation" core
        this.dispatch(WorkerType.EXECUTOR, { cmd: 'SPECULATE', branchId, data });
    }
}

export const cpuPool: WorkerPool | null = typeof window !== 'undefined' ? WorkerPool.getInstance() : null;

