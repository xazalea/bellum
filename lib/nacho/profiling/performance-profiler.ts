/**
 * Performance Profiler
 * 
 * Profile-guided optimization infrastructure for the emulation system.
 * Tracks execution hot paths, bottlenecks, and provides optimization recommendations.
 */

export interface ProfileEntry {
  name: string;
  callCount: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  lastCalled: number;
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  allocations: number;
  deallocations: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  jitCompilationTime: number;
  gcTime: number;
  cpuTime: number;
  gpuTime: number;
  networkTime: number;
}

/**
 * Function Profiler - Tracks hot paths and execution frequency
 */
export class FunctionProfiler {
  private profiles: Map<string, ProfileEntry> = new Map();
  private enabled: boolean = true;
  private jitThreshold: number = 10; // Lower from 100 to 10 for faster JIT

  profile<T>(name: string, fn: () => T): T {
    if (!this.enabled) {
      return fn();
    }

    const start = performance.now();
    let result: T;
    
    try {
      result = fn();
    } finally {
      const end = performance.now();
      const duration = end - start;
      this.recordExecution(name, duration);
    }

    return result;
  }

  async profileAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return await fn();
    }

    const start = performance.now();
    let result: T;
    
    try {
      result = await fn();
    } finally {
      const end = performance.now();
      const duration = end - start;
      this.recordExecution(name, duration);
    }

    return result;
  }

  private recordExecution(name: string, duration: number): void {
    let entry = this.profiles.get(name);
    
    if (!entry) {
      entry = {
        name,
        callCount: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastCalled: 0,
      };
      this.profiles.set(name, entry);
    }

    entry.callCount++;
    entry.totalTime += duration;
    entry.averageTime = entry.totalTime / entry.callCount;
    entry.minTime = Math.min(entry.minTime, duration);
    entry.maxTime = Math.max(entry.maxTime, duration);
    entry.lastCalled = Date.now();
  }

  getHotPaths(minCallCount: number = 10): ProfileEntry[] {
    return Array.from(this.profiles.values())
      .filter(entry => entry.callCount >= minCallCount)
      .sort((a, b) => b.totalTime - a.totalTime);
  }

  shouldJIT(name: string): boolean {
    const entry = this.profiles.get(name);
    return entry !== null && entry !== undefined && entry.callCount >= this.jitThreshold;
  }

  getProfile(name: string): ProfileEntry | undefined {
    return this.profiles.get(name);
  }

  getAllProfiles(): ProfileEntry[] {
    return Array.from(this.profiles.values());
  }

  reset(): void {
    this.profiles.clear();
  }

  setJITThreshold(threshold: number): void {
    this.jitThreshold = threshold;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}

/**
 * Memory Profiler - Tracks memory usage and allocations
 */
export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots: number = 1000;
  private allocationCount: number = 0;
  private deallocationCount: number = 0;

  takeSnapshot(): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: (performance as any).memory?.usedJSHeapSize || 0,
      heapTotal: (performance as any).memory?.totalJSHeapSize || 0,
      external: 0,
      allocations: this.allocationCount,
      deallocations: this.deallocationCount,
    };

    this.snapshots.push(snapshot);
    
    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  recordAllocation(size: number): void {
    this.allocationCount++;
  }

  recordDeallocation(size: number): void {
    this.deallocationCount++;
  }

  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  getLatestSnapshot(): MemorySnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  detectLeaks(): { leaking: boolean; growthRate: number } {
    if (this.snapshots.length < 10) {
      return { leaking: false, growthRate: 0 };
    }

    // Calculate memory growth rate
    const recent = this.snapshots.slice(-10);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    
    const timeDiff = newest.timestamp - oldest.timestamp;
    const memoryDiff = newest.heapUsed - oldest.heapUsed;
    const growthRate = memoryDiff / timeDiff; // bytes per ms

    // Consider it leaking if growing more than 1MB per second
    const leaking = growthRate > 1024;

    return { leaking, growthRate };
  }

  reset(): void {
    this.snapshots = [];
    this.allocationCount = 0;
    this.deallocationCount = 0;
  }
}

/**
 * Frame Profiler - Tracks frame times and FPS
 */
export class FrameProfiler {
  private frameTimes: number[] = [];
  private maxFrames: number = 120;
  private lastFrameTime: number = 0;

  recordFrame(): void {
    const now = performance.now();
    
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimes.push(frameTime);
      
      if (this.frameTimes.length > this.maxFrames) {
        this.frameTimes.shift();
      }
    }
    
