/**
 * Degradation Manager
 * 
 * Gracefully degrades quality to preserve smoothness when under load.
 * 
 * Degradation Strategy:
 * - **Quality over speed**: Always preserve smoothness
 * - **Never show loading screens**: Hide all delays
 * - **Hide corrections in motion**: Blend errors into motion
 * - **Reduce detail, not frame rate**: Lower quality, maintain Hz
 * 
 * Failure Modes:
 * - **Under load**: Reduce synthesized frame count, maintain smoothness
 * - **Network issues**: Use cached frames, degrade gracefully
 * - **Device failure**: Failover to other devices, never block
 * - **Prediction errors**: Correct invisibly, never snap
 * 
 * The system NEVER stutters, hitches, or blocks.
 * Smoothness is sacred.
 */

export interface PerformanceMetrics {
  fps: number;
  targetFps: number;
  frameDuration: number; // ms
  cpuLoad: number; // [0, 1]
  gpuLoad: number; // [0, 1]
  memoryUsage: number; // bytes
  memoryAvailable: number; // bytes
  networkLatency: number; // ms
  droppedFrames: number;
}

export interface DegradationLevel {
  level: 0 | 1 | 2 | 3 | 4; // 0 = none, 4 = maximum
  synthesisRatio: number; // Frames to synthesize per authoritative frame
  resolution: number; // [0, 1] resolution scale
  effectQuality: number; // [0, 1] effect quality
  shadowQuality: number; // [0, 1] shadow quality
  reflectionQuality: number; // [0, 1] reflection quality
  particleCount: number; // [0, 1] particle density
  lodBias: number; // Level of detail bias
}

export interface DegradationConfig {
  targetFps: number;
  minFps: number;
  aggressiveness: number; // [0, 1] how quickly to degrade
  recoveryRate: number; // How quickly to recover quality
  smoothnessThreshold: number; // Frame time variance threshold
}

/**
 * Performance Monitor
 */
class PerformanceMonitor {
  private frameTimes: number[] = [];
  private maxFrameHistory: number = 60;
  private lastFrameTime: number = 0;
  private droppedFrames: number = 0;

  /**
   * Record frame
   */
  recordFrame(timestamp: number): void {
    if (this.lastFrameTime > 0) {
      const frameTime = timestamp - this.lastFrameTime;
      this.frameTimes.push(frameTime);
      
      if (this.frameTimes.length > this.maxFrameHistory) {
        this.frameTimes.shift();
      }
      
      // Detect dropped frames (frame time > 2x expected)
      const expectedFrameTime = 1000 / 60; // Assume 60fps target
      if (frameTime > expectedFrameTime * 2) {
        this.droppedFrames++;
      }
    }
    
    this.lastFrameTime = timestamp;
  }

  /**
   * Get current FPS
   */
  getFps(): number {
    if (this.frameTimes.length < 2) return 0;
    
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return 1000 / avgFrameTime;
  }

  /**
   * Get average frame duration
   */
  getAvgFrameDuration(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  /**
   * Get frame time variance (smoothness metric)
   */
  getFrameTimeVariance(): number {
    if (this.frameTimes.length < 2) return 0;
    
    const avg = this.getAvgFrameDuration();
    const variance = this.frameTimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / this.frameTimes.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Get dropped frame count
   */
  getDroppedFrames(): number {
    return this.droppedFrames;
  }

  /**
   * Reset dropped frames counter
   */
  resetDroppedFrames(): void {
    this.droppedFrames = 0;
  }

  /**
   * Clear history
   */
  clear(): void {
    this.frameTimes = [];
    this.lastFrameTime = 0;
    this.droppedFrames = 0;
  }
}

/**
 * System Load Monitor
 */
class SystemLoadMonitor {
  private cpuSamples: number[] = [];
  private gpuSamples: number[] = [];
  private maxSamples: number = 30;

  /**
   * Estimate CPU load
   */
  estimateCpuLoad(): number {
    // In a real implementation, would use performance APIs
    // For now, estimate based on frame timing
    const sample = Math.random() * 0.3 + 0.3; // Simulated 30-60%
    
    this.cpuSamples.push(sample);
    if (this.cpuSamples.length > this.maxSamples) {
      this.cpuSamples.shift();
    }
    
    return this.cpuSamples.reduce((a, b) => a + b, 0) / this.cpuSamples.length;
  }

  /**
   * Estimate GPU load
   */
  estimateGpuLoad(): number {
    // Simulated GPU load estimation
    const sample = Math.random() * 0.3 + 0.4; // Simulated 40-70%
    
    this.gpuSamples.push(sample);
    if (this.gpuSamples.length > this.maxSamples) {
      this.gpuSamples.shift();
    }
    
    return this.gpuSamples.reduce((a, b) => a + b, 0) / this.gpuSamples.length;
  }

  /**
   * Get memory usage
   */
  getMemoryUsage(): { used: number; available: number } {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        available: memory.jsHeapSizeLimit
      };
    }
    
    // Fallback estimate
    return {
      used: 100 * 1024 * 1024, // 100MB
      available: 2 * 1024 * 1024 * 1024 // 2GB
    };
  }
}

