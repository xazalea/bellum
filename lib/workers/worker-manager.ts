/**
 * Worker Manager - Manages WebWorkers for emulator execution
 */

export class WorkerManager {
  private workers: Map<string, Worker> = new Map();
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * Create or get a worker
   */
  async getWorker(id: string, workerPath: string): Promise<Worker> {
    if (this.workers.has(id)) {
      return this.workers.get(id)!;
    }

    const worker = new Worker(workerPath, { type: 'module' });
    this.workers.set(id, worker);

    // Set up message handler
    worker.addEventListener('message', (event) => {
      const handlers = this.messageHandlers.get(id);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(event.data);
          } catch (error) {
            console.error('Error in worker message handler:', error);
          }
        });
      }
    });

    return worker;
  }

  /**
   * Send message to worker
   */
  postMessage(workerId: string, message: any): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.postMessage(message);
    }
  }

  /**
   * Subscribe to worker messages
   */
  onMessage(workerId: string, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(workerId)) {
      this.messageHandlers.set(workerId, new Set());
    }
    this.messageHandlers.get(workerId)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(workerId);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Terminate a worker
   */
  terminate(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate();
      this.workers.delete(workerId);
      this.messageHandlers.delete(workerId);
    }
  }

  /**
   * Terminate all workers
   */
  terminateAll(): void {
    this.workers.forEach((worker, id) => {
      worker.terminate();
    });
    this.workers.clear();
    this.messageHandlers.clear();
  }
}

// Singleton instance
export const workerManager = typeof window !== 'undefined' 
  ? new WorkerManager() 
  : null;

