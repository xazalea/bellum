/**
 * Fast Storage Operations (WASM)
 * Chunking, hashing, and content-addressable storage
 */

import { loadAndInstantiate } from './loader';

interface StorageWasm {
  Chunker: {
    new(chunkSize: number): any;
  };
  hash_chunk(data: Uint8Array): Uint8Array;
  hash_chunk_hex(data: Uint8Array): string;
  hash_chunks_batch(chunks: Uint8Array[]): string[];
  content_address(data: Uint8Array): string;
  verify_chunk(data: Uint8Array, expectedHash: string): boolean;
}

let wasmModule: any | null = null;
let useWasm = false;

/**
 * Initialize storage module
 */
export async function initStorage(): Promise<boolean> {
  try {
    wasmModule = await loadAndInstantiate('/wasm/storage.wasm');
    if (wasmModule) {
      useWasm = true;
      console.log('✅ Storage WASM loaded');
      return true;
    }
  } catch (error) {
    console.warn('Storage WASM failed, using JS fallback:', error);
  }
  
  useWasm = false;
  return false;
}

/**
 * Chunker class for splitting large files
 */
export class Chunker {
  private wasmChunker: any | null = null;
  private chunkSize: number;

  constructor(chunkSize: number = 24 * 1024 * 1024) {
    this.chunkSize = chunkSize;
    
    if (useWasm && wasmModule && wasmModule.Chunker) {
      this.wasmChunker = new wasmModule.Chunker(chunkSize);
    }
  }

  /**
   * Calculate number of chunks
   */
  chunkCount(dataSize: number): number {
    if (this.wasmChunker) {
      return this.wasmChunker.chunk_count(dataSize);
    }
    return Math.ceil(dataSize / this.chunkSize);
  }

  /**
   * Get chunk boundaries [start, end]
   */
  chunkBoundaries(chunkIndex: number, totalSize: number): [number, number] {
    if (this.wasmChunker) {
      const bounds = this.wasmChunker.chunk_boundaries(chunkIndex, totalSize);
      return [bounds[0], bounds[1]];
    }
    
    // JS fallback
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, totalSize);
    return [start, end];
  }

  /**
   * Split data into chunks
   */
  async *splitData(data: Uint8Array): AsyncGenerator<{ index: number; chunk: Uint8Array; hash: string }> {
    const totalChunks = this.chunkCount(data.length);
    
    for (let i = 0; i < totalChunks; i++) {
      const [start, end] = this.chunkBoundaries(i, data.length);
      const chunk = data.slice(start, end);
      const hash = await hashChunk(chunk);
      
      yield { index: i, chunk, hash };
    }
  }
}

/**
 * Hash a single chunk
 */
export async function hashChunk(data: Uint8Array): Promise<string> {
  if (!wasmModule && !useWasm) {
    await initStorage();
  }

  if (useWasm && wasmModule) {
    try {
      return wasmModule.hash_chunk_hex(data);
    } catch (error) {
      console.warn('WASM chunk hash failed, using fallback:', error);
      useWasm = false;
    }
  }

  // JavaScript fallback (SubtleCrypto)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash multiple chunks in batch (parallel)
 */
export async function hashChunksBatch(chunks: Uint8Array[]): Promise<string[]> {
  if (!wasmModule && !useWasm) {
    await initStorage();
  }

  if (useWasm && wasmModule) {
    try {
      return wasmModule.hash_chunks_batch(chunks);
    } catch (error) {
      console.warn('WASM batch hash failed, using fallback:', error);
      useWasm = false;
    }
  }

  // JavaScript fallback (parallel)
  return Promise.all(chunks.map(chunk => hashChunk(chunk)));
}

/**
 * Calculate content-addressable key for data
 */
export async function contentAddress(data: Uint8Array): Promise<string> {
  if (!wasmModule && !useWasm) {
    await initStorage();
  }

  if (useWasm && wasmModule) {
    try {
      return wasmModule.content_address(data);
    } catch (error) {
      console.warn('WASM content address failed, using fallback:', error);
      useWasm = false;
    }
  }

  // JavaScript fallback
  return hashChunk(data);
}

/**
 * Verify chunk integrity
 */
export async function verifyChunk(data: Uint8Array, expectedHash: string): Promise<boolean> {
  if (!wasmModule && !useWasm) {
    await initStorage();
  }

  if (useWasm && wasmModule) {
    try {
      return wasmModule.verify_chunk(data, expectedHash);
    } catch (error) {
      console.warn('WASM verify failed, using fallback:', error);
      useWasm = false;
    }
  }

  // JavaScript fallback
  const actualHash = await hashChunk(data);
  return actualHash === expectedHash;
}

/**
 * Check if WASM is being used
 */
export function isUsingWasm(): boolean {
  return useWasm;
}
