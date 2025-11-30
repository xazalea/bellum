/**
 * Adaptive Performance - Automatically adjusts quality based on performance metrics
 */

import { performanceMonitor, PerformanceMetrics } from './monitor';

export interface AdaptiveConfig {
  textureScale: number; // 0.5 to 1.0
  renderResolution: number; // 0.5 to 1.0
  frameSkip: number; // 0 = no skip, 1 = skip every other frame
  audioQuality: 'low' | 'medium' | 'high';
}

export class AdaptivePerformance {
  private config: AdaptiveConfig = {
    textureScale: 1.0,
    renderResolution: 1.0,
    frameSkip: 0,
    audioQuality: 'high',
  };

  private targetFPS = 60;
  private lowFPSThreshold = 45;
  private highFPSThreshold = 55;
  private metricsHistory: PerformanceMetrics[] = [];
  private adjustmentInterval = 5000; // Adjust every 5 seconds
  private lastAdjustment = 0;
  private callbacks: ((config: AdaptiveConfig) => void)[] = [];

  constructor() {
    if (performanceMonitor) {
      performanceMonitor.on('metrics', (metrics: PerformanceMetrics) => {
        this.metricsHistory.push(metrics);
        if (this.metricsHistory.length > 60) {
          this.metricsHistory.shift();
        }

        const now = performance.now();
        if (now - this.lastAdjustment >= this.adjustmentInterval) {
          this.adjustPerformance();
          this.lastAdjustment = now;
        }
      });
    }
  }

  /**
   * Adjust performance settings based on current metrics
   */
  private adjustPerformance(): void {
    if (this.metricsHistory.length < 10) return;

    const avgFPS = this.metricsHistory
      .slice(-10)
      .reduce((sum, m) => sum + m.fps, 0) / 10;

    const avgFrameTime = this.metricsHistory
      .slice(-10)
      .reduce((sum, m) => sum + m.frameTime, 0) / 10;

    const wasLowFPS = avgFPS < this.lowFPSThreshold;
    const isHighFPS = avgFPS >= this.highFPSThreshold;

    // If FPS is low, reduce quality
    if (wasLowFPS && !isHighFPS) {
      this.reduceQuality();
    }
    // If FPS is high and we're below max quality, increase quality
    else if (isHighFPS && this.canIncreaseQuality()) {
      this.increaseQuality();
    }

    this.notifyCallbacks();
  }

  /**
   * Reduce quality to improve performance
   */
  private reduceQuality(): void {
    // Reduce texture scale
    if (this.config.textureScale > 0.5) {
      this.config.textureScale = Math.max(0.5, this.config.textureScale - 0.1);
    }

    // Reduce render resolution
    if (this.config.renderResolution > 0.5) {
      this.config.renderResolution = Math.max(0.5, this.config.renderResolution - 0.1);
    }

    // Enable frame skipping if FPS is very low
    if (this.config.frameSkip === 0 && this.metricsHistory.length > 0) {
      const lastFPS = this.metricsHistory[this.metricsHistory.length - 1].fps;
      if (lastFPS < 30) {
        this.config.frameSkip = 1;
      }
    }

    // Reduce audio quality
    if (this.config.audioQuality === 'high') {
      this.config.audioQuality = 'medium';
    } else if (this.config.audioQuality === 'medium') {
      this.config.audioQuality = 'low';
    }

    console.log('Reduced quality for performance:', this.config);
  }

  /**
   * Increase quality when performance allows
   */
  private increaseQuality(): void {
    // Increase texture scale
    if (this.config.textureScale < 1.0) {
      this.config.textureScale = Math.min(1.0, this.config.textureScale + 0.1);
    }

    // Increase render resolution
    if (this.config.renderResolution < 1.0) {
      this.config.renderResolution = Math.min(1.0, this.config.renderResolution + 0.1);
    }

    // Disable frame skipping
    if (this.config.frameSkip > 0) {
      this.config.frameSkip = 0;
    }

    // Increase audio quality
    if (this.config.audioQuality === 'low') {
      this.config.audioQuality = 'medium';
    } else if (this.config.audioQuality === 'medium') {
      this.config.audioQuality = 'high';
    }

    console.log('Increased quality:', this.config);
  }

  /**
   * Check if quality can be increased
   */
  private canIncreaseQuality(): boolean {
    return (
      this.config.textureScale < 1.0 ||
      this.config.renderResolution < 1.0 ||
      this.config.frameSkip > 0 ||
      this.config.audioQuality !== 'high'
    );
  }

  /**
   * Get current adaptive config
   */
  getConfig(): AdaptiveConfig {
    return { ...this.config };
  }

  /**
   * Manually set config (overrides adaptive adjustments)
   */
  setConfig(config: Partial<AdaptiveConfig>): void {
    this.config = { ...this.config, ...config };
    this.notifyCallbacks();
  }

  /**
   * Reset to default high quality
   */
  reset(): void {
    this.config = {
      textureScale: 1.0,
      renderResolution: 1.0,
      frameSkip: 0,
      audioQuality: 'high',
    };
    this.notifyCallbacks();
  }

  /**
   * Subscribe to config changes
   */
  onConfigChange(callback: (config: AdaptiveConfig) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Unsubscribe from config changes
   */
  offConfigChange(callback: (config: AdaptiveConfig) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach((cb) => {
      try {
        cb(this.config);
      } catch (e) {
        console.error('Error in adaptive config callback:', e);
      }
    });
  }
}

// Singleton instance
export const adaptivePerformance = typeof window !== 'undefined'
  ? new AdaptivePerformance()
  : null;

