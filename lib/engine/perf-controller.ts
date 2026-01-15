/**
 * Performance Controller
 * Centralized performance management and adaptive tuning
 * 
 * Aggregates metrics from profilers and monitors, dynamically adjusts
 * execution parameters, and emits control signals to schedulers.
 */

import { hotPathProfiler, ExecutionTier } from '../execution/profiler';
import { realPerformanceMonitor } from '../performance/real-benchmarks';
import { executionPipeline, type Process, type ExecutionOptions } from './execution-pipeline';

export interface PerformanceMetrics {
  // Runtime metrics
  fps: number;
  frameTime: number;
  frameTimePercentiles: { p50: number; p95: number; p99: number };
  cpuTime: number;
  gpuTime: number;
  
  // Memory metrics
  memoryUsage: number;
  memoryPressure: number; // 0-1
  
  // JIT metrics
  jitCompilations: number;
  wasmCompiledBlocks: number;
  gpuCompiledBlocks: number;
  compilationQueueDepth: number;
  
  // Profiling metrics
  coldBlocks: number;
  warmBlocks: number;
  hotBlocks: number;
  criticalBlocks: number;
  
  // System health
  backpressureLevel: number; // 0-1
  gpuQueueDepth: number;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
  
  // Adaptive thresholds
  warmThreshold: number;
  hotThreshold: number;
  criticalThreshold: number;
}

export interface PerformanceControl {
  // Adaptive execution options
  enableJIT: boolean;
  enableGPU: boolean;
  enableProfiling: boolean;
  
  // Tier thresholds (dynamic)
  warmThreshold: number;
  hotThreshold: number;
  criticalThreshold: number;
  
  // Backpressure controls
  maxBackpressure: number;
  frameTimeBudget: number; // ms per frame
  
  // Priority scheduling
  foregroundPriority: number; // 0-1
  backgroundPriority: number; // 0-1
  
  // JIT queue management
  maxJITQueueSize: number;
  jitCompilationRate: number; // compilations per second
  jitFrameBudget: number; // ms per frame for JIT
  jitQueueStatus: {
    foregroundQueue: number;
    backgroundQueue: number;
    currentFrameSpent: number;
  };
}

export type MetricsCallback = (metrics: PerformanceMetrics) => void;
export type ControlCallback = (control: PerformanceControl) => void;

/**
 * Performance Controller
 * Central hub for performance monitoring and adaptive tuning
 */
export class PerfController {
  private static instance: PerfController;
  
  private metricsCallbacks: Set<MetricsCallback> = new Set();
  private controlCallbacks: Set<ControlCallback> = new Set();
  
  private currentMetrics: PerformanceMetrics;
  private currentControl: PerformanceControl;
  
  private updateInterval: number | null = null;
  private isRunning: boolean = false;
  
  // Adaptive thresholds (start conservative, adjust based on performance)
  private adaptiveWarmThreshold: number = 100;
  private adaptiveHotThreshold: number = 1000;
  private adaptiveCriticalThreshold: number = 10000;
  
  // Frame time tracking with jitter buffer
  private frameTimeHistory: number[] = [];
  private readonly FRAME_HISTORY_SIZE = 300; // 5 seconds at 60fps
  private frameTimePercentiles: { p50: number; p95: number; p99: number } = { p50: 16.67, p95: 20, p99: 33 };
  
  // Tier hysteresis to prevent thrashing
  private tierHysteresis: {
    warm: { upper: number; lower: number };
    hot: { upper: number; lower: number };
    critical: { upper: number; lower: number };
  } = {
    warm: { upper: 150, lower: 80 }, // Hysteresis band: 80-150
    hot: { upper: 1200, lower: 800 }, // Hysteresis band: 800-1200
    critical: { upper: 12000, lower: 8000 }, // Hysteresis band: 8000-12000
  };
  
