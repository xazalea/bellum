/**
 * Performance Optimization Engine
 * Provides device capability detection, adaptive quality settings,
 * and performance monitoring for low-end device support
 */

'use client';

// ============================================
// DEVICE CAPABILITY DETECTION
// ============================================

export interface DeviceCapabilities {
  // Hardware
  cores: number;
  memoryGB: number;
  isLowEnd: boolean;
  
  // GPU
  gpuTier: 'low' | 'medium' | 'high';
  supportsWebGL2: boolean;
  supportsSharedArrayBuffer: boolean;
  
  // Network
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlinkMbps: number;
  
  // Storage
  hasIndexedDB: boolean;
  storageQuotaGB: number;
  
  // Features
  supportsIntersectionObserver: boolean;
  supportsMutationObserver: boolean;
  supportsWebWorkers: boolean;
  supportsOffscreenCanvas: boolean;
}

export interface QualityLevel {
  level: 'minimal' | 'low' | 'medium' | 'high' | 'ultra';
  animations: boolean;
  shadows: boolean;
  blur: boolean;
  transitions: boolean;
  particleCount: number;
  lazyLoadThreshold: number;
  imageQuality: number;
  frameRate: number;
}

const QUALITY_PRESETS: Record<string, QualityLevel> = {
  minimal: {
    level: 'minimal',
    animations: false,
    shadows: false,
    blur: false,
    transitions: false,
    particleCount: 0,
    lazyLoadThreshold: 0,
    imageQuality: 0.5,
    frameRate: 30,
  },
  low: {
    level: 'low',
    animations: true,
    shadows: false,
    blur: false,
    transitions: false,
    particleCount: 10,
    lazyLoadThreshold: 200,
    imageQuality: 0.6,
    frameRate: 30,
  },
  medium: {
    level: 'medium',
    animations: true,
    shadows: true,
    blur: false,
    transitions: true,
    particleCount: 30,
    lazyLoadThreshold: 400,
    imageQuality: 0.75,
    frameRate: 60,
  },
  high: {
    level: 'high',
    animations: true,
    shadows: true,
    blur: true,
    transitions: true,
    particleCount: 50,
    lazyLoadThreshold: 600,
    imageQuality: 0.9,
    frameRate: 60,
  },
  ultra: {
    level: 'ultra',
    animations: true,
    shadows: true,
    blur: true,
    transitions: true,
    particleCount: 100,
    lazyLoadThreshold: 800,
    imageQuality: 1,
    frameRate: 144,
  },
};

class DeviceCapabilityDetector {
  private cache: DeviceCapabilities | null = null;
  private cachedAt: number = 0;
  private cacheTTL = 60000; // 1 minute cache

  async detect(): Promise<DeviceCapabilities> {
    const now = Date.now();
    if (this.cache && (now - this.cachedAt) < this.cacheTTL) {
      return this.cache;
    }

    const caps: DeviceCapabilities = {
      cores: this.getCores(),
      memoryGB: await this.getMemoryGB(),
      isLowEnd: false,
      gpuTier: 'medium',
      supportsWebGL2: false,
      supportsSharedArrayBuffer: false,
      effectiveType: '4g',
      downlinkMbps: 10,
      hasIndexedDB: false,
      storageQuotaGB: 0,
      supportsIntersectionObserver: false,
      supportsMutationObserver: false,
      supportsWebWorkers: false,
      supportsOffscreenCanvas: false,
    };

    // Determine if low-end
    caps.isLowEnd = this.isLowEndDevice(caps);

    // GPU detection
    this.detectGPU(caps);

    // Network
    this.detectNetwork(caps);

    // Storage
    await this.detectStorage(caps);

    // Feature detection
    caps.supportsIntersectionObserver = typeof IntersectionObserver !== 'undefined';
    caps.supportsMutationObserver = typeof MutationObserver !== 'undefined';
    caps.supportsWebWorkers = typeof Worker !== 'undefined';
    caps.supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

    this.cache = caps;
    this.cachedAt = now;
    return caps;
  }

