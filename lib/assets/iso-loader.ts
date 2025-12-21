/**
 * ISO Loader - Handles loading ISO files from GitHub releases or local storage
 * Optimized for performance with streaming, caching, and IndexedDB support
 */

export interface ISOConfig {
  id: string;
  name: string;
  githubUrl?: string;
  cdnUrl?: string;
  localPath?: string;
  size?: number;
  checksum?: string;
}

export const ISO_CONFIGS: Record<string, ISOConfig> = {
  'android-x86-9.0-r2': {
    id: 'android-x86-9.0-r2',
    name: 'Android x86 9.0 R2',
    githubUrl: 'https://github.com/xazalea/bellum/releases/download/v1.0/android-x86-9.0-r2.iso',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/xazalea/bellum@v1.0/android-x86-9.0-r2.iso',
  },
  'windows98': {
    id: 'windows98',
    name: 'Windows 98 SE',
    githubUrl: 'https://github.com/xazalea/bellum/releases/download/v1.0/windows98.iso',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/xazalea/bellum@v1.0/windows98.iso',
  },
};

export class ISOLoader {
  private static dbName = 'bellum-assets';
  private static dbVersion = 1;
  private static storeName = 'isos';
  private static db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB for asset caching
   */
  static async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Get ISO URL - checks cache first, then fetches from GitHub if needed
   */
  static async getISOUrl(isoId: string): Promise<string> {
    const config = ISO_CONFIGS[isoId];
    if (!config) {
      throw new Error(`ISO config not found: ${isoId}`);
    }

    // Try IndexedDB cache first
    try {
      const db = await this.initDB();
      const cached = await this.getFromCache(db, isoId);
      if (cached && cached.url) {
        return cached.url;
      }
    } catch (error) {
      console.warn('IndexedDB cache check failed:', error);
    }

    // Prefer CDN mirrors when available, fallback to GitHub or local storage
    if (config.cdnUrl) {
      return config.cdnUrl;
    }

    if (config.githubUrl) {
      return config.githubUrl;
    }

    // If local path, use Puter client
    if (config.localPath) {
      const { puterClient } = await import('../puter/client');
      return await puterClient.getReadURL(config.localPath);
    }

    throw new Error(`No valid source for ISO: ${isoId}`);
  }

  /**
   * Stream ISO file with progress tracking
   */
  static async streamISO(
    isoId: string,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<Blob> {
    const url = await this.getISOUrl(isoId);
    const config = ISO_CONFIGS[isoId];

    // Check cache first
    try {
      const db = await this.initDB();
      const cached = await this.getFromCache(db, isoId);
      if (cached && cached.blob) {
        return cached.blob;
      }
    } catch (error) {
      console.warn('Cache check failed:', error);
    }

    // Fetch with streaming
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ISO: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (onProgress && total > 0) {
        onProgress(loaded, total);
      }
    }

    const blob = new Blob(chunks as BlobPart[]);

    // Cache the blob
    try {
      const db = await this.initDB();
      await this.saveToCache(db, isoId, blob, url);
    } catch (error) {
      console.warn('Failed to cache ISO:', error);
    }

    return blob;
  }

  /**
   * Get ISO as ArrayBuffer (for emulators that need it)
   */
  static async getISOArrayBuffer(isoId: string): Promise<ArrayBuffer> {
    const blob = await this.streamISO(isoId);
    return await blob.arrayBuffer();
  }

  /**
   * Preload ISO into cache
   */
  static async preloadISO(isoId: string): Promise<void> {
    try {
      await this.streamISO(isoId);
    } catch (error) {
      console.error(`Failed to preload ISO ${isoId}:`, error);
    }
  }

  /**
   * Clear ISO cache
   */
  static async clearCache(isoId?: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      if (isoId) {
        await store.delete(isoId);
      } else {
        await store.clear();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  private static async getFromCache(
    db: IDBDatabase,
    isoId: string
  ): Promise<{ url: string; blob: Blob } | null> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(isoId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.blob) {
          resolve({
            url: result.url || URL.createObjectURL(result.blob),
            blob: result.blob,
          });
        } else {
          resolve(null);
        }
      };
    });
  }

  private static async saveToCache(
    db: IDBDatabase,
    isoId: string,
    blob: Blob,
    url: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ id: isoId, blob, url, timestamp: Date.now() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