    this.lastFrameTime = now;
  }

  getFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    
    const avgFrameTime = this.getAverageFrameTime();
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.frameTimes.length;
  }

  getFrameTimeVariance(): number {
    if (this.frameTimes.length < 2) return 0;
    
    const avg = this.getAverageFrameTime();
    const squaredDiffs = this.frameTimes.map(t => Math.pow(t - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    
    return Math.sqrt(variance);
  }

  getFrameTimePercentile(percentile: number): number {
    if (this.frameTimes.length === 0) return 0;
    
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[index];
  }

  isStable(): boolean {
    const variance = this.getFrameTimeVariance();
    return variance < 5; // Less than 5ms variance
  }

  reset(): void {
    this.frameTimes = [];
    this.lastFrameTime = 0;
  }
}

/**
 * Bottleneck Detector - Identifies performance bottlenecks
 */
export interface Bottleneck {
  type: 'cpu' | 'gpu' | 'memory' | 'network' | 'jit';
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  metric: number;
}

export class BottleneckDetector {
  private functionProfiler: FunctionProfiler;
  private memoryProfiler: MemoryProfiler;
  private frameProfiler: FrameProfiler;

  constructor(
    functionProfiler: FunctionProfiler,
    memoryProfiler: MemoryProfiler,
    frameProfiler: FrameProfiler
  ) {
    this.functionProfiler = functionProfiler;
    this.memoryProfiler = memoryProfiler;
    this.frameProfiler = frameProfiler;
  }

  detectBottlenecks(): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Check CPU bottlenecks (slow functions)
    const hotPaths = this.functionProfiler.getHotPaths(5);
    for (const path of hotPaths.slice(0, 5)) {
      if (path.averageTime > 16) { // Slower than 1 frame at 60fps
        bottlenecks.push({
          type: 'cpu',
          severity: path.averageTime > 33 ? 'high' : 'medium',
          description: `Function ${path.name} is taking ${path.averageTime.toFixed(2)}ms on average`,
          recommendation: 'Consider optimizing or offloading to GPU/Worker',
          metric: path.averageTime,
        });
      }
    }

    // Check memory bottlenecks (leaks)
    const leakInfo = this.memoryProfiler.detectLeaks();
    if (leakInfo.leaking) {
      bottlenecks.push({
        type: 'memory',
        severity: leakInfo.growthRate > 10240 ? 'high' : 'medium',
        description: `Memory growing at ${(leakInfo.growthRate / 1024).toFixed(2)} KB/s`,
        recommendation: 'Check for memory leaks, unreleased resources',
        metric: leakInfo.growthRate,
      });
    }

    // Check frame time stability
    if (!this.frameProfiler.isStable()) {
      const variance = this.frameProfiler.getFrameTimeVariance();
      bottlenecks.push({
        type: 'gpu',
        severity: variance > 10 ? 'high' : 'medium',
        description: `Frame time variance is ${variance.toFixed(2)}ms`,
        recommendation: 'Optimize render pipeline, reduce draw calls',
        metric: variance,
      });
    }

    // Check overall FPS
    const fps = this.frameProfiler.getFPS();
    if (fps < 30 && fps > 0) {
      bottlenecks.push({
        type: 'cpu',
        severity: fps < 15 ? 'high' : 'medium',
        description: `FPS is ${fps.toFixed(1)}`,
        recommendation: 'Reduce simulation complexity, enable JIT, optimize shaders',
        metric: fps,
      });
    }

    return bottlenecks.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }
}

/**
 * Optimization Engine - Applies automatic optimizations
 */
export class OptimizationEngine {
  private functionProfiler: FunctionProfiler;
  private jitCompiler: any; // Reference to JIT compiler

  constructor(functionProfiler: FunctionProfiler) {
    this.functionProfiler = functionProfiler;
  }

  setJITCompiler(compiler: any): void {
    this.jitCompiler = compiler;
  }

  /**
   * Automatically JIT-compile hot functions
   */
  autoJIT(): number {
    let compiledCount = 0;
    
    const hotPaths = this.functionProfiler.getHotPaths(5);
    for (const path of hotPaths) {
      if (this.functionProfiler.shouldJIT(path.name)) {
        console.log(`[OptimizationEngine] JIT compiling ${path.name} (${path.callCount} calls)`);
        // In a real implementation, trigger JIT compilation here
        compiledCount++;
      }
    }

    return compiledCount;
  }

  /**
   * Apply code caching
   */
  cacheCode(name: string, code: any): void {
    // Store compiled code for reuse
    console.log(`[OptimizationEngine] Caching code for ${name}`);
  }

  /**
   * Generate optimization report
   */
  generateReport(): string {
    const report: string[] = [
      '=== Performance Optimization Report ===',
      '',
      'Hot Paths:',
    ];

    const hotPaths = this.functionProfiler.getHotPaths(5);
    for (const path of hotPaths.slice(0, 10)) {
      report.push(`  - ${path.name}: ${path.callCount} calls, avg ${path.averageTime.toFixed(2)}ms`);
      if (path.averageTime > 16) {
        report.push(`    ⚠ Consider optimization (exceeds 16ms frame budget)`);
      }
      if (this.functionProfiler.shouldJIT(path.name)) {
        report.push(`    ✓ Ready for JIT compilation`);
      }
    }

    return report.join('\n');
  }
}