  private getCores(): number {
    return navigator.hardwareConcurrency || 2;
  }

  private async getMemoryGB(): Promise<number> {
    // @ts-ignore - deviceMemory is not in all TypeScript definitions
    const memory = navigator.deviceMemory;
    if (memory) {
      return memory;
    }
    // Fallback: estimate based on available memory (Chrome only)
    if (typeof window !== 'undefined' && 'memory' in performance) {
      try {
        // @ts-ignore - memory is experimental
        const memInfo = performance.memory as { jsHeapSizeLimit?: number } | undefined;
        if (memInfo?.jsHeapSizeLimit) {
          return Math.round(memInfo.jsHeapSizeLimit / (1024 * 1024 * 1024) * 10) / 10;
        }
      } catch { /* ignore */ }
    }
    return 4; // Conservative default
  }

  private isLowEndDevice(caps: DeviceCapabilities): boolean {
    // Low-end criteria
    if (caps.cores <= 2) return true;
    if (caps.memoryGB <= 2) return true;
    if (caps.effectiveType === '2g' || caps.effectiveType === 'slow-2g') return true;
    if (caps.gpuTier === 'low') return true;
    return false;
  }

  private detectGPU(caps: DeviceCapabilities): void {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      caps.supportsWebGL2 = !!gl;
      
      // Check SharedArrayBuffer support (requires COOP/COEP headers)
      caps.supportsSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          
          // GPU tier estimation based on renderer string
          const lowTierKeywords = ['Intel HD', 'Intel UHD', 'Mali-4', 'Adreno 3', 'PowerVR'];
          const highTierKeywords = ['RTX', 'RX 5', 'RX 6', 'RX 7', 'Mali-G7', 'Adreno 6', 'Apple M'];
          
          if (lowTierKeywords.some(k => renderer.includes(k))) {
            caps.gpuTier = 'low';
          } else if (highTierKeywords.some(k => renderer.includes(k))) {
            caps.gpuTier = 'high';
          } else {
            caps.gpuTier = 'medium';
          }
        }
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      // WebGL detection failed
    }
  }

  private detectNetwork(caps: DeviceCapabilities): void {
    const connection = (navigator as any).connection;
    if (connection) {
      caps.effectiveType = connection.effectiveType || '4g';
      caps.downlinkMbps = connection.downlink || 10;
    }
  }

  private async detectStorage(caps: DeviceCapabilities): Promise<void> {
    try {
      if ('indexedDB' in window) {
        caps.hasIndexedDB = true;
      }
      
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        caps.storageQuotaGB = Math.round((estimate.quota || 0) / (1024 * 1024 * 1024) * 10) / 10;
      }
    } catch {
      // Storage detection failed
    }
  }

  getRecommendedQuality(caps: DeviceCapabilities): QualityLevel {
    if (caps.isLowEnd || caps.gpuTier === 'low') {
      return QUALITY_PRESETS.minimal;
    }
    
    if (caps.cores <= 4 || caps.memoryGB <= 4) {
      return caps.effectiveType === '2g' || caps.effectiveType === 'slow-2g' 
        ? QUALITY_PRESETS.minimal 
        : QUALITY_PRESETS.low;
    }
    
    if (caps.cores <= 6 || caps.memoryGB <= 8) {
      return QUALITY_PRESETS.medium;
    }
    
    return caps.gpuTier === 'high' ? QUALITY_PRESETS.ultra : QUALITY_PRESETS.high;
  }
}

// ============================================
// ADAPTIVE LAZY LOADING ENGINE
// ============================================

export interface LazyLoadOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number;
  priority?: 'high' | 'low';
  onLoad?: () => void;
  placeholder?: string;
}

class AdaptiveLazyLoadEngine {
  private observer: IntersectionObserver | null = null;
  private loadedElements = new Set<Element>();
  private qualityThreshold: number = 400;
  private enabled = true;
  private useNativeLazy = true;
  private initialized = false;

  private detectCapabilities(): void {
    if (this.initialized) return;
    this.initialized = true;
    
    // Only run in browser
    if (typeof window === 'undefined') {
      this.enabled = false;
      return;
    }

    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      this.enabled = false;
      return;
    }