  // JIT compilation budget tracking
  private jitBudget: {
    frameBudget: number; // ms per frame for JIT
    currentFrameSpent: number;
    queue: Array<{ priority: number; estimatedTime: number }>;
    foregroundQueue: Array<{ priority: number; estimatedTime: number }>;
    backgroundQueue: Array<{ priority: number; estimatedTime: number }>;
  } = {
    frameBudget: 2.0, // 2ms per frame for JIT
    currentFrameSpent: 0,
    queue: [],
    foregroundQueue: [],
    backgroundQueue: [],
  };
  
  // GPU queue depth tracking
  private gpuQueueDepth: number = 0;
  
  // Per-process frame time distribution
  private processFrameTimes: Map<number, number[]> = new Map();
  
  private constructor() {
    this.currentMetrics = this.createEmptyMetrics();
    this.currentControl = this.createDefaultControl();
  }
  
  public static getInstance(): PerfController {
    if (!PerfController.instance) {
      PerfController.instance = new PerfController();
    }
    return PerfController.instance;
  }
  
  /**
   * Initialize performance controller
   */
  async initialize(): Promise<void> {
    console.log('[PerfController] Initializing...');
    
    // Start metrics collection loop
    this.startMetricsCollection();
    
    console.log('[PerfController] Initialized');
  }
  
  /**
   * Start metrics collection loop
   */
  private startMetricsCollection(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Update metrics at 60Hz (every ~16ms)
    this.updateInterval = window.setInterval(() => {
      this.updateMetrics();
      this.adaptControl();
    }, 16);
  }
  
  /**
   * Stop metrics collection
   */
  stop(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('[PerfController] Stopped');
  }
  
  /**
   * Update metrics from all sources
   */
  private updateMetrics(): void {
    const processes = executionPipeline.getActiveProcesses();
    
    // Aggregate metrics from all processes
    let totalCpuTime = 0;
    let totalGpuTime = 0;
    let totalJitCompilations = 0;
    let totalWasmBlocks = 0;
    let totalGpuBlocks = 0;
    let totalColdBlocks = 0;
    let totalWarmBlocks = 0;
    let totalHotBlocks = 0;
    let totalCriticalBlocks = 0;
    let maxBackpressure = 0;
    let totalMemoryUsage = 0;
    
    for (const process of processes) {
      const perf = process.performance;
      totalCpuTime += perf.cpuTime;
      totalGpuTime += perf.gpuTime;
      totalJitCompilations += perf.jitCompilations;
      totalWasmBlocks += perf.wasmCompiledBlocks;
      totalGpuBlocks += perf.gpuCompiledBlocks;
      totalColdBlocks += perf.coldBlocks;
      totalWarmBlocks += perf.warmBlocks;
      totalHotBlocks += perf.hotBlocks;
      totalCriticalBlocks += perf.criticalBlocks;
      maxBackpressure = Math.max(maxBackpressure, perf.backpressureLevel);
      totalMemoryUsage += perf.memoryUsage;
    }
    
    // Get profiler statistics
    const profilerStats = hotPathProfiler.getStatistics();
    
    // Calculate frame time from history
    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 16.67; // Default 60fps
    
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    
    // Calculate memory pressure
    const memoryLimit = 2 * 1024 * 1024 * 1024; // 2GB estimate
    const memoryPressure = Math.min(1.0, totalMemoryUsage / memoryLimit);
    
    // Get frame time percentiles
    const percentiles = this.getFrameTimePercentiles();
    
    // Get JIT queue status
    const jitQueueStatus = this.getJITQueueStatus();
    
    // Update metrics
    this.currentMetrics = {
      fps,
      frameTime: avgFrameTime,
      frameTimePercentiles: percentiles,
      cpuTime: totalCpuTime,
      gpuTime: totalGpuTime,
      memoryUsage: totalMemoryUsage,
      memoryPressure,
      jitCompilations: totalJitCompilations,
      wasmCompiledBlocks: totalWasmBlocks,
      gpuCompiledBlocks: totalGpuBlocks,
      compilationQueueDepth: 0, // Would track actual queue
      coldBlocks: totalColdBlocks || profilerStats.coldBlocks,
      warmBlocks: totalWarmBlocks || profilerStats.warmBlocks,
      hotBlocks: totalHotBlocks || profilerStats.hotBlocks,
      criticalBlocks: totalCriticalBlocks || profilerStats.criticalBlocks,
      backpressureLevel: maxBackpressure,
      gpuQueueDepth: this.gpuQueueDepth,
      thermalState: this.detectThermalState(),
      warmThreshold: this.adaptiveWarmThreshold,
      hotThreshold: this.adaptiveHotThreshold,
      criticalThreshold: this.adaptiveCriticalThreshold,
    };
    
    // Notify callbacks
    for (const callback of this.metricsCallbacks) {
      callback(this.currentMetrics);
    }
  }
  
