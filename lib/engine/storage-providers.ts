/**
 * Storage Providers
 * Multiple storage backends for the virtual file system
 * 
 * Providers:
 * - OPFS (primary)
 * - IndexedDB (fallback)
 * - HTTP (read-only resources)
 * - Puter.js (cloud sync)
 */

import type { StorageProvider, DirectoryEntry } from './virtual-fs';

// ============================================================================
// OPFS Provider
// ============================================================================

export class OPFSProvider implements StorageProvider {
  name = 'OPFS';
  private root: FileSystemDirectoryHandle | null = null;
  private cache: Map<string, { data: Uint8Array; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour
  private prefetchQueue: Set<string> = new Set();
  private readAheadBuffer: Map<string, Uint8Array> = new Map();
  private readonly READ_AHEAD_SIZE = 1024 * 1024; // 1MB read-ahead

  async initialize(): Promise<void> {
    this.root = await navigator.storage.getDirectory();
    
    // Pre-warm cache with frequently accessed files
    await this.warmCache();
  }

  /**
   * Warm cache with critical system files
   */
  private async warmCache(): Promise<void> {
    try {
      const criticalFiles = [
        'wasm-cache/kernel32.dll',
        'wasm-cache/user32.dll',
        'prefetch/C:/Windows/System32/kernel32.dll',
      ];

      for (const file of criticalFiles) {
        try {
          const data = await this.readFile(file);
          this.cache.set(file, { data, timestamp: Date.now() });
        } catch {
          // File doesn't exist yet, skip
        }
      }
    } catch (error) {
      console.warn('[OPFSProvider] Cache warming failed:', error);
    }
  }

  async readFile(path: string): Promise<Uint8Array> {
    if (!this.root) throw new Error('OPFS not initialized');
    
    // Check in-memory cache first
    const cached = this.cache.get(path);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      // Trigger read-ahead for next likely file
      this.scheduleReadAhead(path);
      return cached.data;
    }
    
    // Check read-ahead buffer
    const readAhead = this.readAheadBuffer.get(path);
    if (readAhead) {
      this.readAheadBuffer.delete(path);
      this.cache.set(path, { data: readAhead, timestamp: Date.now() });
      this.scheduleReadAhead(path);
      return readAhead;
    }
    
    const handle = await this.getFileHandle(path, false);
    const file = await handle.getFile();
    const data = new Uint8Array(await file.arrayBuffer());
    
    // Update cache
    this.cache.set(path, { data, timestamp: Date.now() });
    
    // Trigger read-ahead
    this.scheduleReadAhead(path);
    
    return data;
  }
  
  /**
   * Schedule read-ahead for likely next file
   */
  private scheduleReadAhead(currentPath: string): void {
    // In a real implementation, would predict next file based on access patterns
    // For now, prefetch files in the same directory
    const dirPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    if (dirPath && !this.prefetchQueue.has(dirPath)) {
      this.prefetchQueue.add(dirPath);
      this.performReadAhead(dirPath).catch(() => {
        // Ignore errors
      });
    }
  }
  
  /**
   * Perform read-ahead for directory
   */
  private async performReadAhead(dirPath: string): Promise<void> {
    try {
      const entries = await this.listDirectory(dirPath);
      
      // Prefetch first few files in directory
      for (const entry of entries.slice(0, 3)) {
        if (!entry.isDirectory) {
          const filePath = `${dirPath}/${entry.name}`;
          
          // Don't prefetch if already cached
          if (!this.cache.has(filePath) && !this.readAheadBuffer.has(filePath)) {
            try {
              const handle = await this.getFileHandle(filePath, false);
              const file = await handle.getFile();
              
              // Only read-ahead if file is reasonably sized
              if (file.size <= this.READ_AHEAD_SIZE) {
                const data = new Uint8Array(await file.arrayBuffer());
                this.readAheadBuffer.set(filePath, data);
              }
            } catch {
              // Ignore errors
            }
          }
        }
      }
    } catch {
      // Ignore errors
    } finally {
      this.prefetchQueue.delete(dirPath);
    }
  }
  
  /**
   * Prefetch a specific file
   */
  async prefetchFile(path: string): Promise<void> {
    if (this.cache.has(path) || this.readAheadBuffer.has(path)) {
      return; // Already cached
    }
    
    try {
      const handle = await this.getFileHandle(path, false);
      const file = await handle.getFile();
      const data = new Uint8Array(await file.arrayBuffer());
      this.readAheadBuffer.set(path, data);
    } catch {
      // Ignore errors
    }
  }

  async writeFile(path: string, data: Uint8Array): Promise<void> {
    if (!this.root) throw new Error('OPFS not initialized');
    
    const handle = await this.getFileHandle(path, true);
    const writable = await handle.createWritable();
    // Ensure we have a proper ArrayBuffer (not SharedArrayBuffer) for write()
    const bufferData = new Uint8Array(data);
    await writable.write(bufferData);
    await writable.close();
    
    // Update cache
    this.cache.set(path, { data: bufferData, timestamp: Date.now() });
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.root) throw new Error('OPFS not initialized');
    
    const parts = path.split('/');
    const fileName = parts.pop()!;
    const dirPath = parts.join('/');
    
