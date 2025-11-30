/**
 * Optimized v86 Wrapper - Uses compiled languages for performance
 */

import { V86Loader, V86Config } from './v86-loader';
import { stateOptimizer, cycleOptimizer, memoryOptimizer } from '../performance/optimizers';
import { performanceMonitor } from '../performance/monitor';
import { adaptivePerformance } from '../performance/adaptive';

export class OptimizedV86 {
  private emulator: any = null;
  private cycleHistory: number[] = [];
  private lastCycleTime = performance.now();
  private frameSkip = 0;
  private skippedFrames = 0;

  /**
   * Create optimized v86 emulator instance
   */
  static async create(config: V86Config): Promise<OptimizedV86> {
    await V86Loader.load();
    const instance = new OptimizedV86();
    instance.emulator = V86Loader.create(config);
    
    // Set up performance hooks
    instance.setupPerformanceHooks();
    
    return instance;
  }

  private setupPerformanceHooks(): void {
    if (!this.emulator) return;

    // Hook into screen updates for optimized rendering
    const originalScreenUpdate = this.emulator.screen_update;
    if (originalScreenUpdate) {
      this.emulator.screen_update = async (display: any, width: number, height: number) => {
        // Use adaptive quality settings
        const adaptive = adaptivePerformance?.getConfig();
        if (adaptive) {
          // Apply texture scaling if needed
          if (adaptive.textureScale < 1.0) {
            // Scale down for performance
            width = Math.floor(width * adaptive.textureScale);
            height = Math.floor(height * adaptive.textureScale);
          }
        }

        // Call original with optimized parameters
        if (originalScreenUpdate) {
          originalScreenUpdate.call(this.emulator, display, width, height);
        }
      };
    }

    // Monitor cycle performance
    this.monitorCycles();
  }

  private monitorCycles(): void {
    const checkCycle = () => {
      if (!this.emulator) return;

      const now = performance.now();
      const cycleTime = now - this.lastCycleTime;
      this.lastCycleTime = now;

      // Track cycle history
      this.cycleHistory.push(cycleTime);
      if (this.cycleHistory.length > 60) {
        this.cycleHistory.shift();
      }

      // Optimize frame skipping
      cycleOptimizer.optimizeCycles(this.cycleHistory).then((optimization) => {
        this.frameSkip = optimization.optimalFrameSkip;
        
        // Update performance monitor
        if (performanceMonitor) {
          performanceMonitor.updateEmulatorMetrics(
            Math.round(1000 / cycleTime),
            cycleTime
          );
        }
      });

      requestAnimationFrame(checkCycle);
    };

    requestAnimationFrame(checkCycle);
  }

  /**
   * Optimized state save with compression
   */
  async saveStateOptimized(): Promise<ArrayBuffer> {
    if (!this.emulator) {
      throw new Error('Emulator not initialized');
    }

    // Get raw state
    const rawState = await V86Loader.saveState(this.emulator);

    // Optimize using Rust
    const optimized = await stateOptimizer.optimizeStateRust(rawState);
    
    if (optimized.success && optimized.optimized) {
      return optimized.optimized;
    }

    // Fallback to raw state
    return rawState;
  }

  /**
   * Get emulator instance
   */
  getEmulator(): any {
    return this.emulator;
  }

  /**
   * Check if should skip frame
   */
  shouldSkipFrame(): boolean {
    if (this.frameSkip === 0) return false;
    
    this.skippedFrames++;
    if (this.skippedFrames >= this.frameSkip) {
      this.skippedFrames = 0;
      return false;
    }
    
    return true;
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemory(): Promise<void> {
    if (!this.emulator) return;

    const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const targetMemory = (this.config.memory || 512) * 1024 * 1024;

    const optimization = await memoryOptimizer.optimizeMemory(
      currentMemory,
      targetMemory
    );

    if (optimization.shouldGC && 'gc' in window) {
      // Trigger garbage collection if available
      (window as any).gc?.();
    }
  }

  private config: V86Config | null = null;
  setConfig(config: V86Config): void {
    this.config = config;
  }
}

