/**
 * Performance Monitor - Tracks FPS, WebVitals, and emulator performance
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  mainThreadBlocking: number;
  memoryUsage?: number;
  emulatorCycles?: number;
  renderTime?: number;
}

export interface WebVitals {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

export class PerformanceMonitor {
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private fpsUpdateInterval = 1000; // Update FPS every second
  private lastFpsUpdate = performance.now();
  private currentFps = 0;
  private observers: Map<string, PerformanceObserver> = new Map();
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    mainThreadBlocking: 0,
  };
  private callbacks: Map<string, ((metrics: PerformanceMetrics) => void)[]> = new Map();

  constructor() {
    this.startFPSMonitoring();
    this.startWebVitalsMonitoring();
    this.startMainThreadMonitoring();
  }

  /**
   * Start FPS monitoring using requestAnimationFrame
   */
  private startFPSMonitoring(): void {
    const measureFrame = (timestamp: number) => {
      const frameTime = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;
      this.frameTimeHistory.push(frameTime);
      
      // Keep only last 60 frames
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }

      this.frameCount++;

      const now = performance.now();
      if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
        this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
        this.frameCount = 0;
        this.lastFpsUpdate = now;

        // Update metrics
        const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        this.metrics.fps = this.currentFps;
        this.metrics.frameTime = avgFrameTime;

        this.notifyCallbacks('metrics', this.metrics);
      }

      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  /**
   * Monitor Web Vitals
   */
  private startWebVitalsMonitoring(): void {
    if (typeof window === 'undefined') return;

    // LCP - Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.renderTime = lastEntry.renderTime || lastEntry.loadTime;
        this.notifyCallbacks('webvitals', { lcp: lastEntry.renderTime || lastEntry.loadTime });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // FID - First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.mainThreadBlocking = entry.processingStart - entry.startTime;
          this.notifyCallbacks('webvitals', { fid: entry.processingStart - entry.startTime });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', fidObserver);
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // CLS - Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as any[];
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.notifyCallbacks('webvitals', { cls: clsValue });
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', clsObserver);
    } catch (e) {
      console.warn('CLS observer not supported');
    }
  }

  /**
   * Monitor main thread blocking
   */
  private startMainThreadMonitoring(): void {
    if (typeof window === 'undefined') return;

    let lastTime = performance.now();
    const checkBlocking = () => {
      const now = performance.now();
      const delta = now - lastTime;
      
      // If delta is > 50ms, we likely had blocking
      if (delta > 50) {
        this.metrics.mainThreadBlocking = delta;
        this.notifyCallbacks('blocking', { mainThreadBlocking: delta });
      }
      
      lastTime = now;
      setTimeout(checkBlocking, 50);
    };

    checkBlocking();
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Subscribe to metrics updates
   */
  on(event: 'metrics' | 'webvitals' | 'blocking', callback: (data: any) => void): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from metrics updates
   */
  off(event: 'metrics' | 'webvitals' | 'blocking', callback: (data: any) => void): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private notifyCallbacks(event: string, data: any): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error('Error in performance callback:', e);
        }
      });
    }
  }

  /**
   * Update emulator-specific metrics
   */
  updateEmulatorMetrics(cycles: number, renderTime: number): void {
    this.metrics.emulatorCycles = cycles;
    this.metrics.renderTime = renderTime;
    this.notifyCallbacks('metrics', this.metrics);
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    this.callbacks.clear();
  }
}

// Singleton instance
export const performanceMonitor = typeof window !== 'undefined' 
  ? new PerformanceMonitor() 
  : null;