/**
 * Degradation Manager
 */
export class DegradationManager {
  private config: DegradationConfig;
  private perfMonitor: PerformanceMonitor;
  private loadMonitor: SystemLoadMonitor;
  private currentLevel: DegradationLevel;
  private targetLevel: DegradationLevel;
  
  // Quality presets
  private qualityPresets: DegradationLevel[] = [
    {
      level: 0,
      synthesisRatio: 10, // 10 synthesized frames per authoritative
      resolution: 1.0,
      effectQuality: 1.0,
      shadowQuality: 1.0,
      reflectionQuality: 1.0,
      particleCount: 1.0,
      lodBias: 0
    },
    {
      level: 1,
      synthesisRatio: 8,
      resolution: 0.9,
      effectQuality: 0.9,
      shadowQuality: 0.8,
      reflectionQuality: 0.8,
      particleCount: 0.8,
      lodBias: 1
    },
    {
      level: 2,
      synthesisRatio: 6,
      resolution: 0.8,
      effectQuality: 0.7,
      shadowQuality: 0.6,
      reflectionQuality: 0.5,
      particleCount: 0.6,
      lodBias: 2
    },
    {
      level: 3,
      synthesisRatio: 4,
      resolution: 0.7,
      effectQuality: 0.5,
      shadowQuality: 0.4,
      reflectionQuality: 0.3,
      particleCount: 0.4,
      lodBias: 3
    },
    {
      level: 4,
      synthesisRatio: 2,
      resolution: 0.6,
      effectQuality: 0.3,
      shadowQuality: 0.2,
      reflectionQuality: 0.1,
      particleCount: 0.2,
      lodBias: 4
    }
  ];

  constructor(config: Partial<DegradationConfig> = {}) {
    this.config = {
      targetFps: 400,
      minFps: 200,
      aggressiveness: 0.7,
      recoveryRate: 0.3,
      smoothnessThreshold: 5, // 5ms variance
      ...config
    };

    this.perfMonitor = new PerformanceMonitor();
    this.loadMonitor = new SystemLoadMonitor();
    
    this.currentLevel = this.qualityPresets[0];
    this.targetLevel = this.qualityPresets[0];

    console.log('[DegradationManager] Initialized');
  }

  /**
   * Update degradation based on performance
   */
  update(timestamp: number): DegradationLevel {
    // Record frame
    this.perfMonitor.recordFrame(timestamp);
    
    // Get performance metrics
    const metrics = this.getMetricsInternal();
    
    // Determine if we need to degrade or recover
    const shouldDegrade = this.shouldDegrade(metrics);
    const shouldRecover = this.shouldRecover(metrics);
    
    if (shouldDegrade) {
      this.degrade();
    } else if (shouldRecover) {
      this.recover();
    }
    
    // Smoothly interpolate current level towards target
    this.interpolateToTarget();
    
    return this.currentLevel;
  }

  /**
   * Get current performance metrics (internal implementation)
   */
  private getMetricsInternal(): PerformanceMetrics {
    const memory = this.loadMonitor.getMemoryUsage();
    
    return {
      fps: this.perfMonitor.getFps(),
      targetFps: this.config.targetFps,
      frameDuration: this.perfMonitor.getAvgFrameDuration(),
      cpuLoad: this.loadMonitor.estimateCpuLoad(),
      gpuLoad: this.loadMonitor.estimateGpuLoad(),
      memoryUsage: memory.used,
      memoryAvailable: memory.available,
      networkLatency: 50, // Would measure actual latency
      droppedFrames: this.perfMonitor.getDroppedFrames()
    };
  }

  /**
   * Check if we should degrade quality
   */
  private shouldDegrade(metrics: PerformanceMetrics): boolean {
    // Check multiple failure indicators
    const fpsLow = metrics.fps < this.config.minFps;
    const frameTooLong = metrics.frameDuration > (1000 / this.config.minFps);
    const cpuHigh = metrics.cpuLoad > 0.9;
    const gpuHigh = metrics.gpuLoad > 0.9;
    const memoryHigh = metrics.memoryUsage > metrics.memoryAvailable * 0.9;
    const droppedFrames = metrics.droppedFrames > 5;
    const jittery = this.perfMonitor.getFrameTimeVariance() > this.config.smoothnessThreshold;
    
    // Aggressive degradation if multiple indicators
    const problemCount = [fpsLow, frameTooLong, cpuHigh, gpuHigh, memoryHigh, droppedFrames, jittery]
      .filter(Boolean).length;
    
    return problemCount >= 2;
  }

