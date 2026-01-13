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

  async initialize(): Promise<void> {
    this.root = await navigator.storage.getDirectory();
  }

  async readFile(path: string): Promise<Uint8Array> {
    if (!this.root) throw new Error('OPFS not initialized');
    
    const handle = await this.getFileHandle(path, false);
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }

  async writeFile(path: string, data: Uint8Array): Promise<void> {
    if (!this.root) throw new Error('OPFS not initialized');
    
    const handle = await this.getFileHandle(path, true);
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
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

    for await (const [name, handle] of dirHandle.entries()) {
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
