/**
 * Chunk Graph System for Deduplication
 * Implements content-addressed storage with reference counting
 */

import { hashChunk } from './content-hash';

export interface ChunkNode {
  hash: string;           // XXHash64 content hash
  size: number;           // Chunk size in bytes
  refCount: number;       // Reference count
  storage: 'telegram' | 'local' | 'cdn';
  storageId: string;      // Storage-specific identifier (e.g., Telegram file_id)
  createdAt: number;      // Timestamp
  lastAccessedAt: number; // For LRU eviction
}

export interface FileGraph {
  fileId: string;
  chunks: string[];       // Array of chunk hashes
  metadata: {
    originalSize: number;
    deduplicatedSize: number;
    compressionRatio: number;
    chunkSize: number;
    createdAt: number;
  };
}

export interface ChunkingOptions {
  minChunkSize: number;   // Minimum chunk size (default: 4KB)
  maxChunkSize: number;   // Maximum chunk size (default: 64KB)
  targetChunkSize: number; // Target average chunk size (default: 32KB)
  algorithm: 'fixed' | 'rabin' | 'fastcdc'; // Chunking algorithm
}

const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  minChunkSize: 4 * 1024,
  maxChunkSize: 64 * 1024,
  targetChunkSize: 32 * 1024,
  algorithm: 'fastcdc',
};

/**
 * Chunk Graph Manager
 * Handles deduplication, reference counting, and garbage collection
 */
export class ChunkGraph {
  private chunks: Map<string, ChunkNode> = new Map();
  private files: Map<string, FileGraph> = new Map();
  private options: ChunkingOptions;

  constructor(options: Partial<ChunkingOptions> = {}) {
    this.options = { ...DEFAULT_CHUNKING_OPTIONS, ...options };
  }

  /**
   * Split data into chunks using the configured algorithm
   */
  async splitIntoChunks(data: Uint8Array): Promise<Uint8Array[]> {
    switch (this.options.algorithm) {
      case 'fixed':
        return this.fixedSizeChunking(data);
      case 'rabin':
        return this.rabinChunking(data);
      case 'fastcdc':
        return this.fastCDCChunking(data);
      default:
        return this.fixedSizeChunking(data);
    }
  }

