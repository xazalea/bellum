/**
 * Unified Cache Coordinator
 * Manages multi-tier caching across memory, IndexedDB, and service worker
 */

export type CacheTier = 'L1' | 'L2' | 'L3';

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  tier: CacheTier;
  size: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  ttl?: number; // Time to live in ms
  version: string;
  checksum?: string;
}

export interface CacheStats {
  l1Size: number;
  l1Count: number;
  l1HitRate: number;
  l2Size: number;
  l2Count: number;
  l2HitRate: number;
  l3Size: number;
  l3Count: number;
  l3HitRate: number;
  totalHits: number;
  totalMisses: number;
  evictions: number;
}

export interface CacheConfig {
  l1MaxSize: number; // Memory cache max size in bytes
  l2MaxSize: number; // IndexedDB max size in bytes
  defaultTTL: number; // Default TTL in ms
  version: string; // App version for cache invalidation
  l1EvictionRatio: number; // Ratio to evict when L1 is full
}

type CacheEventCallback = (event: string, data: any) => void;

const DEFAULT_CONFIG: CacheConfig = {
  l1MaxSize: 50 * 1024 * 1024, // 50MB
  l2MaxSize: 500 * 1024 * 1024, // 500MB
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  version: '1.0.0',
  l1EvictionRatio: 0.2, // Evict 20% when full
};

/**
 * L1 Memory Cache with LRU eviction
 */
class L1Cache {
  private cache: Map<string, CacheEntry> = new Map();
  private currentSize = 0;
  private maxSize: number;
  private evictionRatio: number;

  constructor(maxSize: number, evictionRatio: number) {
    this.maxSize = maxSize;
    this.evictionRatio = evictionRatio;
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
    }
    return entry;
  }

  set(key: string, value: unknown, size: number, ttl?: number, version?: string): void {
    // Check if we need to evict
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Remove old entry if exists
    const existing = this.cache.get(key);
    if (existing) {
      this.currentSize -= existing.size;
    }

    const entry: CacheEntry = {
      key,
      value,
      tier: 'L1',
      size,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
      ttl,
      version: version || '1.0.0',
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  getSize(): number {
    return this.currentSize;
  }

  getCount(): number {
    return this.cache.size;
  }

  getEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  private evictLRU(): void {
    // Find least recently used
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
    }
  }

  evictPercentage(ratio: number): number {
    const toEvict = Math.ceil(this.cache.size * ratio);
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
    
    let evicted = 0;
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      if (this.delete(entries[i][0])) {
        evicted++;
      }
    }
    return evicted;
  }
}

/**
 * L2 IndexedDB Cache
 */
class L2Cache {
  private dbName = 'bellum-cache';
  private storeName = 'cache-store';
  private db: IDBDatabase | null = null;
  private currentSize = 0;
  private maxSize: number;
  private initPromise: Promise<void> | null = null;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        this.calculateSize().then(resolve);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  private async calculateSize(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        this.currentSize = entries.reduce((sum, e) => sum + (e.size || 0), 0);
        resolve();
      };
      
