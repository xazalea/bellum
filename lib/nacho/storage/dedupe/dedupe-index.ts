/**
 * Deduplication Index
 * Persists chunk graph to IndexedDB for cross-session deduplication
 */

import { ChunkGraph, ChunkNode, FileGraph } from './chunk-graph';

const DB_NAME = 'nacho_dedupe_index';
const DB_VERSION = 1;
const CHUNK_STORE = 'chunks';
const FILE_STORE = 'files';
const METADATA_STORE = 'metadata';

export interface DedupeMetadata {
  lastGC: number;
  totalSaved: number;
  totalFiles: number;
  version: number;
}

/**
 * IndexedDB-backed deduplication index
 */
export class DedupeIndex {
  private db: IDBDatabase | null = null;
  private graph: ChunkGraph;
  private initialized: boolean = false;

  constructor(graph: ChunkGraph) {
    this.graph = graph;
  }

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create chunk store
        if (!db.objectStoreNames.contains(CHUNK_STORE)) {
          const chunkStore = db.createObjectStore(CHUNK_STORE, { keyPath: 'hash' });
          chunkStore.createIndex('storage', 'storage', { unique: false });
          chunkStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }

        // Create file store
        if (!db.objectStoreNames.contains(FILE_STORE)) {
          db.createObjectStore(FILE_STORE, { keyPath: 'fileId' });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Load the chunk graph from IndexedDB
   */
  async load(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const chunks = await this.getAllFromStore<ChunkNode>(CHUNK_STORE);
    const files = await this.getAllFromStore<FileGraph>(FILE_STORE);

    this.graph.import({
      chunks: chunks.map(c => [c.hash, c] as [string, ChunkNode]),
      files: files.map(f => [f.fileId, f] as [string, FileGraph]),
    });
  }

  /**
   * Save the chunk graph to IndexedDB
   */
  async save(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const { chunks, files } = this.graph.export();

    // Save chunks
    await this.clearStore(CHUNK_STORE);
    for (const [, chunk] of chunks) {
      await this.putInStore(CHUNK_STORE, chunk);
    }

    // Save files
    await this.clearStore(FILE_STORE);
    for (const [, file] of files) {
      await this.putInStore(FILE_STORE, file);
    }

    // Update metadata
    const stats = this.graph.getStats();
    const metadata: DedupeMetadata = {
      lastGC: Date.now(),
      totalSaved: stats.totalSize - stats.deduplicatedSize,
      totalFiles: stats.totalFiles,
      version: DB_VERSION,
    };
    await this.putInStore(METADATA_STORE, { key: 'metadata', ...metadata });
  }

  /**
   * Get metadata
   */
  async getMetadata(): Promise<DedupeMetadata | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.getFromStore<DedupeMetadata & { key: string }>(METADATA_STORE, 'metadata');
    if (!result) return null;

    const { key, ...metadata } = result;
    return metadata;
  }

  /**
   * Perform garbage collection and save
   */
  async garbageCollect(): Promise<number> {
    const removed = this.graph.garbageCollect();
    if (removed > 0) {
      await this.save();
    }
    return removed;
  }

  /**
   * Get chunk by hash
   */
  async getChunk(hash: string): Promise<ChunkNode | null> {
    if (!this.db) throw new Error('Database not initialized');
    return this.getFromStore<ChunkNode>(CHUNK_STORE, hash);
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<FileGraph | null> {
    if (!this.db) throw new Error('Database not initialized');
    return this.getFromStore<FileGraph>(FILE_STORE, fileId);
  }

  /**
   * Find chunks by storage type
   */
  async findChunksByStorage(storage: ChunkNode['storage']): Promise<ChunkNode[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNK_STORE], 'readonly');
      const store = transaction.objectStore(CHUNK_STORE);
      const index = store.index('storage');
      const request = index.getAll(storage);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to query chunks'));
    });
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.clearStore(CHUNK_STORE);
    await this.clearStore(FILE_STORE);
    await this.clearStore(METADATA_STORE);
  }

  /**
   * Close the database
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  // Helper methods

  private getAllFromStore<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get all from ${storeName}`));
    });
  }

  private getFromStore<T>(storeName: string, key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get from ${storeName}`));
    });
  }

  private putInStore(storeName: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to put in ${storeName}`));
    });
  }

  private clearStore(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
    });
  }
}

/**
 * Global dedupe index instance
 */
let globalDedupeIndex: DedupeIndex | null = null;

export async function getDedupeIndex(): Promise<DedupeIndex> {
  if (!globalDedupeIndex) {
    const graph = new ChunkGraph();
    globalDedupeIndex = new DedupeIndex(graph);
    await globalDedupeIndex.init();
    await globalDedupeIndex.load();
  }
  return globalDedupeIndex;
}