  /**
   * Adapt control parameters based on metrics with hysteresis
   */
  private adaptControl(): void {
    const metrics = this.currentMetrics;
    const percentiles = this.frameTimePercentiles;
    
    // Use percentile-based frame budget (target p95, not average)
    const targetFrameTime = Math.max(16.67, percentiles.p95 * 1.1); // 10% headroom
    
    // Adaptive threshold tuning with hysteresis
    // If we're compiling too much, raise thresholds (only if above upper bound)
    if (metrics.jitCompilations > 100 && metrics.fps < 30) {
      if (this.adaptiveWarmThreshold < this.tierHysteresis.warm.upper) {
        this.adaptiveWarmThreshold = Math.min(
          this.tierHysteresis.warm.upper,
          this.adaptiveWarmThreshold * 1.05 // Slower increase
        );
      }
      if (this.adaptiveHotThreshold < this.tierHysteresis.hot.upper) {
        this.adaptiveHotThreshold = Math.min(
          this.tierHysteresis.hot.upper,
          this.adaptiveHotThreshold * 1.05
        );
      }
    }
    // If performance is good, lower thresholds (only if above lower bound)
    else if (metrics.fps > 55 && metrics.backpressureLevel < 0.3 && percentiles.p95 < 20) {
      if (this.adaptiveWarmThreshold > this.tierHysteresis.warm.lower) {
        this.adaptiveWarmThreshold = Math.max(
          this.tierHysteresis.warm.lower,
          this.adaptiveWarmThreshold * 0.98 // Slower decrease
        );
      }
      if (this.adaptiveHotThreshold > this.tierHysteresis.hot.lower) {
        this.adaptiveHotThreshold = Math.max(
          this.tierHysteresis.hot.lower,
          this.adaptiveHotThreshold * 0.98
        );
      }
    }
    
    // Adjust JIT frame budget based on frame time percentiles
    // If p95 is good, we can spend more on JIT
    if (percentiles.p95 < 18) {
      this.jitBudget.frameBudget = Math.min(3.0, this.jitBudget.frameBudget * 1.01);
    } else if (percentiles.p95 > 25) {
      this.jitBudget.frameBudget = Math.max(1.0, this.jitBudget.frameBudget * 0.99);
    }
    
    // Adjust JIT enablement based on memory pressure
    const enableJIT = metrics.memoryPressure < 0.8;
    
    // Adjust GPU enablement based on queue depth and thermal state
    const enableGPU = metrics.gpuQueueDepth < 10 && 
                      metrics.thermalState !== 'critical' &&
                      metrics.thermalState !== 'serious';
    
    // Adjust backpressure threshold based on FPS
    let maxBackpressure = 0.8;
    if (metrics.fps < 30) {
      maxBackpressure = 0.5; // More aggressive throttling
    } else if (metrics.fps > 55) {
      maxBackpressure = 0.9; // Can handle more load
    }
    
    // Frame time budget: target 60fps but allow some variance
    const frameTimeBudget = metrics.fps > 50 ? 20 : 33; // 20ms for 50+ fps, 33ms otherwise
    
    // Update control
    this.currentControl = {
      enableJIT,
      enableGPU,
      enableProfiling: true,
      warmThreshold: this.adaptiveWarmThreshold,
      hotThreshold: this.adaptiveHotThreshold,
      criticalThreshold: this.adaptiveCriticalThreshold,
      maxBackpressure,
      frameTimeBudget,
      foregroundPriority: 1.0,
      backgroundPriority: 0.3,
      maxJITQueueSize: 50,
      jitCompilationRate: enableJIT ? 10 : 0, // 10 compilations per second max
      jitFrameBudget: this.jitBudget.frameBudget,
      jitQueueStatus: this.getJITQueueStatus(),
    };
    
    // Notify callbacks
    for (const callback of this.controlCallbacks) {
      callback(this.currentControl);
    }
  }
  