/**
 * Performance Monitor - Main profiling coordinator
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;

  public functionProfiler: FunctionProfiler;
  public memoryProfiler: MemoryProfiler;
  public frameProfiler: FrameProfiler;
  public bottleneckDetector: BottleneckDetector;
  public optimizationEngine: OptimizationEngine;

  private intervalId: number | null = null;

  private constructor() {
    this.functionProfiler = new FunctionProfiler();
    this.memoryProfiler = new MemoryProfiler();
    this.frameProfiler = new FrameProfiler();
    this.bottleneckDetector = new BottleneckDetector(
      this.functionProfiler,
      this.memoryProfiler,
      this.frameProfiler
    );
    this.optimizationEngine = new OptimizationEngine(this.functionProfiler);

    console.log("[PerformanceMonitor] Initialized");
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring(interval: number = 1000): void {
    if (this.intervalId !== null) {
      this.stopMonitoring();
    }

    this.intervalId = window.setInterval(() => {
      this.memoryProfiler.takeSnapshot();
      
      // Auto-optimize hot paths
      this.optimizationEngine.autoJIT();
    }, interval);

    console.log("[PerformanceMonitor] Started monitoring");
  }

  stopMonitoring(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("[PerformanceMonitor] Stopped monitoring");
  }

  getMetrics(): PerformanceMetrics {
    return {
      fps: this.frameProfiler.getFPS(),
      frameTime: this.frameProfiler.getAverageFrameTime(),
      jitCompilationTime: 0, // Would be tracked by JIT compiler
      gcTime: 0, // Not directly accessible
      cpuTime: 0, // Would be calculated from function profiles
      gpuTime: 0, // Would be tracked by GPU profiler
      networkTime: 0, // Would be tracked by network interceptor
    };
  }

  generateFullReport(): string {
    const report: string[] = [
      '╔══════════════════════════════════════════════════╗',
      '║     NachoOS Performance Profiling Report         ║',
      '╚══════════════════════════════════════════════════╝',
      '',
      '📊 Current Metrics:',
      `  FPS: ${this.frameProfiler.getFPS().toFixed(1)}`,
      `  Frame Time: ${this.frameProfiler.getAverageFrameTime().toFixed(2)}ms`,
      `  Frame Variance: ${this.frameProfiler.getFrameTimeVariance().toFixed(2)}ms`,
      '',
      '💾 Memory:',
    ];

    const latestSnapshot = this.memoryProfiler.getLatestSnapshot();
    if (latestSnapshot) {
      report.push(`  Heap Used: ${(latestSnapshot.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      report.push(`  Heap Total: ${(latestSnapshot.heapTotal / 1024 / 1024).toFixed(2)} MB`);
      report.push(`  Allocations: ${latestSnapshot.allocations}`);
      report.push(`  Deallocations: ${latestSnapshot.deallocations}`);
    }

    const leakInfo = this.memoryProfiler.detectLeaks();
    if (leakInfo.leaking) {
      report.push(`  ⚠ Memory Leak Detected: ${(leakInfo.growthRate / 1024).toFixed(2)} KB/s`);
    }

    report.push('', '🔥 Hot Paths:');
    const hotPaths = this.functionProfiler.getHotPaths(5);
    for (const path of hotPaths.slice(0, 10)) {
      report.push(`  ${path.name}:`);
      report.push(`    Calls: ${path.callCount}`);
      report.push(`    Avg: ${path.averageTime.toFixed(2)}ms, Min: ${path.minTime.toFixed(2)}ms, Max: ${path.maxTime.toFixed(2)}ms`);
    }

    report.push('', '⚠ Bottlenecks:');
    const bottlenecks = this.bottleneckDetector.detectBottlenecks();
    if (bottlenecks.length === 0) {
      report.push('  None detected');
    } else {
      for (const bottleneck of bottlenecks) {
        report.push(`  [${bottleneck.severity.toUpperCase()}] ${bottleneck.type}: ${bottleneck.description}`);
        report.push(`    → ${bottleneck.recommendation}`);
      }
    }

    return report.join('\n');
  }

  reset(): void {
    this.functionProfiler.reset();
    this.memoryProfiler.reset();
    this.frameProfiler.reset();
    console.log("[PerformanceMonitor] Reset all profilers");
  }
}

// Export singleton
export const performanceMonitor = PerformanceMonitor.getInstance();

console.log("[PerformanceProfiler] Module loaded");
