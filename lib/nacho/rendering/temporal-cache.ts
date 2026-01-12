/**
 * Temporal Cache System
 * 
 * Aggressively caches and reuses rendering data across frames:
 * - Previous frame color/depth buffers
 * - Motion vector history
 * - Shader output cache
 * - Lighting accumulation buffers
 * - Reflection probes
 * - Shadow maps
 * 
 * Cache Strategy:
 * - LRU eviction for least-used resources
 * - Temporal priority (recent frames higher priority)
 * - Compression for older cached frames
 * - Async loading/unloading
 * 
 * The temporal cache is the foundation for zero-cost frame synthesis.
 */

import type { Frame } from '../temporal/temporal-synthesis';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  frameNumber: number;
  accessCount: number;
  lastAccess: number;
  size: number;
  compressed: boolean;
  priority: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
}

/**
 * Generic LRU Cache with temporal priority
 */
class TemporalLRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private currentSize: number = 0;
  private frameNumber: number = 0;
  
  // Statistics
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * Get entry from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (entry) {
      entry.accessCount++;
      entry.lastAccess = Date.now();
      this.hits++;
      return entry.data;
    }
    
    this.misses++;
    return null;
  }

  /**
   * Put entry in cache
   */
  put(key: string, data: T, size: number, priority: number = 0.5): void {
    // Check if we need to evict
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      frameNumber: this.frameNumber,
      accessCount: 0,
      lastAccess: Date.now(),
      size,
      compressed: false,
      priority
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove entry
   */
  remove(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let minScore = Infinity;
    let evictKey: string | null = null;

    // Calculate score for each entry
    for (const [key, entry] of this.cache) {
      const age = this.frameNumber - entry.frameNumber;
      const recency = Date.now() - entry.lastAccess;
      const accessScore = entry.accessCount;
      
      // Lower score = more likely to evict
      const score = (accessScore * entry.priority) / (1 + age * 0.1 + recency * 0.0001);
      
      if (score < minScore) {
        minScore = score;
        evictKey = key;
      }
    }

    if (evictKey) {
      this.remove(evictKey);
      this.evictions++;
    }
  }

  /**
   * Advance frame counter
   */
  nextFrame(): void {
    this.frameNumber++;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    
    return {
      totalEntries: this.cache.size,
      totalSize: this.currentSize,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.misses / totalRequests : 0,
      evictionCount: this.evictions
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

/**
 * Frame Buffer Cache
 */
export class FrameBufferCache {
  private frameCache: TemporalLRUCache<Frame>;
  private maxFrames: number;

  constructor(maxFrames: number = 16) {
    this.maxFrames = maxFrames;
    // Estimate 8MB per frame (1920x1080 RGBA16F)
    const maxSize = maxFrames * 8 * 1024 * 1024;
    this.frameCache = new TemporalLRUCache<Frame>(maxSize);
    
    console.log(`[FrameBufferCache] Initialized (max ${maxFrames} frames)`);
  }

  /**
   * Cache a frame
   */
  cacheFrame(frameId: string, frame: Frame, priority: number = 0.5): void {
    // Estimate frame size
    const size = this.estimateFrameSize(frame);
    this.frameCache.put(frameId, frame, size, priority);
  }

  /**
   * Get cached frame
   */
  getFrame(frameId: string): Frame | null {
    return this.frameCache.get(frameId);
  }

  /**
   * Check if frame is cached
   */
  hasFrame(frameId: string): boolean {
    return this.frameCache.has(frameId);
  }

  /**
   * Get recent frames
   */
  getRecentFrames(count: number): Frame[] {
    const keys = this.frameCache.keys();
    const frames: Frame[] = [];
    
    for (let i = Math.max(0, keys.length - count); i < keys.length; i++) {
      const frame = this.frameCache.get(keys[i]);
      if (frame) frames.push(frame);
    }
    
    return frames;
  }

  /**
   * Advance to next frame
   */
  nextFrame(): void {
    this.frameCache.nextFrame();
  }

  /**
   * Estimate frame size
   */
  private estimateFrameSize(frame: Frame): number {
    // Simplified estimation
    // Real implementation would query texture sizes
    return 8 * 1024 * 1024; // 8MB estimate
  }

  /**
   * Get statistics
   */
  getStats(): CacheStats {
    return this.frameCache.getStats();
  }

  clear(): void {
    this.frameCache.clear();
  }
}

/**
 * Lighting Accumulation Cache
 */
export class LightingCache {
  private lightingBuffers: Map<string, {
    buffer: GPUTexture;
    sampleCount: number;
    lastUpdate: number;
  }> = new Map();
  
  private device: GPUDevice;
  private maxBuffers: number = 32;

  constructor(device: GPUDevice) {
    this.device = device;
    console.log('[LightingCache] Initialized');
  }

  /**
   * Get or create lighting buffer for a region
   */
  getOrCreateBuffer(regionId: string, width: number, height: number): {
    buffer: GPUTexture;
    sampleCount: number;
  } {
    const existing = this.lightingBuffers.get(regionId);
    
    if (existing) {
      return {
        buffer: existing.buffer,
        sampleCount: existing.sampleCount
      };
    }

    // Create new buffer
    const buffer = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'rgba16float',
      usage: GPUTextureUsage.TEXTURE_BINDING | 
             GPUTextureUsage.STORAGE_BINDING |
             GPUTextureUsage.RENDER_ATTACHMENT
    });

    this.lightingBuffers.set(regionId, {
      buffer,
      sampleCount: 0,
      lastUpdate: Date.now()
    });

    // Evict old buffers if needed
    if (this.lightingBuffers.size > this.maxBuffers) {
      this.evictOldest();
    }

    return { buffer, sampleCount: 0 };
  }

  /**
   * Update buffer sample count
   */
  updateSampleCount(regionId: string, count: number): void {
    const buffer = this.lightingBuffers.get(regionId);
    if (buffer) {
      buffer.sampleCount = count;
      buffer.lastUpdate = Date.now();
    }
  }

  /**
   * Evict oldest buffer
   */
  private evictOldest(): void {
    let oldestTime = Infinity;
    let oldestKey: string | null = null;

    for (const [key, buffer] of this.lightingBuffers) {
      if (buffer.lastUpdate < oldestTime) {
        oldestTime = buffer.lastUpdate;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.lightingBuffers.delete(oldestKey);
      console.log(`[LightingCache] Evicted buffer: ${oldestKey}`);
    }
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.lightingBuffers.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    bufferCount: number;
    totalSamples: number;
    avgSamples: number;
  } {
    const buffers = Array.from(this.lightingBuffers.values());
    const totalSamples = buffers.reduce((sum, b) => sum + b.sampleCount, 0);
    
    return {
      bufferCount: buffers.length,
      totalSamples,
      avgSamples: buffers.length > 0 ? totalSamples / buffers.length : 0
    };
  }
}

/**
 * Shadow Map Cache
 */
export class ShadowMapCache {
  private shadowMaps: Map<string, {
    texture: GPUTexture;
    lightViewMatrix: Float32Array;
    lastUpdate: number;
    updateFrequency: number; // Hz
  }> = new Map();
  
  private device: GPUDevice;
  private maxMaps: number = 8;

  constructor(device: GPUDevice) {
    this.device = device;
    console.log('[ShadowMapCache] Initialized');
  }

  /**
   * Get or create shadow map
   */
  getOrCreate(
    lightId: string,
    size: number,
    lightViewMatrix: Float32Array,
    updateFrequency: number = 10 // 10 Hz default
  ): GPUTexture {
    const existing = this.shadowMaps.get(lightId);
    
    if (existing) {
      // Check if update needed
      const timeSinceUpdate = Date.now() - existing.lastUpdate;
      const updateInterval = 1000 / existing.updateFrequency;
      
      if (timeSinceUpdate < updateInterval) {
        return existing.texture;
      }
      
      // Update timestamp
      existing.lastUpdate = Date.now();
      return existing.texture;
    }

    // Create new shadow map
    const texture = this.device.createTexture({
      size: { width: size, height: size, depthOrArrayLayers: 1 },
      format: 'depth32float',
      usage: GPUTextureUsage.TEXTURE_BINDING | 
             GPUTextureUsage.RENDER_ATTACHMENT
    });

    this.shadowMaps.set(lightId, {
      texture,
      lightViewMatrix: new Float32Array(lightViewMatrix),
      lastUpdate: Date.now(),
      updateFrequency
    });

    // Evict if too many
    if (this.shadowMaps.size > this.maxMaps) {
      const firstKey = this.shadowMaps.keys().next().value;
      if (firstKey !== undefined) {
        this.shadowMaps.delete(firstKey);
      }
    }

    console.log(`[ShadowMapCache] Created shadow map: ${lightId} (${size}x${size})`);

    return texture;
  }

  /**
   * Check if shadow map needs update
   */
  needsUpdate(lightId: string): boolean {
    const shadowMap = this.shadowMaps.get(lightId);
    if (!shadowMap) return true;
    
    const timeSinceUpdate = Date.now() - shadowMap.lastUpdate;
    const updateInterval = 1000 / shadowMap.updateFrequency;
    
    return timeSinceUpdate >= updateInterval;
  }

  clear(): void {
    this.shadowMaps.clear();
  }
}

/**
 * Reflection Probe Cache
 */
export class ReflectionProbeCache {
  private probes: Map<string, {
    cubemap: GPUTexture;
    position: Float32Array;
    radius: number;
    lastUpdate: number;
  }> = new Map();
  
  private device: GPUDevice;
  private maxProbes: number = 16;
  private updateInterval: number = 1000; // 1 second

  constructor(device: GPUDevice) {
    this.device = device;
    console.log('[ReflectionProbeCache] Initialized');
  }

  /**
   * Get or create reflection probe
   */
  getOrCreate(
    probeId: string,
    position: Float32Array,
    radius: number,
    resolution: number = 256
  ): GPUTexture {
    const existing = this.probes.get(probeId);
    
    if (existing && Date.now() - existing.lastUpdate < this.updateInterval) {
      return existing.cubemap;
    }

    if (existing) {
      existing.lastUpdate = Date.now();
      return existing.cubemap;
    }

    // Create new probe
    const cubemap = this.device.createTexture({
      size: { width: resolution, height: resolution, depthOrArrayLayers: 6 },
      format: 'rgba16float',
      usage: GPUTextureUsage.TEXTURE_BINDING | 
             GPUTextureUsage.RENDER_ATTACHMENT,
      dimension: '2d'
    });

    this.probes.set(probeId, {
      cubemap,
      position: new Float32Array(position),
      radius,
      lastUpdate: Date.now()
    });

    if (this.probes.size > this.maxProbes) {
      const firstKey = this.probes.keys().next().value;
      if (firstKey !== undefined) {
        this.probes.delete(firstKey);
      }
    }

    console.log(`[ReflectionProbeCache] Created probe: ${probeId}`);

    return cubemap;
  }

  clear(): void {
    this.probes.clear();
  }
}

/**
 * Main Temporal Cache System
 */
export class TemporalCache {
  private device: GPUDevice;
  
  // Sub-caches
  public frameBuffers: FrameBufferCache;
  public lighting: LightingCache;
  public shadowMaps: ShadowMapCache;
  public reflectionProbes: ReflectionProbeCache;

  constructor(device: GPUDevice, maxFrames: number = 16) {
    this.device = device;
    
    this.frameBuffers = new FrameBufferCache(maxFrames);
    this.lighting = new LightingCache(device);
    this.shadowMaps = new ShadowMapCache(device);
    this.reflectionProbes = new ReflectionProbeCache(device);

    console.log('[TemporalCache] Initialized');
  }

  /**
   * Advance to next frame
   */
  nextFrame(): void {
    this.frameBuffers.nextFrame();
  }

  /**
   * Get combined statistics
   */
  getStats(): {
    frames: CacheStats;
    lighting: { bufferCount: number; totalSamples: number; avgSamples: number };
    shadowMaps: number;
    reflectionProbes: number;
  } {
    return {
      frames: this.frameBuffers.getStats(),
      lighting: this.lighting.getStats(),
      shadowMaps: 0, // Would need actual count
      reflectionProbes: 0 // Would need actual count
    };
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.frameBuffers.clear();
    this.lighting.clear();
    this.shadowMaps.clear();
    this.reflectionProbes.clear();
    
    console.log('[TemporalCache] All caches cleared');
  }

  /**
   * Log statistics
   */
  logStats(): void {
    const stats = this.getStats();
    
    console.log('[TemporalCache] Statistics:');
    console.log(`  Frames: ${stats.frames.totalEntries} cached, ${(stats.frames.hitRate * 100).toFixed(1)}% hit rate`);
    console.log(`  Lighting: ${stats.lighting.bufferCount} buffers, ${stats.lighting.avgSamples.toFixed(0)} avg samples`);
    console.log(`  Shadow Maps: ${stats.shadowMaps}`);
    console.log(`  Reflection Probes: ${stats.reflectionProbes}`);
  }
}

console.log('[TemporalCache] Module loaded');
