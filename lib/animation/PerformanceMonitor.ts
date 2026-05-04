'use client';

import { type AnimationQuality, QUALITY_CONFIG } from './tokens';

interface PerfSample {
  fps: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private samples: PerfSample[] = [];
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private running = false;
  private refCount = 0;
  private quality: AnimationQuality = 'full';
  private reducedMotion = false;
  private callbacks: Set<(quality: AnimationQuality) => void> = new Set();
  private fpsCallbacks: Set<(fps: number) => void> = new Set();
  private history: number[] = [];
  private maxHistory = 20;

  // Thresholds
  private readonly DEGRADE_THRESHOLD = 30;
  private readonly RECOVER_THRESHOLD = 45;
  private readonly DEGRADE_MS = 2000; // 2 seconds below threshold
  private readonly RECOVER_MS = 3000; // 3 seconds above threshold
  private readonly MINIMAL_THRESHOLD = 20;
  private readonly MINIMAL_MS = 1000;

  private lowStartTime: number | null = null;
  private highStartTime: number | null = null;
  private criticalStartTime: number | null = null;
  private lastHistoryPush = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
        if (this.reducedMotion) {
          this.setQuality('minimal');
        } else {
          // Recalculate from current samples when reduced motion is disabled
          const now = performance.now();
          const avgFps = this.samples.length > 0
            ? this.samples.reduce((sum, s) => sum + s.fps, 0) / this.samples.length
            : 60;
          this.evaluateQuality(avgFps, now);
        }
      });
    }
  }

  start(): void {
    if (typeof window === 'undefined') return;
    this.refCount++;
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.lastHistoryPush = performance.now();
    this.tick();
  }

  stop(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount > 0) return; // Other consumers still need the monitor
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (delta > 0) {
      const fps = Math.min(144, Math.round(1000 / delta));
      this.samples.push({ fps, timestamp: now });

      // Keep only last 1 second of samples
      const cutoff = now - 1000;
      while (this.samples.length > 0 && this.samples[0].timestamp < cutoff) {
        this.samples.shift();
      }

      // Calculate average FPS over last second
      const avgFps = this.samples.length > 0
        ? this.samples.reduce((sum, s) => sum + s.fps, 0) / this.samples.length
        : 60;

      // Update history (every ~250ms)
      if (this.history.length === 0 || now - this.lastHistoryPush > 250) {
        this.history.push(Math.round(avgFps));
        this.lastHistoryPush = now;
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }
      }

      // Notify FPS subscribers
      this.fpsCallbacks.forEach(cb => cb(avgFps));

      // Quality degradation logic
      this.evaluateQuality(avgFps, now);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private evaluateQuality(avgFps: number, now: number): void {
    if (this.reducedMotion) {
      this.setQuality('minimal');
      return;
    }

    // Critical: < 20 FPS
    if (avgFps < this.MINIMAL_THRESHOLD) {
      if (this.criticalStartTime === null) {
        this.criticalStartTime = now;
      }
      if (now - this.criticalStartTime >= this.MINIMAL_MS) {
        this.setQuality('minimal');
      }
      this.lowStartTime = null;
      this.highStartTime = null;
      return;
    }
    this.criticalStartTime = null;

    // Degraded: < 30 FPS
    if (avgFps < this.DEGRADE_THRESHOLD) {
      if (this.lowStartTime === null) {
        this.lowStartTime = now;
      }
      if (now - this.lowStartTime >= this.DEGRADE_MS) {
        this.setQuality('reduced');
      }
      this.highStartTime = null;
      return;
    }
    this.lowStartTime = null;

    // Recovery: > 45 FPS
    if (avgFps >= this.RECOVER_THRESHOLD) {
      if (this.highStartTime === null) {
        this.highStartTime = now;
      }
      if (now - this.highStartTime >= this.RECOVER_MS) {
        this.setQuality('full');
      }
      return;
    }
    this.highStartTime = null;
  }

  private setQuality(newQuality: AnimationQuality): void {
    if (this.quality === newQuality) return;
    this.quality = newQuality;
    this.callbacks.forEach(cb => cb(newQuality));
  }

  getQuality(): AnimationQuality {
    if (this.reducedMotion) return 'minimal';
    return this.quality;
  }

  getHistory(): number[] {
    return [...this.history];
  }

  onQualityChange(callback: (quality: AnimationQuality) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  onFpsUpdate(callback: (fps: number) => void): () => void {
    this.fpsCallbacks.add(callback);
    return () => this.fpsCallbacks.delete(callback);
  }

  isReducedMotion(): boolean {
    return this.reducedMotion;
  }

  destroy(): void {
    this.refCount = 0;
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.callbacks.clear();
    this.fpsCallbacks.clear();
  }
}

// Singleton instance for app-wide monitoring
let globalMonitor: PerformanceMonitor | null = null;

export function getGlobalPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

export function destroyGlobalPerformanceMonitor(): void {
  globalMonitor?.destroy();
  globalMonitor = null;
}