      request.onerror = () => resolve();
    });
  }

  async get(key: string): Promise<CacheEntry | undefined> {
    await this.initPromise;
    if (!this.db) return undefined;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        if (entry) {
          entry.lastAccessedAt = Date.now();
          entry.accessCount++;
          store.put(entry);
        }
        resolve(entry);
      };

      request.onerror = () => resolve(undefined);
    });
  }

  async set(key: string, value: unknown, size: number, ttl?: number, version?: string): Promise<void> {
    await this.initPromise;
    if (!this.db) return;

    // Check if we need to evict
    while (this.currentSize + size > this.maxSize) {
      const evicted = await this.evictLRU();
      if (evicted === 0) break;
    }

    const entry: CacheEntry = {
      key,
      value,
      tier: 'L2',
      size,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
      ttl,
      version: version || '1.0.0',
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(entry);

      request.onsuccess = () => {
        this.currentSize += size;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<boolean> {
    await this.initPromise;
    if (!this.db) return false;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      
      // Get size first
      const getRequest = store.get(key);
      getRequest.onsuccess = () => {
        const entry = getRequest.result as CacheEntry | undefined;
        if (entry) {
          this.currentSize -= entry.size;
        }
        
        const deleteRequest = store.delete(key);
        deleteRequest.onsuccess = () => resolve(true);
        deleteRequest.onerror = () => resolve(false);
      };
      getRequest.onerror = () => resolve(false);
    });
  }

  async has(key: string): Promise<boolean> {
    await this.initPromise;
    if (!this.db) return false;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  }

  async clear(): Promise<void> {
    await this.initPromise;
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        this.currentSize = 0;
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  getSize(): number {
    return this.currentSize;
  }

  private async evictLRU(): Promise<number> {
    await this.initPromise;
    if (!this.db) return 0;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        if (entries.length === 0) {
          resolve(0);
          return;
        }

        // Find LRU
        entries.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
        const toEvict = entries[0];
        
        const deleteRequest = store.delete(toEvict.key);
        deleteRequest.onsuccess = () => {
          this.currentSize -= toEvict.size;
          resolve(1);
        };
        deleteRequest.onerror = () => resolve(0);
      };

      request.onerror = () => resolve(0);
    });
  }

  async getEntries(): Promise<CacheEntry[]> {
    await this.initPromise;
    if (!this.db) return [];

    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as CacheEntry[]);
      request.onerror = () => resolve([]);
    });
  }
}

/**
 * Unified Cache Coordinator
 */
class CacheCoordinator {
  private config: CacheConfig;
  private l1: L1Cache;
  private l2: L2Cache;
  private callbacks: Set<CacheEventCallback> = new Set();
  
  // Stats
  private l1Hits = 0;
  private l1Misses = 0;
  private l2Hits = 0;
  private l2Misses = 0;
  private l3Hits = 0;
  private l3Misses = 0;
  private evictions = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.l1 = new L1Cache(this.config.l1MaxSize, this.config.l1EvictionRatio);
    this.l2 = new L2Cache(this.config.l2MaxSize);
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    // Check L1 first
    const l1Entry = this.l1.get(key);
    if (l1Entry && !this.isExpired(l1Entry)) {
      this.l1Hits++;
      this.notify('hit', { tier: 'L1', key });
      return l1Entry.value as T;
    }

    // Check L2
    const l2Entry = await this.l2.get(key);
    if (l2Entry && !this.isExpired(l2Entry)) {
      this.l2Hits++;
      this.notify('hit', { tier: 'L2', key });
      
      // Promote to L1
      this.l1.set(key, l2Entry.value, l2Entry.size, l2Entry.ttl, l2Entry.version);
      
      return l2Entry.value as T;
    }