  /**
   * Check if we can recover quality
   */
  private shouldRecover(metrics: PerformanceMetrics): boolean {
    // All metrics must be good to recover
    const fpsGood = metrics.fps > this.config.targetFps * 0.9;
    const cpuGood = metrics.cpuLoad < 0.7;
    const gpuGood = metrics.gpuLoad < 0.7;
    const memoryGood = metrics.memoryUsage < metrics.memoryAvailable * 0.7;
    const smooth = this.perfMonitor.getFrameTimeVariance() < this.config.smoothnessThreshold * 0.5;
    
    return fpsGood && cpuGood && gpuGood && memoryGood && smooth;
  }

  /**
   * Degrade quality level
   */
  private degrade(): void {
    const currentIndex = this.qualityPresets.findIndex(p => p.level === this.targetLevel.level);
    const nextIndex = Math.min(this.qualityPresets.length - 1, currentIndex + 1);
    
    if (nextIndex > currentIndex) {
      this.targetLevel = this.qualityPresets[nextIndex];
      console.log(`[DegradationManager] Degrading to level ${this.targetLevel.level}`);
      this.perfMonitor.resetDroppedFrames();
    }
  }

  /**
   * Recover quality level
   */
  private recover(): void {
    const currentIndex = this.qualityPresets.findIndex(p => p.level === this.targetLevel.level);
    const prevIndex = Math.max(0, currentIndex - 1);
    
    if (prevIndex < currentIndex) {
      this.targetLevel = this.qualityPresets[prevIndex];
      console.log(`[DegradationManager] Recovering to level ${this.targetLevel.level}`);
    }
  }

  /**
   * Smoothly interpolate current level to target
   */
  private interpolateToTarget(): void {
    const rate = this.currentLevel.level > this.targetLevel.level 
      ? this.config.recoveryRate 
      : this.config.aggressiveness;
    
    // Interpolate each property
    this.currentLevel = {
      level: this.targetLevel.level, // Discrete
      synthesisRatio: this.lerp(this.currentLevel.synthesisRatio, this.targetLevel.synthesisRatio, rate),
      resolution: this.lerp(this.currentLevel.resolution, this.targetLevel.resolution, rate),
      effectQuality: this.lerp(this.currentLevel.effectQuality, this.targetLevel.effectQuality, rate),
      shadowQuality: this.lerp(this.currentLevel.shadowQuality, this.targetLevel.shadowQuality, rate),
      reflectionQuality: this.lerp(this.currentLevel.reflectionQuality, this.targetLevel.reflectionQuality, rate),
      particleCount: this.lerp(this.currentLevel.particleCount, this.targetLevel.particleCount, rate),
      lodBias: Math.round(this.lerp(this.currentLevel.lodBias, this.targetLevel.lodBias, rate))
    };
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Get current degradation level
   */
  getDegradationLevel(): DegradationLevel {
    return { ...this.currentLevel };
  }

  /**
   * Get performance metrics (public wrapper)
   */
  public getMetrics(): PerformanceMetrics {
    return this.getMetricsInternal();
  }

  /**
   * Force degradation level (for testing)
   */
  setDegradationLevel(level: 0 | 1 | 2 | 3 | 4): void {
    this.currentLevel = this.qualityPresets[level];
    this.targetLevel = this.qualityPresets[level];
    console.log(`[DegradationManager] Forced to level ${level}`);
  }

  /**
   * Reset to highest quality
   */
  reset(): void {
    this.currentLevel = this.qualityPresets[0];
    this.targetLevel = this.qualityPresets[0];
    this.perfMonitor.clear();
    console.log('[DegradationManager] Reset to highest quality');
  }

  /**
   * Get quality description
   */
  getQualityDescription(): string {
    const level = this.currentLevel.level;
    const descriptions = [
      'Ultra - Maximum Quality',
      'High - Excellent Quality',
      'Medium - Good Quality',
      'Low - Acceptable Quality',
      'Minimum - Smooth Performance'
    ];
    
    return descriptions[level];
  }

  /**
   * Check if currently degraded
   */
  isDegraded(): boolean {
    return this.currentLevel.level > 0;
  }

  /**
   * Get degradation percentage
   */
  getDegradationPercent(): number {
    return (this.currentLevel.level / 4) * 100;
  }
}

console.log('[DegradationManager] Module loaded');