  /**
   * Detect thermal state based on performance degradation
   */
  private detectThermalState(): 'nominal' | 'fair' | 'serious' | 'critical' {
    const metrics = this.currentMetrics;
    
    // If FPS is dropping and backpressure is high, likely thermal throttling
    if (metrics.fps < 20 && metrics.backpressureLevel > 0.8) {
      return 'critical';
    } else if (metrics.fps < 30 && metrics.backpressureLevel > 0.6) {
      return 'serious';
    } else if (metrics.fps < 45 && metrics.backpressureLevel > 0.4) {
      return 'fair';
    }
    
    return 'nominal';
  }
  
  /**
   * Record frame time with jitter buffer smoothing
   */
  recordFrameTime(frameTime: number, processId?: number): void {
    // Add to main history
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.FRAME_HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }
    
    // Track per-process if provided
    if (processId !== undefined) {
      if (!this.processFrameTimes.has(processId)) {
        this.processFrameTimes.set(processId, []);
      }
      const processHistory = this.processFrameTimes.get(processId)!;
      processHistory.push(frameTime);
      if (processHistory.length > 60) {
        processHistory.shift();
      }
    }
    
    // Update percentiles periodically (every 60 frames)
    if (this.frameTimeHistory.length % 60 === 0) {
      this.updateFrameTimePercentiles();
    }
    