  /**
   * Fixed-size chunking (simple but effective)
   */
  private fixedSizeChunking(data: Uint8Array): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    const chunkSize = this.options.targetChunkSize;
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, data.length);
      chunks.push(data.slice(i, end));
    }
    
    return chunks;
  }

  /**
   * Rabin fingerprinting for content-defined chunking
   */
  private rabinChunking(data: Uint8Array): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    const mask = (1 << 13) - 1; // Target ~8KB chunks
    let hash = 0;
    let start = 0;

    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 1) + data[i]) & 0xFFFFFFFF;

      const shouldSplit = (hash & mask) === 0 || 
                         (i - start >= this.options.maxChunkSize) ||
                         (i === data.length - 1);

      if (shouldSplit && (i - start >= this.options.minChunkSize)) {
        chunks.push(data.slice(start, i + 1));
        start = i + 1;
        hash = 0;
      }
    }

    if (start < data.length) {
      chunks.push(data.slice(start));
    }

    return chunks;
  }

  /**
   * FastCDC (Fast Content-Defined Chunking)
   * More efficient than Rabin fingerprinting
   */
  private fastCDCChunking(data: Uint8Array): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    const normalSize = this.options.targetChunkSize;
    const minSize = this.options.minChunkSize;
    const maxSize = this.options.maxChunkSize;
    
    // Gear hash table for FastCDC
    const gearTable = this.generateGearTable();
    
    let start = 0;
    let hash = 0;
    const maskS = this.generateMask(normalSize);
    const maskL = this.generateMask(normalSize * 2);

    for (let i = 0; i < data.length; i++) {
      hash = (hash << 1) + gearTable[data[i]];
      const chunkSize = i - start;

      if (chunkSize >= minSize) {
        if (chunkSize >= maxSize) {
          chunks.push(data.slice(start, i + 1));
          start = i + 1;
          hash = 0;
        } else if (chunkSize >= normalSize) {
          if ((hash & maskL) === 0) {
            chunks.push(data.slice(start, i + 1));
            start = i + 1;
            hash = 0;
          }
        } else {
          if ((hash & maskS) === 0) {
            chunks.push(data.slice(start, i + 1));
            start = i + 1;
            hash = 0;
          }
        }
      }
    }

    if (start < data.length) {
      chunks.push(data.slice(start));
    }

    return chunks;
  }

  private generateGearTable(): Uint32Array {
    const table = new Uint32Array(256);
    let seed = 0x12345678;
    
    for (let i = 0; i < 256; i++) {
      seed = (seed * 1103515245 + 12345) & 0xFFFFFFFF;
      table[i] = seed;
    }
    
    return table;
  }

  private generateMask(size: number): number {
    const bits = Math.floor(Math.log2(size));
    return (1 << bits) - 1;
  }

  /**
   * Add a chunk to the graph
   */
  addChunk(data: Uint8Array, storage: ChunkNode['storage'], storageId: string): string {
    const hash = hashChunk(data);
    const existing = this.chunks.get(hash);

    if (existing) {
      // Chunk already exists, increment reference count
      existing.refCount++;
      existing.lastAccessedAt = Date.now();
      return hash;
    }

    // New chunk
    const node: ChunkNode = {
      hash,
      size: data.length,
      refCount: 1,
      storage,
      storageId,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    this.chunks.set(hash, node);
    return hash;
  }

  /**
   * Register a file with its chunks
   */
  registerFile(fileId: string, chunkHashes: string[], originalSize: number, chunkSize: number): void {
    const deduplicatedSize = chunkHashes.reduce((sum, hash) => {
      const chunk = this.chunks.get(hash);
      return sum + (chunk ? chunk.size : 0);
    }, 0);

    const graph: FileGraph = {
      fileId,
      chunks: chunkHashes,
      metadata: {
        originalSize,
        deduplicatedSize,
        compressionRatio: originalSize / (deduplicatedSize || 1),
        chunkSize,
        createdAt: Date.now(),
      },
    };

    this.files.set(fileId, graph);
  }

  /**
   * Remove a file and decrement chunk references
   */
  removeFile(fileId: string): void {
    const file = this.files.get(fileId);
    if (!file) return;

    // Decrement reference counts
    for (const hash of file.chunks) {
      const chunk = this.chunks.get(hash);
      if (chunk) {
        chunk.refCount--;
        if (chunk.refCount <= 0) {
          this.chunks.delete(hash);
        }
      }
    }

    this.files.delete(fileId);
  }

  /**
   * Get chunk by hash
   */
  getChunk(hash: string): ChunkNode | undefined {
    const chunk = this.chunks.get(hash);
    if (chunk) {
      chunk.lastAccessedAt = Date.now();
    }
    return chunk;
  }

  /**
   * Get file graph
   */
  getFile(fileId: string): FileGraph | undefined {
    return this.files.get(fileId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalChunks: number;
    totalFiles: number;
    totalSize: number;
    deduplicatedSize: number;
    averageRefCount: number;
    compressionRatio: number;
  } {
    const totalChunks = this.chunks.size;
    const totalFiles = this.files.size;
    
    let totalSize = 0;
    let deduplicatedSize = 0;
    let totalRefCount = 0;

    for (const file of this.files.values()) {
      totalSize += file.metadata.originalSize;
      deduplicatedSize += file.metadata.deduplicatedSize;
    }

    for (const chunk of this.chunks.values()) {
      totalRefCount += chunk.refCount;
    }

    return {
      totalChunks,
      totalFiles,
      totalSize,
      deduplicatedSize,
      averageRefCount: totalChunks > 0 ? totalRefCount / totalChunks : 0,
      compressionRatio: totalSize / (deduplicatedSize || 1),
    };
  }

  /**
   * Garbage collection: remove unreferenced chunks
   */
  garbageCollect(): number {
    let removed = 0;
    
    for (const [hash, chunk] of this.chunks.entries()) {
      if (chunk.refCount <= 0) {
        this.chunks.delete(hash);
        removed++;
      }
    }

    return removed;
  }

  /**
   * LRU eviction: remove least recently used chunks
   */
  evictLRU(maxChunks: number): number {
    if (this.chunks.size <= maxChunks) return 0;

    const sorted = Array.from(this.chunks.entries())
      .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);

    const toRemove = sorted.slice(0, this.chunks.size - maxChunks);
    let removed = 0;

    for (const [hash] of toRemove) {
      this.chunks.delete(hash);
      removed++;
    }

    return removed;
  }

  /**
   * Export graph state for persistence
   */
  export(): { chunks: Array<[string, ChunkNode]>; files: Array<[string, FileGraph]> } {
    return {
      chunks: Array.from(this.chunks.entries()),
      files: Array.from(this.files.entries()),
    };
  }

  /**
   * Import graph state from persistence
   */
  import(data: { chunks: Array<[string, ChunkNode]>; files: Array<[string, FileGraph]> }): void {
    this.chunks = new Map(data.chunks);
    this.files = new Map(data.files);
  }
}