    const dirHandle = await this.getDirectoryHandle(dirPath, false);
    await dirHandle.removeEntry(fileName);
  }

  async listDirectory(path: string): Promise<DirectoryEntry[]> {
    if (!this.root) throw new Error('OPFS not initialized');
    
    const dirHandle = await this.getDirectoryHandle(path, false);
    const entries: DirectoryEntry[] = [];

    // FileSystemDirectoryHandle.entries() exists at runtime but TypeScript types may be incomplete
    // Use type assertion to access the entries() method
    const dirHandleAny = dirHandle as any;
    for await (const [name, handle] of dirHandleAny.entries()) {
      const isDirectory = handle.kind === 'directory';
      let size = 0;
      let lastModified = 0;

      if (!isDirectory) {
        const file = await (handle as FileSystemFileHandle).getFile();
        size = file.size;
        lastModified = file.lastModified;
      }

      entries.push({ name, isDirectory, size, lastModified });
    }

    return entries;
  }

  async createDirectory(path: string): Promise<void> {
    if (!this.root) throw new Error('OPFS not initialized');
    await this.getDirectoryHandle(path, true);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.getFileHandle(path, false);
      return true;
    } catch {
      return false;
    }
  }

  private async getDirectoryHandle(path: string, create: boolean): Promise<FileSystemDirectoryHandle> {
    if (!this.root) throw new Error('OPFS not initialized');
    
    const parts = path.split('/').filter(p => p);
    let handle = this.root;

    for (const part of parts) {
      handle = await handle.getDirectoryHandle(part, { create });
    }

    return handle;
  }

  private async getFileHandle(path: string, create: boolean): Promise<FileSystemFileHandle> {
    const parts = path.split('/').filter(p => p);
    const fileName = parts.pop()!;
    const dirPath = parts.join('/');

    const dirHandle = await this.getDirectoryHandle(dirPath, create);
    return dirHandle.getFileHandle(fileName, { create });
  }
}

// ============================================================================
// IndexedDB Provider (Fallback)
// ============================================================================

export class IndexedDBProvider implements StorageProvider {
  name = 'IndexedDB';
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'VirtualFS';
  private readonly STORE_NAME = 'files';

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'path' });
        }
      };
    });
  }

  async readFile(path: string): Promise<Uint8Array> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.get(path);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          reject(new Error(`File not found: ${path}`));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Calculate content hash for integrity verification
   */
  async calculateHash(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async writeFile(path: string, data: Uint8Array): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.put({ path, data, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.delete(path);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async listDirectory(path: string): Promise<DirectoryEntry[]> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = request.result as string[];
        const entries: DirectoryEntry[] = keys
          .filter(key => key.startsWith(path))
          .map(key => ({
            name: key.substring(path.length + 1),
            isDirectory: false,
            size: 0,
            lastModified: Date.now(),
          }));
        resolve(entries);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async createDirectory(path: string): Promise<void> {
    // IndexedDB doesn't have directories, just store a marker
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.readFile(path);
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// HTTP Provider (Read-only)
// ============================================================================

export class HTTPProvider implements StorageProvider {
  name = 'HTTP';
  constructor(private baseUrl: string) {}

  async readFile(path: string): Promise<Uint8Array> {
    const url = `${this.baseUrl}/${path}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }
  
  /**
   * Prefetch file (download and cache)
   */
  async prefetchFile(path: string): Promise<void> {
    // HTTP provider doesn't cache, but we can trigger download
    try {
      await this.readFile(path);
    } catch {
      // Ignore errors
    }
  }
  
  /**
   * Calculate content hash
   */
  async calculateHash(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async writeFile(path: string, data: Uint8Array): Promise<void> {
    throw new Error('HTTP provider is read-only');
  }

  async deleteFile(path: string): Promise<void> {
    throw new Error('HTTP provider is read-only');
  }

  async listDirectory(path: string): Promise<DirectoryEntry[]> {
    // Would need server-side directory listing support
    throw new Error('HTTP provider does not support directory listing');
  }

  async createDirectory(path: string): Promise<void> {
    throw new Error('HTTP provider is read-only');
  }

  async exists(path: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${path}`;
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Puter.js Provider (Cloud Sync)
// ============================================================================

export class PuterProvider implements StorageProvider {
  name = 'Puter';
  private puter: any = null;

  async initialize(): Promise<void> {
    // Would initialize Puter.js SDK
    if (typeof (globalThis as any).puter !== 'undefined') {
      this.puter = (globalThis as any).puter;
    }
  }

  async readFile(path: string): Promise<Uint8Array> {
    if (!this.puter) throw new Error('Puter not initialized');
    
    const file = await this.puter.fs.read(path);
    return new Uint8Array(await file.arrayBuffer());
  }

  async writeFile(path: string, data: Uint8Array): Promise<void> {
    if (!this.puter) throw new Error('Puter not initialized');
    
    await this.puter.fs.write(path, data);
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.puter) throw new Error('Puter not initialized');
    
    await this.puter.fs.delete(path);
  }

  async listDirectory(path: string): Promise<DirectoryEntry[]> {
    if (!this.puter) throw new Error('Puter not initialized');
    
    const entries = await this.puter.fs.readdir(path);
    return entries.map((e: any) => ({
      name: e.name,
      isDirectory: e.is_dir,
      size: e.size || 0,
      lastModified: e.modified || Date.now(),
    }));
  }

  async createDirectory(path: string): Promise<void> {
    if (!this.puter) throw new Error('Puter not initialized');
    
    await this.puter.fs.mkdir(path);
  }

  async exists(path: string): Promise<boolean> {
    if (!this.puter) throw new Error('Puter not initialized');
    
    try {
      await this.puter.fs.stat(path);
      return true;
    } catch {
      return false;
    }
  }
}

// Export provider instances
export const opfsProvider = new OPFSProvider();
export const indexedDBProvider = new IndexedDBProvider();
export const createHTTPProvider = (baseUrl: string) => new HTTPProvider(baseUrl);
export const puterProvider = new PuterProvider();