    // Reset JIT budget for new frame
    this.jitBudget.currentFrameSpent = 0;
  }
  
  /**
   * Update frame time percentiles
   */
  private updateFrameTimePercentiles(): void {
    if (this.frameTimeHistory.length < 10) return;
    
    const sorted = [...this.frameTimeHistory].sort((a, b) => a - b);
    const len = sorted.length;
    
    this.frameTimePercentiles = {
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
    };
  }
  
  /**
   * Get frame time percentiles
   */
  getFrameTimePercentiles(): { p50: number; p95: number; p99: number } {
    return { ...this.frameTimePercentiles };
  }
  
  /**
   * Get per-process frame time stats
   */
  getProcessFrameTimeStats(processId: number): { avg: number; p95: number; p99: number } | null {
    const history = this.processFrameTimes.get(processId);
    if (!history || history.length === 0) return null;
    
    const sorted = [...history].sort((a, b) => a - b);
    const len = sorted.length;
    const avg = sorted.reduce((a, b) => a + b, 0) / len;
    
    return {
      avg,
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
    };
  }
  
  /**
   * Check if JIT compilation budget is available
   */
  canCompile(estimatedTime: number, priority: 'foreground' | 'background' = 'foreground'): boolean {
    const remaining = this.jitBudget.frameBudget - this.jitBudget.currentFrameSpent;
    
    // Foreground gets full budget, background gets 50%
    const availableBudget = priority === 'foreground' 
      ? remaining 
      : remaining * 0.5;
    
    return estimatedTime <= availableBudget;
  }
  
  /**
   * Reserve JIT compilation budget
   */
  reserveJITBudget(time: number, priority: 'foreground' | 'background' = 'foreground'): boolean {
    if (!this.canCompile(time, priority)) {
      return false;
    }
    
    this.jitBudget.currentFrameSpent += time;
    
    // Add to appropriate queue for tracking
    const queue = priority === 'foreground' 
      ? this.jitBudget.foregroundQueue 
      : this.jitBudget.backgroundQueue;
    
    queue.push({ priority: priority === 'foreground' ? 1.0 : 0.3, estimatedTime: time });
    
    // Keep queue sizes reasonable
    if (queue.length > 100) {
      queue.shift();
    }
    
    return true;
  }
  
  /**
   * Get JIT queue status
   */
  getJITQueueStatus(): {
    foregroundQueue: number;
    backgroundQueue: number;
    currentFrameBudget: number;
    currentFrameSpent: number;
  } {
    return {
      foregroundQueue: this.jitBudget.foregroundQueue.length,
      backgroundQueue: this.jitBudget.backgroundQueue.length,
      currentFrameBudget: this.jitBudget.frameBudget,
      currentFrameSpent: this.jitBudget.currentFrameSpent,
    };
  }
  
  /**
   * Update GPU queue depth
   */
  updateGPUQueueDepth(depth: number): void {
    this.gpuQueueDepth = depth;
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics };
  }
  
  /**
   * Get current control parameters
   */
  getControl(): PerformanceControl {
    return { ...this.currentControl };
  }
  
  /**
   * Subscribe to metrics updates
   */
  onMetricsUpdate(callback: MetricsCallback): () => void {
    this.metricsCallbacks.add(callback);
    
    // Immediately call with current metrics
    callback(this.currentMetrics);
    
    // Return unsubscribe function
    return () => {
      this.metricsCallbacks.delete(callback);
    };
  }
  
  /**
   * Subscribe to control updates
   */
  onControlUpdate(callback: ControlCallback): () => void {
    this.controlCallbacks.add(callback);
    
    // Immediately call with current control
    callback(this.currentControl);
    
    // Return unsubscribe function
    return () => {
      this.controlCallbacks.delete(callback);
    };
  }
  
  /**
   * Get optimized execution options for a process
   */
  getExecutionOptions(priority: 'foreground' | 'background' = 'foreground'): ExecutionOptions {
    const control = this.currentControl;
    
    return {
      enableJIT: control.enableJIT,
      enableGPU: control.enableGPU && priority === 'foreground',
      enableProfiling: control.enableProfiling,
      maxBackpressure: control.maxBackpressure,
      enableMetrics: true,
    };
  }
  
  /**
   * Create empty metrics
   */
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      frameTime: 0,
      frameTimePercentiles: { p50: 16.67, p95: 20, p99: 33 },
      cpuTime: 0,
      gpuTime: 0,
      memoryUsage: 0,
      memoryPressure: 0,
      jitCompilations: 0,
      wasmCompiledBlocks: 0,
      gpuCompiledBlocks: 0,
      compilationQueueDepth: 0,
      coldBlocks: 0,
      warmBlocks: 0,
      hotBlocks: 0,
      criticalBlocks: 0,
      backpressureLevel: 0,
      gpuQueueDepth: 0,
      thermalState: 'nominal',
      warmThreshold: 100,
      hotThreshold: 1000,
      criticalThreshold: 10000,
    };
  }
  
  /**
   * Create default control
   */
  private createDefaultControl(): PerformanceControl {
    return {
      enableJIT: true,
      enableGPU: true,
      enableProfiling: true,
      warmThreshold: 100,
      hotThreshold: 1000,
      criticalThreshold: 10000,
      maxBackpressure: 0.8,
      frameTimeBudget: 16.67,
      foregroundPriority: 1.0,
      backgroundPriority: 0.3,
      maxJITQueueSize: 50,
      jitCompilationRate: 10,
      jitFrameBudget: 2.0,
      jitQueueStatus: {
        foregroundQueue: 0,
        backgroundQueue: 0,
        currentFrameSpent: 0,
      },
    };
  }
  
  /**
   * Clear process frame time tracking
   */
  clearProcessTracking(processId: number): void {
    this.processFrameTimes.delete(processId);
  }
}

// Export singleton
export const perfController = PerfController.getInstance();
