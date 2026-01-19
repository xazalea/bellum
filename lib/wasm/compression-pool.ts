/**
 * Compression Worker Pool
 * Manages multiple compression workers for parallel processing
 */

import type { CompressionTask, CompressionResult } from '@/workers/compression-worker';
import { CompressionAlgorithm } from './compression';

interface PendingTask {
  resolve: (result: CompressionResult) => void;
  reject: (error: Error) => void;
}

export class CompressionPool {
  private workers: Worker[] = [];
  private workerCount: number;
  private nextWorker: number = 0;
  private pendingTasks = new Map<string, PendingTask>();

  constructor(workerCount: number = navigator.hardwareConcurrency || 4) {
    this.workerCount = Math.min(workerCount, 8); // Max 8 workers
    this.initWorkers();
  }

  private initWorkers() {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(
        new URL('../../workers/compression-worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      worker.onmessage = (event: MessageEvent<CompressionResult>) => {
        this.handleResult(event.data);
      };
      
      worker.onerror = (error) => {
        console.error('Compression worker error:', error);
      };
      
      this.workers.push(worker);
    }
    
    console.log(`✅ Compression pool initialized with ${this.workerCount} workers`);
  }

  private handleResult(result: CompressionResult) {
    const pending = this.pendingTasks.get(result.id);
    
    if (pending) {
      if (result.success) {
        pending.resolve(result);
      } else {
        pending.reject(new Error(result.error || 'Compression failed'));
      }
      this.pendingTasks.delete(result.id);
    }
  }

  private getNextWorker(): Worker {
    const worker = this.workers[this.nextWorker];
    this.nextWorker = (this.nextWorker + 1) % this.workers.length;
    return worker;
  }

  /**
   * Compress data using worker pool
   */
  async compress(
    data: Uint8Array,
    algorithm: CompressionAlgorithm = CompressionAlgorithm.Zstd,
    level: number = 9
  ): Promise<CompressionResult> {
    const task: CompressionTask = {
      id: crypto.randomUUID(),
      type: 'compress',
      data,
      algorithm,
      level,
    };

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(task.id, { resolve, reject });
      
      const worker = this.getNextWorker();
      worker.postMessage(task, [data.buffer]);
    });
  }

  /**
   * Decompress data using worker pool
   */
  async decompress(
    data: Uint8Array,
    algorithm: CompressionAlgorithm = CompressionAlgorithm.Gzip
  ): Promise<CompressionResult> {
    const task: CompressionTask = {
      id: crypto.randomUUID(),
      type: 'decompress',
      data,
      algorithm,
    };

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(task.id, { resolve, reject });
      
      const worker = this.getNextWorker();
      worker.postMessage(task, [data.buffer]);
    });
  }

  /**
   * Compress file with progress tracking
   */
  async compressFile(
    file: File,
    algorithm: CompressionAlgorithm = CompressionAlgorithm.Zstd,
    level: number = 9,
    onProgress?: (progress: number) => void
  ): Promise<{
    blob: Blob;
    originalSize: number;
    compressedSize: number;
    ratio: number;
    timeMs: number;
  }> {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    if (onProgress) onProgress(0.5);
    
    const result = await this.compress(data, algorithm, level);
    
    if (onProgress) onProgress(1.0);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Compression failed');
    }
    
    return {
      blob: new Blob([result.data]),
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      ratio: result.compressedSize / result.originalSize,
      timeMs: result.timeMs,
    };
  }

  /**
   * Compress multiple files in parallel
   */
  async compressFiles(
    files: File[],
    algorithm: CompressionAlgorithm = CompressionAlgorithm.Zstd,
    level: number = 9,
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<Array<{
    file: File;
    blob: Blob;
    originalSize: number;
    compressedSize: number;
    ratio: number;
    timeMs: number;
  }>> {
    const results = await Promise.all(
      files.map(async (file, index) => {
        const result = await this.compressFile(
          file,
          algorithm,
          level,
          (progress) => onProgress?.(index, progress)
        );
        return { file, ...result };
      })
    );
    
    return results;
  }

  /**
   * Terminate all workers
   */
  destroy() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.pendingTasks.clear();
  }
}

// Singleton instance
let pool: CompressionPool | null = null;

export function getCompressionPool(): CompressionPool {
  if (!pool) {
    pool = new CompressionPool();
  }
  return pool;
}

export function destroyCompressionPool() {
  if (pool) {
    pool.destroy();
    pool = null;
  }
}