    // Use native lazy loading if available (most browsers now support it)
    try {
      const img = document.createElement('img');
      this.useNativeLazy = 'loading' in img;
    } catch {
      this.useNativeLazy = false;
    }
  }

  configure(threshold: number): void {
    this.qualityThreshold = threshold;
    this.detectCapabilities();
    this.recreateObserver();
  }

  enable(): void {
    this.detectCapabilities();
    this.enabled = true;
    this.recreateObserver();
  }

  disable(): void {
    this.enabled = false;
    this.destroy();
  }

  private recreateObserver(): void {
    this.destroy();
    
    if (!this.enabled) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
            this.loadElement(entry.target);
          }
        });
      },
      {
        rootMargin: `${this.qualityThreshold}px`,
        threshold: 0.1,
      }
    );
  }

  private loadElement(el: Element): void {
    this.loadedElements.add(el);
    
    // Handle images
    if (el instanceof HTMLImageElement) {
      if (el.dataset.src) {
        el.src = el.dataset.src;
        delete el.dataset.src;
      }
    }
    
    // Handle background images
    const bg = el.getAttribute('data-bg');
    if (bg) {
      (el as HTMLElement).style.backgroundImage = bg;
      el.removeAttribute('data-bg');
    }
    
    // Handle iframes
    if (el instanceof HTMLIFrameElement) {
      if (el.dataset.src) {
        el.src = el.dataset.src;
        delete el.dataset.src;
      }
    }

    // Add loaded class for CSS transitions
    el.classList.add('lazy-loaded');
    
    // Unobserve after loading
    this.observer?.unobserve(el);
  }

  observe(element: Element): void {
    this.detectCapabilities();
    if (!this.enabled || !this.observer) return;
    
    // Skip if already loaded
    if (this.loadedElements.has(element)) return;
    
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    this.observer?.unobserve(element);
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

// ============================================
// PERFORMANCE MONITOR
// ============================================

export interface PerformanceMetrics {
  fps: number;
  memoryMB: number;
  frameTime: number;
  droppedFrames: number;
  totalFrames: number;
  lastUpdate: number;
}

export type PerformanceCallback = (metrics: PerformanceMetrics) => void;

class PerformanceMonitor {
  private frames: number[] = [];
  private lastFrame = 0;
  private frameCount = 0;
  private droppedFrames = 0;
  private subscribers: Set<PerformanceCallback> = new Set();
  private rafId: number | null = null;
  private isRunning = false;
  private targetFPS = 60;
  private minFPS = 15;

  start(targetFPS = 60): void {
    this.targetFPS = targetFPS;
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrame = performance.now();
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    // Reset state for next start
    this.frames = [];
    this.droppedFrames = 0;
  }

  setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(this.minFPS, Math.min(144, fps));
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = now - this.lastFrame;
    
    this.frames.push(delta);
    if (this.frames.length > 60) {
      this.frames.shift();
    }

    this.frameCount++;

    // Calculate if frame was dropped (expected frame time exceeded)
    const expectedFrameTime = 1000 / this.targetFPS;
    if (delta > expectedFrameTime * 1.5) {
      this.droppedFrames++;
    }

    this.lastFrame = now;
    this.rafId = requestAnimationFrame(this.tick);
  };

  getMetrics(): PerformanceMetrics {
    const avgFrameTime = this.frames.length > 0
      ? this.frames.reduce((a, b) => a + b, 0) / this.frames.length
      : 16.67;

    const fps = Math.round(1000 / avgFrameTime);
    
    // Memory usage (if available, Chrome only)
    let memoryMB = 0;
    try {
      if (typeof window !== 'undefined') {
        // @ts-ignore - memory is experimental
        const memInfo = performance.memory as { usedJSHeapSize?: number } | undefined;
        if (memInfo?.usedJSHeapSize) {
          memoryMB = Math.round(memInfo.usedJSHeapSize / (1024 * 1024));
        }
      }
    } catch { /* ignore */ }

    return {
      fps,
      memoryMB,
      frameTime: Math.round(avgFrameTime * 100) / 100,
      droppedFrames: this.droppedFrames,
      totalFrames: this.frameCount,
      lastUpdate: Date.now(),
    };
  }

  subscribe(callback: PerformanceCallback): () => void {
    this.subscribers.add(callback);
    
    // Start monitoring if first subscriber
    if (this.subscribers.size === 1) {
      this.start();
    }

    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0) {
        this.stop();
      }
    };
  }

  getFPS(): number {
    return this.getMetrics().fps;
  }

  isPerformanceGood(): boolean {
    const metrics = this.getMetrics();
    return metrics.fps >= this.targetFPS * 0.8;
  }
}