    // Cache miss
    this.l1Misses++;
    this.l2Misses++;
    this.notify('miss', { key });
    return undefined;
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options: {
    size?: number;
    ttl?: number;
    tier?: CacheTier;
  } = {}): Promise<void> {
    const size = options.size ?? this.estimateSize(value);
    const ttl = options.ttl ?? this.config.defaultTTL;
    const tier = options.tier ?? 'L1';

    // Check version-based invalidation
    if (tier === 'L1' || tier === 'L2') {
      // Store in L1
      this.l1.set(key, value, size, ttl, this.config.version);
    }

    // Always store in L2 for persistence
    await this.l2.set(key, value, size, ttl, this.config.version);

    this.notify('set', { key, size, tier });
  }

  /**
   * Check if a key exists in cache
   */
  async has(key: string): Promise<boolean> {
    if (this.l1.has(key)) return true;
    return this.l2.has(key);
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    const l1Deleted = this.l1.delete(key);
    const l2Deleted = await this.l2.delete(key);
    this.notify('delete', { key });
    return l1Deleted || l2Deleted;
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.l1.clear();
    await this.l2.clear();
    this.resetStats();
    this.notify('clear', {});
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalHits = this.l1Hits + this.l2Hits + this.l3Hits;
    const totalMisses = this.l1Misses + this.l2Misses + this.l3Misses;

    return {
      l1Size: this.l1.getSize(),
      l1Count: this.l1.getCount(),
      l1HitRate: this.l1Hits + this.l1Misses > 0 ? this.l1Hits / (this.l1Hits + this.l1Misses) : 0,
      l2Size: this.l2.getSize(),
      l2Count: 0, // Would need async call
      l2HitRate: this.l2Hits + this.l2Misses > 0 ? this.l2Hits / (this.l2Hits + this.l2Misses) : 0,
      l3Size: 0,
      l3Count: 0,
      l3HitRate: this.l3Hits + this.l3Misses > 0 ? this.l3Hits / (this.l3Hits + this.l3Misses) : 0,
      totalHits,
      totalMisses,
      evictions: this.evictions,
    };
  }

  /**
   * Get all entries from L1
   */
  getL1Entries(): CacheEntry[] {
    return this.l1.getEntries();
  }

  /**
   * Get all entries from L2
   */
  async getL2Entries(): Promise<CacheEntry[]> {
    return this.l2.getEntries();
  }

  /**
   * Invalidate cache by version
   */
  async invalidateVersion(): Promise<void> {
    const l2Entries = await this.l2.getEntries();
    
    for (const entry of l2Entries) {
      if (entry.version !== this.config.version) {
        await this.delete(entry.key);
        this.evictions++;
      }
    }

    // Clear L1 entirely as it may have stale data
    this.l1.clear();
    
    this.notify('invalidate', { reason: 'version' });
  }

  /**
   * Invalidate expired entries
   */
  async invalidateExpired(): Promise<number> {
    let invalidated = 0;

    // Check L1
    for (const entry of this.l1.getEntries()) {
      if (this.isExpired(entry)) {
        this.l1.delete(entry.key);
        invalidated++;
      }
    }

    // Check L2
    const l2Entries = await this.l2.getEntries();
    for (const entry of l2Entries) {
      if (this.isExpired(entry)) {
        await this.l2.delete(entry.key);
        invalidated++;
      }
    }

    this.evictions += invalidated;
    this.notify('invalidate', { reason: 'expired', count: invalidated });
    
    return invalidated;
  }

  /**
   * Subscribe to cache events
   */
  subscribe(callback: CacheEventCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate content-addressed key
   */
  static async contentAddressedKey(data: ArrayBuffer | string): Promise<string> {
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Private methods

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() > entry.createdAt + entry.ttl;
  }

  private estimateSize(value: unknown): number {
    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }
    if (ArrayBuffer.isView(value)) {
      return value.byteLength;
    }
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }
    // Rough estimate for objects
    return JSON.stringify(value).length * 2;
  }

  private resetStats(): void {
    this.l1Hits = 0;
    this.l1Misses = 0;
    this.l2Hits = 0;
    this.l2Misses = 0;
    this.l3Hits = 0;
    this.l3Misses = 0;
    this.evictions = 0;
  }

  private notify(event: string, data: any): void {
    for (const callback of this.callbacks) {
      try {
        callback(event, data);
      } catch (e) {
        console.error('Cache callback error:', e);
      }
    }
  }
}

// Singleton instance
export const cacheCoordinator = new CacheCoordinator();

// Convenience exports
export async function cacheGet<T>(key: string): Promise<T | undefined> {
  return cacheCoordinator.get<T>(key);
}

export async function cacheSet<T>(key: string, value: T, options?: {
  size?: number;
  ttl?: number;
  tier?: CacheTier;
}): Promise<void> {
  return cacheCoordinator.set(key, value, options);
}

export async function cacheHas(key: string): Promise<boolean> {
  return cacheCoordinator.has(key);
}

export async function cacheDelete(key: string): Promise<boolean> {
  return cacheCoordinator.delete(key);
}

export function getCacheStats(): CacheStats {
  return cacheCoordinator.getStats();
}