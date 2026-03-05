/**
 * Frame Scheduler - Manages execution timing for 40+ FPS target
 * Implements frame skipping and adaptive quality for consistent performance
 */

export interface FrameMetrics {
  fps: number;
  frameTimeMs: number;
  cpuTimeMs: number;
  gpuTimeMs: number;
  instructionsPerFrame: number;
  droppedFrames: number;
  qualityLevel: number;
}

export interface FrameCallback {
  (deltaTime: number, frameBudget: number): Promise<void> | void;
}

export interface SchedulerOptions {
  targetFPS?: number;
  maxFrameSkip?: number;
  adaptiveQuality?: boolean;
  onMetrics?: (metrics: FrameMetrics) => void;
}

/**
 * High-precision frame scheduler using requestAnimationFrame
 * with performance monitoring and adaptive quality
 */
export class FrameScheduler {
  private targetFPS: number;
  private targetFrameTime: number;
  private maxFrameSkip: number;
  private adaptiveQuality: boolean;
  private onMetricsCallback?: (metrics: FrameMetrics) => void;

  private running: boolean = false;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private droppedFrames: number = 0;
  private qualityLevel: number = 1.0;
  
  // Performance tracking
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private cpuTimeHistory: number[] = [];
  private gpuTimeHistory: number[] = [];
  
  // Callbacks
  private frameCallbacks: FrameCallback[] = [];
  private preFrameCallbacks: FrameCallback[] = [];
  private postFrameCallbacks: FrameCallback[] = [];

  // RAF handle
  private rafHandle: number | null = null;

  constructor(options: SchedulerOptions = {}) {
    this.targetFPS = options.targetFPS || 60;
    this.targetFrameTime = 1000 / this.targetFPS;
    this.maxFrameSkip = options.maxFrameSkip || 5;
    this.adaptiveQuality = options.adaptiveQuality ?? true;
    this.onMetricsCallback = options.onMetrics;
  }

