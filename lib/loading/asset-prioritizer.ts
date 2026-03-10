/**
 * Asset Prioritization System
 * Manages asset loading priorities and progressive loading
 */

export type AssetPriority = 'critical' | 'interactive' | 'enhancement';
export type AssetType = 'manifest' | 'code' | 'data' | 'texture' | 'audio' | 'video' | 'model';

export interface Asset {
  id: string;
  url: string;
  type: AssetType;
  priority: AssetPriority;
  size: number;
  dependencies: string[];
  loaded: boolean;
  loading: boolean;
  error?: string;
  data?: ArrayBuffer;
  metadata?: Record<string, unknown>;
}

export interface AssetChunk {
  assetId: string;
  chunkIndex: number;
  totalChunks: number;
  data: Uint8Array;
  priority: AssetPriority;
}

export interface LoadingProgress {
  phase: 'critical' | 'interactive' | 'enhancement' | 'complete';
  loadedAssets: number;
  totalAssets: number;
  loadedBytes: number;
  totalBytes: number;
  currentAsset?: string;
  estimatedTimeRemaining: number;
  bytesPerSecond: number;
}

export interface PrefetchConfig {
  enabled: boolean;
  maxConcurrent: number;
  idleTimeout: number;
  bandwidthThreshold: number; // KB/s below which prefetch is disabled
}

type ProgressCallback = (progress: LoadingProgress) => void;
type AssetCallback = (asset: Asset) => void;

const DEFAULT_PREFETCH_CONFIG: PrefetchConfig = {
  enabled: true,
  maxConcurrent: 3,
  idleTimeout: 5000,
  bandwidthThreshold: 500, // 500 KB/s
};

/**
 * Asset Prioritizer
 */
class AssetPrioritizer {
  private assets: Map<string, Asset> = new Map();
  private loadQueue: Asset[] = [];
  private loading: Set<string> = new Set();
  private loaded: Set<string> = new Set();
  private failed: Set<string> = new Set();
  
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private assetCallbacks: Set<AssetCallback> = new Set();
  
  private totalBytes = 0;
  private loadedBytes = 0;
  private startTime = 0;
  private lastBytesTime = 0;
  private lastBytes = 0;
  private bytesPerSecond = 0;
  
  private prefetchConfig: PrefetchConfig;
  private prefetchQueue: Asset[] = [];
  private prefetching: Set<string> = new Set();
  private idleTimer: number | null = null;
  private isIdle = false;

  constructor(prefetchConfig: Partial<PrefetchConfig> = {}) {
    this.prefetchConfig = { ...DEFAULT_PREFETCH_CONFIG, ...prefetchConfig };
  }

  /**
   * Register an asset for loading
   */
  registerAsset(asset: Omit<Asset, 'loaded' | 'loading'>): void {
    const fullAsset: Asset = {
      ...asset,
      loaded: false,
      loading: false,
    };
    
    this.assets.set(asset.id, fullAsset);
    this.totalBytes += asset.size;
  }

  /**
   * Register multiple assets
   */
  registerAssets(assets: Array<Omit<Asset, 'loaded' | 'loading'>>): void {
    for (const asset of assets) {
      this.registerAsset(asset);
    }
  }

  /**
   * Get asset by ID
   */
  getAsset(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  /**
   * Get all assets by priority
   */
  getAssetsByPriority(priority: AssetPriority): Asset[] {
    return Array.from(this.assets.values()).filter(a => a.priority === priority);
  }

  /**
   * Start loading assets in priority order
   */
  async startLoading(onProgress?: ProgressCallback): Promise<void> {
    if (onProgress) {
      this.progressCallbacks.add(onProgress);
    }

    this.startTime = Date.now();
    this.lastBytesTime = this.startTime;

    // Build load queue sorted by priority
    this.buildLoadQueue();

    // Load critical assets first
    await this.loadPhase('critical');
    
    // Then interactive
    await this.loadPhase('interactive');
    
    // Schedule enhancement for background
    this.schedulePrefetch('enhancement');
  }

  /**
   * Build the load queue sorted by priority and dependencies
   */
  private buildLoadQueue(): void {
    const priorityOrder: Record<AssetPriority, number> = {
      critical: 0,
      interactive: 1,
      enhancement: 2,
    };

    // Sort by priority
    const sorted = Array.from(this.assets.values())
      .filter(a => !a.loaded && !a.loading)
      .sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.size - b.size; // Smaller first within same priority
      });