// ============================================
// QUALITY ADAPTOR
// ============================================

export interface QualityAdaptorOptions {
  monitor: {
    subscribe: (callback: PerformanceCallback) => () => void;
    getFPS: () => number;
  };
  onQualityChange?: (level: QualityLevel) => void;
  autoAdjust?: boolean;
  downgradeThreshold?: number;
  upgradeThreshold?: number;
}

class QualityAdaptor {
  private currentQuality: QualityLevel;
  private monitor: {
    subscribe: (callback: PerformanceCallback) => () => void;
    getFPS: () => number;
  };
  private options: {
    monitor: {
      subscribe: (callback: PerformanceCallback) => () => void;
      getFPS: () => number;
    };
    onQualityChange?: (level: QualityLevel) => void;
    autoAdjust: boolean;
    downgradeThreshold: number;
    upgradeThreshold: number;
  };
  private changeCallbacks: Set<(level: QualityLevel) => void> = new Set();

  constructor(
    initialQuality: QualityLevel,
    options: QualityAdaptorOptions
  ) {
    this.currentQuality = initialQuality;
    this.monitor = options.monitor;
    this.options = {
      autoAdjust: true,
      downgradeThreshold: 0.7,
      upgradeThreshold: 0.95,
      ...options,
    };

    if (this.options.autoAdjust) {
      this.startAutoAdjustment();
    }
  }

  private startAutoAdjustment(): void {
    this.monitor.subscribe((metrics) => {
      // Use the monitor's getFPS method to get current FPS
      const fps = this.monitor.getFPS();
      const fpsRatio = fps / 60;
      
      // Downgrade if FPS is consistently low
      if (fpsRatio < this.options.downgradeThreshold) {
        this.downgrade();
      }
      // Upgrade if FPS is consistently high
      else if (fpsRatio > this.options.upgradeThreshold) {
        this.upgrade();
      }
    });
  }

  downgrade(): void {
    const levels = ['minimal', 'low', 'medium', 'high', 'ultra'];
    const currentIndex = levels.indexOf(this.currentQuality.level);
    
    if (currentIndex > 0) {
      const newLevel = levels[currentIndex - 1] as keyof typeof QUALITY_PRESETS;
      this.setQuality(QUALITY_PRESETS[newLevel]);
    }
  }

  upgrade(): void {
    const levels = ['minimal', 'low', 'medium', 'high', 'ultra'];
    const currentIndex = levels.indexOf(this.currentQuality.level);
    
    if (currentIndex < levels.length - 1) {
      const newLevel = levels[currentIndex + 1] as keyof typeof QUALITY_PRESETS;
      this.setQuality(QUALITY_PRESETS[newLevel]);
    }
  }

  setQuality(quality: QualityLevel): void {
    if (quality.level === this.currentQuality.level) return;
    
    this.currentQuality = quality;
    
    // Apply quality settings to CSS
    this.applyToDOM(quality);
    
    // Notify callbacks
    this.changeCallbacks.forEach(cb => cb(quality));
    this.options.onQualityChange?.(quality);
  }

  private applyToDOM(quality: QualityLevel): void {
    const root = document.documentElement;
    
    root.style.setProperty('--animation-enabled', quality.animations ? '1' : '0');
    root.style.setProperty('--shadows-enabled', quality.shadows ? '1' : '0');
    root.style.setProperty('--blur-enabled', quality.blur ? '1' : '0');
    root.style.setProperty('--particle-max', quality.particleCount.toString());
    root.style.setProperty('--image-quality', quality.imageQuality.toString());
  }

