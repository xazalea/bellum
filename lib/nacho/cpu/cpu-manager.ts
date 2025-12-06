/**
 * CPU Manager & Worker Pool
 * Manages multi-threaded CPU emulation workers (WASM JIT + C++ Lifter)
 */

export interface WorkerMessage {
    type: 'LIFT' | 'EXECUTE' | 'SNAPSHOT';
    payload: any;
}

export class CPUWorker {
    private worker: Worker;
    private id: number;
    private busy: boolean = false;

    constructor(id: number) {
        this.id = id;
        // In a real build, this would point to a dedicated worker file
        const blob = new Blob([`
            self.onmessage = function(e) {
                // Mock processing
                const { type, payload } = e.data;
                if (type === 'LIFT') {
                    // Simulate C++ lifting delay
                    setTimeout(() => self.postMessage({ type: 'LIFT_DONE', id: payload.id }), 5);
                } else if (type === 'EXECUTE') {
                    // Simulate WASM execution block
                    // In reality, we would instantiate the JIT module here
                    self.postMessage({ type: 'EXEC_DONE' });
                }
            };
        `], { type: 'application/javascript' });
        
        this.worker = new Worker(URL.createObjectURL(blob));
        this.worker.onmessage = this.handleMessage.bind(this);
    }

    private handleMessage(e: MessageEvent) {
        this.busy = false;
        // Notify manager task is done
    }

    postMessage(msg: WorkerMessage) {
        this.busy = true;
        this.worker.postMessage(msg);
    }

    isBusy() { return this.busy; }
    terminate() { this.worker.terminate(); }
}

export class CPUManager {
    private workers: CPUWorker[] = [];
    private maxWorkers: number;

    constructor() {
        if (typeof window === 'undefined') {
            this.maxWorkers = 0;
            return;
        }
        // Use hardware concurrency, reserve 1 for UI, 1 for GPU Orchestrator
        this.maxWorkers = Math.max(2, (navigator.hardwareConcurrency || 4) - 2);
        // Pool initialization is now handled explicitly via initializeWorkers
    }

    async initializeWorkers(count: number) {
        // Reset if re-initializing
        if (this.workers.length > 0) {
            this.terminateAll();
        }
        
        this.maxWorkers = count;
        for (let i = 0; i < this.maxWorkers; i++) {
            this.workers.push(new CPUWorker(i));
        }
        console.log(`CPUManager: Initialized ${this.maxWorkers} Execution Threads`);
    }

    private initializePool() {
        // Deprecated, use initializeWorkers
    }

    dispatchTask(task: WorkerMessage) {
        // Find idle worker
        const worker = this.workers.find(w => !w.isBusy());
        if (worker) {
            worker.postMessage(task);
        } else {
            // Round-robin fallback or queue
            this.workers[Math.floor(Math.random() * this.workers.length)].postMessage(task);
        }
    }

    terminateAll() {
        this.workers.forEach(w => w.terminate());
        this.workers = [];
    }
}

export const cpuManager = new CPUManager();

