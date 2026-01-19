/**
 * Unified Worker Manager
 * Manages all Web Workers for WASM modules
 */

import { getCompressionPool, destroyCompressionPool } from './compression-pool';

export interface WorkerStats {
  compression: {
    workers: number;
    activeTasks: number;
  };
  fingerprint: {
    initialized: boolean;
  };
  animation: {
    initialized: boolean;
  };
  totalMemory: number;
}

class WorkerManager {
  private static instance: WorkerManager;
  private initialized: boolean = false;
  
  private constructor() {}
  
  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }
  
  /**
   * Initialize all workers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🚀 Initializing WASM Worker Pool...');
    
    // Compression pool initializes on first use
    // Just ensure it's ready
    getCompressionPool();
    
    this.initialized = true;
    console.log('✅ WASM Worker Pool initialized');
  }
  
  /**
   * Get worker statistics
   */
  getStats(): WorkerStats {
    const compressionPool = getCompressionPool();
    
    return {
      compression: {
        workers: navigator.hardwareConcurrency || 4,
        activeTasks: 0, // Would need to track this in the pool
      },
      fingerprint: {
        initialized: true,
      },
      animation: {
        initialized: true,
      },
      totalMemory: (performance as any).memory?.usedJSHeapSize || 0,
    };
  }
  
  /**
   * Terminate all workers
   */
  destroy(): void {
    destroyCompressionPool();
    this.initialized = false;
    console.log('🛑 WASM Worker Pool destroyed');
  }
  
  /**
   * Check if workers are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const workerManager = WorkerManager.getInstance();

// Auto-initialize on module load (non-blocking)
if (typeof window !== 'undefined') {
  workerManager.initialize().catch(err => {
    console.warn('Worker initialization failed:', err);
  });
}