  getQuality(): QualityLevel {
    return { ...this.currentQuality };
  }

  onChange(callback: (level: QualityLevel) => void): () => void {
    this.changeCallbacks.add(callback);
    return () => this.changeCallbacks.delete(callback);
  }
}

// ============================================
// LAZY SINGLETON INSTANCES (SSR-safe)
// ============================================

let _deviceDetector: DeviceCapabilityDetector | null = null;
let _lazyLoadEngine: AdaptiveLazyLoadEngine | null = null;
let _perfMonitor: PerformanceMonitor | null = null;

export const deviceDetector = {
  detect: () => {
    if (typeof window === 'undefined') {
      // Return default capabilities during SSR
      return Promise.resolve({
        cores: 4,
        memoryGB: 4,
        isLowEnd: false,
        gpuTier: 'medium' as const,
        supportsWebGL2: false,
        supportsSharedArrayBuffer: false,
        effectiveType: '4g' as const,
        downlinkMbps: 10,
        hasIndexedDB: false,
        storageQuotaGB: 0,
        supportsIntersectionObserver: false,
        supportsMutationObserver: false,
        supportsWebWorkers: false,
        supportsOffscreenCanvas: false,
      });
    }
    if (!_deviceDetector) _deviceDetector = new DeviceCapabilityDetector();
    return _deviceDetector.detect();
  },
  getRecommendedQuality: (caps: DeviceCapabilities) => {
    if (!_deviceDetector) _deviceDetector = new DeviceCapabilityDetector();
    return _deviceDetector.getRecommendedQuality(caps);
  }
};

export const lazyLoadEngine = {
  configure: (threshold: number) => {
    if (typeof window === 'undefined') return;
    if (!_lazyLoadEngine) _lazyLoadEngine = new AdaptiveLazyLoadEngine();
    _lazyLoadEngine.configure(threshold);
  },
  enable: () => {
    if (typeof window === 'undefined') return;
    if (!_lazyLoadEngine) _lazyLoadEngine = new AdaptiveLazyLoadEngine();
    _lazyLoadEngine.enable();
  },
  disable: () => {
    _lazyLoadEngine?.disable();
  },
  observe: (element: Element) => {
    if (typeof window === 'undefined') return;
    if (!_lazyLoadEngine) _lazyLoadEngine = new AdaptiveLazyLoadEngine();
    _lazyLoadEngine.observe(element);
  },
  unobserve: (element: Element) => {
    _lazyLoadEngine?.unobserve(element);
  },
  destroy: () => {
    _lazyLoadEngine?.destroy();
  }
};

export const perfMonitor = {
  start: (targetFPS?: number) => {
    if (typeof window === 'undefined') return;
    if (!_perfMonitor) _perfMonitor = new PerformanceMonitor();
    _perfMonitor.start(targetFPS);
  },
  stop: () => {
    _perfMonitor?.stop();
  },
  setTargetFPS: (fps: number) => {
    _perfMonitor?.setTargetFPS(fps);
  },
  getMetrics: () => _perfMonitor?.getMetrics() ?? {
    fps: 60,
    memoryMB: 0,
    frameTime: 16.67,
    droppedFrames: 0,
    totalFrames: 0,
    lastUpdate: Date.now()
  },
  subscribe: (callback: PerformanceCallback) => {
    if (typeof window === 'undefined') return () => {};
    if (!_perfMonitor) _perfMonitor = new PerformanceMonitor();
    return _perfMonitor.subscribe(callback);
  },
  getFPS: () => _perfMonitor?.getFPS() ?? 60,
  isPerformanceGood: () => _perfMonitor?.isPerformanceGood() ?? true
};

export function createQualityAdaptor(
  initialQuality: QualityLevel,
  options: QualityAdaptorOptions
): QualityAdaptor {
  return new QualityAdaptor(initialQuality, options);
}

export { QUALITY_PRESETS };