    // Topological sort for dependencies
    this.loadQueue = this.topologicalSort(sorted);
  }

  /**
   * Topological sort respecting dependencies
   */
  private topologicalSort(assets: Asset[]): Asset[] {
    const result: Asset[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (asset: Asset) => {
      if (visited.has(asset.id)) return;
      if (visiting.has(asset.id)) {
        // Circular dependency, just add it
        return;
      }

      visiting.add(asset.id);

      // Visit dependencies first
      for (const depId of asset.dependencies) {
        const dep = this.assets.get(depId);
        if (dep && !dep.loaded) {
          visit(dep);
        }
      }

      visiting.delete(asset.id);
      visited.add(asset.id);
      result.push(asset);
    };

    for (const asset of assets) {
      visit(asset);
    }

    return result;
  }

  /**
   * Load all assets of a given priority phase
   */
  private async loadPhase(phase: AssetPriority): Promise<void> {
    const phaseAssets = this.loadQueue.filter(a => a.priority === phase);
    
    if (phaseAssets.length === 0) return;

    // Load in parallel with concurrency limit
    const concurrency = phase === 'critical' ? 6 : 3;
    await this.loadWithConcurrency(phaseAssets, concurrency);
  }

  /**
   * Load assets with concurrency limit
   */
  private async loadWithConcurrency(assets: Asset[], concurrency: number): Promise<void> {
    const queue = [...assets];
    const active: Promise<void>[] = [];

    const loadNext = async (): Promise<void> => {
      const asset = queue.shift();
      if (!asset) return;

      await this.loadAsset(asset);
      
      // Continue loading
      if (queue.length > 0) {
        await loadNext();
      }
    };

    // Start concurrent loads
    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      active.push(loadNext());
    }

    await Promise.all(active);
  }

  /**
   * Load a single asset
   */
  private async loadAsset(asset: Asset): Promise<void> {
    if (asset.loaded || asset.loading) return;

    asset.loading = true;
    this.loading.add(asset.id);

    this.notifyProgress();

    try {
      const response = await fetch(asset.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Track progress
      const reader = response.body?.getReader();
      if (!reader) {
        asset.data = await response.arrayBuffer();
      } else {
        const chunks: Uint8Array[] = [];
        let receivedLength = 0;
        const contentLength = parseInt(response.headers.get('Content-Length') || '0');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          receivedLength += value.length;
          this.loadedBytes += value.length;

          // Update bandwidth estimate
          this.updateBandwidth(receivedLength);

          this.notifyProgress();
        }

        // Combine chunks
        asset.data = new ArrayBuffer(receivedLength);
        const view = new Uint8Array(asset.data);
        let offset = 0;
        for (const chunk of chunks) {
          view.set(chunk, offset);
          offset += chunk.length;
        }
      }

      asset.loaded = true;
      this.loaded.add(asset.id);
      
      // Notify asset loaded
      for (const cb of this.assetCallbacks) {
        cb(asset);
      }
    } catch (error) {
      asset.error = String(error);
      this.failed.add(asset.id);
      
      // Try fallback if available
      await this.tryFallback(asset);
    } finally {
      asset.loading = false;
      this.loading.delete(asset.id);
    }
  }

  /**
   * Try fallback for failed asset
   */
  private async tryFallback(asset: Asset): Promise<void> {
    // Check for lower quality fallback
    const fallbackId = `${asset.id}-fallback`;
    const fallback = this.assets.get(fallbackId);
    
    if (fallback && !fallback.loaded) {
      await this.loadAsset(fallback);
      if (fallback.loaded) {
        asset.data = fallback.data;
        asset.loaded = true;
        this.failed.delete(asset.id);
        this.loaded.add(asset.id);
      }
    }
  }

  /**
   * Update bandwidth estimate
   */
  private updateBandwidth(bytesLoaded: number): void {
    const now = Date.now();
    const elapsed = now - this.lastBytesTime;
    
    if (elapsed > 1000) {
      const bytesDelta = this.loadedBytes - this.lastBytes;
      this.bytesPerSecond = (bytesDelta / elapsed) * 1000;
      this.lastBytesTime = now;
      this.lastBytes = this.loadedBytes;
    }
  }

  /**
   * Schedule background prefetch
   */
  private schedulePrefetch(phase: AssetPriority): void {
    if (!this.prefetchConfig.enabled) return;

    const assets = this.loadQueue.filter(
      a => a.priority === phase && !a.loaded && !a.loading
    );
    
    this.prefetchQueue = assets;
    
    // Wait for idle
    this.startIdleDetection();
  }

  /**
   * Start idle detection for prefetch
   */
  private startIdleDetection(): void {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => this.doPrefetch(), { timeout: this.prefetchConfig.idleTimeout });
    } else {
      setTimeout(() => this.doPrefetch(), this.prefetchConfig.idleTimeout);
    }
  }

  /**
   * Execute prefetch
   */
  private async doPrefetch(): Promise<void> {
    // Check bandwidth
    if (this.bytesPerSecond < this.prefetchConfig.bandwidthThreshold * 1024) {
      return;
    }

    this.isIdle = true;

    while (
      this.prefetchQueue.length > 0 &&
      this.prefetching.size < this.prefetchConfig.maxConcurrent &&
      this.isIdle
    ) {
      const asset = this.prefetchQueue.shift();
      if (asset && !asset.loaded) {
        this.prefetching.add(asset.id);
        this.loadAsset(asset).finally(() => {
          this.prefetching.delete(asset.id);
        });
      }
    }
  }

  /**
   * Cancel prefetch on navigation
   */
  cancelPrefetch(): void {
    this.isIdle = false;
    this.prefetchQueue = [];
    
    for (const assetId of this.prefetching) {
      // Note: Actual fetch cancellation would require AbortController
      this.prefetching.delete(assetId);
    }
  }

  /**
   * Get current loading progress
   */
  getProgress(): LoadingProgress {
    const loadedAssets = this.loaded.size;
    const totalAssets = this.assets.size;
    
    let phase: LoadingProgress['phase'] = 'critical';
    const criticalLoaded = this.getAssetsByPriority('critical').filter(a => a.loaded).length;
    const interactiveLoaded = this.getAssetsByPriority('interactive').filter(a => a.loaded).length;
    
    if (criticalLoaded < this.getAssetsByPriority('critical').length) {
      phase = 'critical';
    } else if (interactiveLoaded < this.getAssetsByPriority('interactive').length) {
      phase = 'interactive';
    } else if (loadedAssets < totalAssets) {
      phase = 'enhancement';
    } else {
      phase = 'complete';
    }

    const elapsed = Date.now() - this.startTime;
    const remaining = this.totalBytes - this.loadedBytes;
    const estimatedTimeRemaining = this.bytesPerSecond > 0 
      ? (remaining / this.bytesPerSecond) * 1000 
      : 0;

    const currentAsset = Array.from(this.loading)[0];

    return {
      phase,
      loadedAssets,
      totalAssets,
      loadedBytes: this.loadedBytes,
      totalBytes: this.totalBytes,
      currentAsset,
      estimatedTimeRemaining,
      bytesPerSecond: this.bytesPerSecond,
    };
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(): void {
    const progress = this.getProgress();
    for (const cb of this.progressCallbacks) {
      try {
        cb(progress);
      } catch (e) {
        console.error('Progress callback error:', e);
      }
    }
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Subscribe to asset load events
   */
  onAssetLoaded(callback: AssetCallback): () => void {
    this.assetCallbacks.add(callback);
    return () => this.assetCallbacks.delete(callback);
  }

  /**
   * Check if asset is loaded
   */
  isLoaded(id: string): boolean {
    return this.loaded.has(id);
  }

  /**
   * Get loaded asset data
   */
  getAssetData(id: string): ArrayBuffer | undefined {
    const asset = this.assets.get(id);
    return asset?.loaded ? asset.data : undefined;
  }

  /**
   * Retry failed assets
   */
  async retryFailed(): Promise<void> {
    const failedAssets = Array.from(this.failed)
      .map(id => this.assets.get(id))
      .filter((a): a is Asset => !!a);

    this.failed.clear();
    
    for (const asset of failedAssets) {
      asset.error = undefined;
    }

    await this.loadWithConcurrency(failedAssets, 2);
  }

  /**
   * Clear all assets
   */
  clear(): void {
    this.assets.clear();
    this.loadQueue = [];
    this.loading.clear();
    this.loaded.clear();
    this.failed.clear();
    this.prefetchQueue = [];
    this.prefetching.clear();
    this.totalBytes = 0;
    this.loadedBytes = 0;
  }
}

// Singleton instance
export const assetPrioritizer = new AssetPrioritizer();

// Convenience exports
export function registerAsset(asset: Omit<Asset, 'loaded' | 'loading'>): void {
  assetPrioritizer.registerAsset(asset);
}

export function getLoadingProgress(): LoadingProgress {
  return assetPrioritizer.getProgress();
}

export function isAssetLoaded(id: string): boolean {
  return assetPrioritizer.isLoaded(id);
}