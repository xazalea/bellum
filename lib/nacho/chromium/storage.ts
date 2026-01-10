/**
 * Storage Management for Chrome/Chromium
 * 
 * Provides persistent storage for browser data including:
 * - Cache
 * - IndexedDB
 * - Cookies
 * - LocalStorage
 * - Session data
 */

/**
 * Cache Manager - HTTP cache implementation
 */
export interface CacheEntry {
  url: string;
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: ArrayBuffer;
  };
  cachedAt: number;
  expiresAt: number;
  size: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100 * 1024 * 1024; // 100 MB
  private currentSize: number = 0;

  async put(url: string, response: Response): Promise<void> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const bodyBuffer = await response.arrayBuffer();
    const size = bodyBuffer.byteLength;

    // Check cache limits
    if (size > this.maxSize) {
      console.warn(`[CacheManager] Response too large to cache: ${url}`);
      return;
    }

    // Evict old entries if needed
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }

    const expiresAt = this.calculateExpiry(headers);
    const entry: CacheEntry = {
      url,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers,
        body: bodyBuffer,
      },
      cachedAt: Date.now(),
      expiresAt,
      size,
    };

    this.cache.set(url, entry);
    this.currentSize += size;

    console.log(`[CacheManager] Cached ${url} (${size} bytes)`);
  }

  async get(url: string): Promise<Response | null> {
    const entry = this.cache.get(url);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(url);
      return null;
    }

    // Create Response object
    const response = new Response(entry.response.body, {
      status: entry.response.status,
      statusText: entry.response.statusText,
      headers: entry.response.headers,
    });

    console.log(`[CacheManager] Cache hit: ${url}`);
    return response;
  }

  delete(url: string): boolean {
    const entry = this.cache.get(url);
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(url);
      console.log(`[CacheManager] Deleted cache entry: ${url}`);
      return true;
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    console.log("[CacheManager] Cleared all cache");
  }

  getSize(): number {
    return this.currentSize;
  }

  getEntryCount(): number {
    return this.cache.size;
  }

  private calculateExpiry(headers: Record<string, string>): number {
    // Check Cache-Control header
    const cacheControl = headers['cache-control'];
    if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1], 10);
        return Date.now() + maxAge * 1000;
      }
    }

    // Check Expires header
    const expires = headers['expires'];
    if (expires) {
      const expiresDate = new Date(expires);
      if (!isNaN(expiresDate.getTime())) {
        return expiresDate.getTime();
      }
    }

    // Default: 1 hour
    return Date.now() + 60 * 60 * 1000;
  }

  private evictOldest(): void {
    let oldestUrl: string | null = null;
    let oldestTime: number = Infinity;

    for (const [url, entry] of this.cache.entries()) {
      if (entry.cachedAt < oldestTime) {
        oldestTime = entry.cachedAt;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      this.delete(oldestUrl);
    }
  }
}

/**
 * IndexedDB Manager - Wrapper for browser's IndexedDB
 */
export class IndexedDBManager {
  private dbName: string = 'ChromiumStorage';
  private version: number = 1;

  async open(storeName: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'key' });
        }
      };
    });
  }

  async set(storeName: string, key: string, value: any): Promise<void> {
    const db = await this.open(storeName);
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  }

  async get(storeName: string, key: string): Promise<any> {
    const db = await this.open(storeName);
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    const result = await new Promise<any>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return result ? result.value : null;
  }

  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.open(storeName);
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.open(storeName);
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  }

  async getAll(storeName: string): Promise<any[]> {
    const db = await this.open(storeName);
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    const results = await new Promise<any[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return results.map(r => r.value);
  }
}

/**
 * Session Storage Manager
 */
export class SessionManager {
  private sessions: Map<string, any> = new Map();

  set(key: string, value: any): void {
    this.sessions.set(key, value);
  }

  get(key: string): any {
    return this.sessions.get(key);
  }

  delete(key: string): boolean {
    return this.sessions.delete(key);
  }

  clear(): void {
    this.sessions.clear();
  }

  keys(): string[] {
    return Array.from(this.sessions.keys());
  }

  has(key: string): boolean {
    return this.sessions.has(key);
  }
}

/**
 * File System Access (OPFS-based)
 */
export class FileSystemManager {
  private root: FileSystemDirectoryHandle | null = null;

  async initialize(): Promise<boolean> {
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      try {
        this.root = await navigator.storage.getDirectory();
        console.log("[FileSystemManager] Initialized with OPFS");
        return true;
      } catch (e) {
        console.error("[FileSystemManager] Failed to initialize OPFS:", e);
        return false;
      }
    } else {
      console.warn("[FileSystemManager] OPFS not supported");
      return false;
    }
  }

  async writeFile(path: string, data: ArrayBuffer | string): Promise<boolean> {
    if (!this.root) {
      console.error("[FileSystemManager] Not initialized");
      return false;
    }

    try {
      const fileHandle = await this.root.getFileHandle(path, { create: true });
      const writable = await fileHandle.createWritable();
      
      if (typeof data === 'string') {
        await writable.write(data);
      } else {
        await writable.write(data);
      }
      
      await writable.close();
      console.log(`[FileSystemManager] Wrote file: ${path}`);
      return true;
    } catch (e) {
      console.error(`[FileSystemManager] Failed to write file ${path}:`, e);
      return false;
    }
  }

  async readFile(path: string): Promise<ArrayBuffer | null> {
    if (!this.root) {
      console.error("[FileSystemManager] Not initialized");
      return null;
    }

    try {
      const fileHandle = await this.root.getFileHandle(path);
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      console.log(`[FileSystemManager] Read file: ${path} (${buffer.byteLength} bytes)`);
      return buffer;
    } catch (e) {
      console.error(`[FileSystemManager] Failed to read file ${path}:`, e);
      return null;
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    if (!this.root) {
      console.error("[FileSystemManager] Not initialized");
      return false;
    }

    try {
      await this.root.removeEntry(path);
      console.log(`[FileSystemManager] Deleted file: ${path}`);
      return true;
    } catch (e) {
      console.error(`[FileSystemManager] Failed to delete file ${path}:`, e);
      return false;
    }
  }

  async listFiles(): Promise<string[]> {
    if (!this.root) {
      console.error("[FileSystemManager] Not initialized");
      return [];
    }

    const files: string[] = [];
    try {
      // @ts-ignore - values() exists
      for await (const entry of this.root.values()) {
        files.push(entry.name);
      }
    } catch (e) {
      console.error("[FileSystemManager] Failed to list files:", e);
    }

    return files;
  }
}

/**
 * Storage Manager - Aggregates all storage types
 */
export class StorageManager {
  private static instance: StorageManager;

  public cache: CacheManager;
  public indexedDB: IndexedDBManager;
  public session: SessionManager;
  public fileSystem: FileSystemManager;

  private constructor() {
    this.cache = new CacheManager();
    this.indexedDB = new IndexedDBManager();
    this.session = new SessionManager();
    this.fileSystem = new FileSystemManager();

    // Initialize file system
    this.fileSystem.initialize();

    console.log("[StorageManager] Initialized");
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async clearAll(): Promise<void> {
    this.cache.clear();
    this.session.clear();
    console.log("[StorageManager] Cleared all storage");
  }

  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return await navigator.storage.estimate();
    }
    return null;
  }

  async persist(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return await navigator.storage.persist();
    }
    return false;
  }
}

// Export singleton
export const storageManager = StorageManager.getInstance();

console.log("[Storage] Module loaded");
