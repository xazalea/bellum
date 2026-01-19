/**
 * Compression Web Worker
 * Handles file compression in a background thread
 */

import { compress, decompress, initCompression, CompressionAlgorithm } from '@/lib/wasm/compression';

export interface CompressionTask {
  id: string;
  type: 'compress' | 'decompress';
  data: Uint8Array;
  algorithm?: CompressionAlgorithm;
  level?: number;
}

export interface CompressionResult {
  id: string;
  success: boolean;
  data?: Uint8Array;
  error?: string;
  originalSize: number;
  compressedSize: number;
  timeMs: number;
}

// Initialize WASM when worker starts
let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initCompression();
    initialized = true;
  }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<CompressionTask>) => {
  const task = event.data;
  const startTime = performance.now();
  
  try {
    await ensureInit();
    
    let result: Uint8Array;
    let originalSize: number;
    let compressedSize: number;
    
    if (task.type === 'compress') {
      originalSize = task.data.byteLength;
      result = await compress(
        task.data,
        task.algorithm || CompressionAlgorithm.Zstd,
        task.level || 9
      );
      compressedSize = result.byteLength;
    } else {
      compressedSize = task.data.byteLength;
      result = await decompress(
        task.data,
        task.algorithm || CompressionAlgorithm.Gzip
      );
      originalSize = result.byteLength;
    }
    
    const timeMs = performance.now() - startTime;
    
    const response: CompressionResult = {
      id: task.id,
      success: true,
      data: result,
      originalSize,
      compressedSize,
      timeMs,
    };
    
    // Transfer the array buffer to avoid copying
    self.postMessage(response, [result.buffer]);
  } catch (error: any) {
    const timeMs = performance.now() - startTime;
    
    const response: CompressionResult = {
      id: task.id,
      success: false,
      error: error.message || 'Compression failed',
      originalSize: task.data.byteLength,
      compressedSize: 0,
      timeMs,
    };
    
    self.postMessage(response);
  }
};

export {};