  /**
   * Start the frame scheduler
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.scheduleNextFrame();
  }

  /**
   * Stop the frame scheduler
   */
  stop(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  /**
   * Add a frame callback
   */
  onFrame(callback: FrameCallback): () => void {
    this.frameCallbacks.push(callback);
    return () => {
      const idx = this.frameCallbacks.indexOf(callback);
      if (idx >= 0) this.frameCallbacks.splice(idx, 1);
    };
  }

  /**
   * Add a pre-frame callback (called before main frame)
   */
  onPreFrame(callback: FrameCallback): () => void {
    this.preFrameCallbacks.push(callback);
    return () => {
      const idx = this.preFrameCallbacks.indexOf(callback);
      if (idx >= 0) this.preFrameCallbacks.splice(idx, 1);
    };
  }

  /**
   * Add a post-frame callback (called after main frame)
   */
  onPostFrame(callback: FrameCallback): () => void {
    this.postFrameCallbacks.push(callback);
    return () => {
      const idx = this.postFrameCallbacks.indexOf(callback);
      if (idx >= 0) this.postFrameCallbacks.splice(idx, 1);
    };
  }

  /**
   * Get current frame budget in milliseconds
   */
  getFrameBudget(): number {
    return this.targetFrameTime * this.qualityLevel;
  }

  /**
   * Get current quality level (0.0 - 1.0)
   */
  getQualityLevel(): number {
    return this.qualityLevel;
  }

  /**
   * Set quality level manually
   */
  setQualityLevel(level: number): void {
    this.qualityLevel = Math.max(0.25, Math.min(1.0, level));
  }

  /**
   * Get current metrics
   */
  getMetrics(): FrameMetrics {
    const avgFPS = this.calculateAverage(this.fpsHistory);
    const avgFrameTime = this.calculateAverage(this.frameTimeHistory);
    const avgCPUTime = this.calculateAverage(this.cpuTimeHistory);
    const avgGPUTime = this.calculateAverage(this.gpuTimeHistory);

    return {
      fps: avgFPS || this.targetFPS,
      frameTimeMs: avgFrameTime || this.targetFrameTime,
      cpuTimeMs: avgCPUTime || 0,
      gpuTimeMs: avgGPUTime || 0,
      instructionsPerFrame: 0, // Set by executor
      droppedFrames: this.droppedFrames,
      qualityLevel: this.qualityLevel,
    };
  }

  /**
   * Schedule next frame
   */
  private scheduleNextFrame(): void {
    if (!this.running) return;
    this.rafHandle = requestAnimationFrame(this.executeFrame.bind(this));
  }

  /**
   * Execute a single frame
   */
  private async executeFrame(timestamp: number): Promise<void> {
    if (!this.running) return;

    const frameStart = performance.now();
    const deltaTime = timestamp - this.lastFrameTime;
    
    // Check for frame skip
    let framesToProcess = 1;
    if (deltaTime > this.targetFrameTime * 2) {
      framesToProcess = Math.min(
        Math.floor(deltaTime / this.targetFrameTime),
        this.maxFrameSkip
      );
      this.droppedFrames += framesToProcess - 1;
    }

    // Calculate frame budget
    const frameBudget = this.getFrameBudget();
    let cpuTime = 0;
    let gpuTime = 0;

    try {
      // Pre-frame callbacks
      for (const callback of this.preFrameCallbacks) {
        await callback(deltaTime, frameBudget);
      }

      // Main frame callbacks
      const callbackStart = performance.now();
      for (const callback of this.frameCallbacks) {
        await callback(deltaTime, frameBudget);
      }
      cpuTime = performance.now() - callbackStart;

      // Post-frame callbacks
      for (const callback of this.postFrameCallbacks) {
        await callback(deltaTime, frameBudget);
      }
    } catch (error) {
      console.error('[FrameScheduler] Frame error:', error);
    }

    // Update timing
    const frameEnd = performance.now();
    const frameTime = frameEnd - frameStart;
    this.lastFrameTime = timestamp;
    this.frameCount++;

    // Track metrics
    const instantFPS = 1000 / deltaTime;
    this.trackMetric(this.fpsHistory, instantFPS, 60);
    this.trackMetric(this.frameTimeHistory, frameTime, 60);
    this.trackMetric(this.cpuTimeHistory, cpuTime, 60);
    this.trackMetric(this.gpuTimeHistory, gpuTime, 60);

    // Adaptive quality adjustment
    if (this.adaptiveQuality && this.frameCount % 30 === 0) {
      this.adjustQuality();
    }

    // Report metrics
    if (this.onMetricsCallback && this.frameCount % 10 === 0) {
      this.onMetricsCallback(this.getMetrics());
    }

    // Schedule next frame
    this.scheduleNextFrame();
  }

  /**
   * Track a metric value with history limit
   */
  private trackMetric(history: number[], value: number, maxSamples: number): void {
    history.push(value);
    if (history.length > maxSamples) {
      history.shift();
    }
  }

  /**
   * Calculate average of history
   */
  private calculateAverage(history: number[]): number {
    if (history.length === 0) return 0;
    return history.reduce((a, b) => a + b, 0) / history.length;
  }

  /**
   * Adjust quality based on performance
   */
  private adjustQuality(): void {
    const avgFPS = this.calculateAverage(this.fpsHistory);
    const avgFrameTime = this.calculateAverage(this.frameTimeHistory);
    
    // Target is 90% of target FPS
    const targetThreshold = this.targetFPS * 0.9;
    
    if (avgFPS < targetThreshold) {
      // Performance is below target, reduce quality
      this.qualityLevel = Math.max(0.25, this.qualityLevel - 0.1);
      console.log(`[FrameScheduler] Reducing quality to ${this.qualityLevel.toFixed(2)} (FPS: ${avgFPS.toFixed(1)})`);
    } else if (avgFPS >= this.targetFPS * 0.95 && this.qualityLevel < 1.0) {
      // Performance is good, increase quality
      this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
      console.log(`[FrameScheduler] Increasing quality to ${this.qualityLevel.toFixed(2)}`);
    }
  }
}

/**
 * Create a frame scheduler with default options
 */
export function createFrameScheduler(targetFPS: number = 60): FrameScheduler {
  return new FrameScheduler({ targetFPS });
}

/**
 * Singleton instance for global use
 */
let globalScheduler: FrameScheduler | null = null;

export function getGlobalScheduler(): FrameScheduler {
  if (!globalScheduler) {
    globalScheduler = new FrameScheduler({
      targetFPS: 60,
      adaptiveQuality: true,
    });
  }
  return globalScheduler;
}