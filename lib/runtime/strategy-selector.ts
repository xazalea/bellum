/**
 * Execution Strategy Selector
 * Selects optimal execution strategy based on device tier and content type
 */

import { DeviceTier, TierInfo, getTierInfoCached } from './capability-detector';
import { featureFlags } from './feature-flags';
import { metricsCollector } from '../performance/metrics-collector';

export type ExecutionStrategy = 
  | 'interpreter-only'
  | 'selective-jit'
  | 'full-jit-webgpu'
  | 'mesh-offload';

export type ContentType = 'apk' | 'exe' | 'html5-game' | 'wasm';

export interface ExecutionConfig {
  strategy: ExecutionStrategy;
  tier: DeviceTier;
  useJIT: boolean;
  useWebGPU: boolean;
  useMeshOffload: boolean;
  useAggressiveCaching: boolean;
  useBackgroundPrefetch: boolean;
  memoryBudget: number;
  maxConcurrentWorkers: number;
  chunkSize: number;
  timeout: number;
}

export interface StrategyChangeEvent {
  previousStrategy: ExecutionStrategy;
  newStrategy: ExecutionStrategy;
  reason: string;
  timestamp: number;
}

type StrategyChangeCallback = (event: StrategyChangeEvent) => void;

// Default configurations per tier
const TIER_CONFIGS: Record<DeviceTier, Omit<ExecutionConfig, 'memoryBudget'>> = {
  tier1: {
    strategy: 'interpreter-only',
    tier: 'tier1',
    useJIT: false,
    useWebGPU: false,
    useMeshOffload: true,
    useAggressiveCaching: false,
    useBackgroundPrefetch: false,
    maxConcurrentWorkers: 1,
    chunkSize: 32 * 1024, // 32KB chunks
    timeout: 30000,
  },
  tier2: {
    strategy: 'selective-jit',
    tier: 'tier2',
    useJIT: true,
    useWebGPU: false,
    useMeshOffload: true,
    useAggressiveCaching: true,
    useBackgroundPrefetch: true,
    maxConcurrentWorkers: 2,
    chunkSize: 64 * 1024, // 64KB chunks
    timeout: 20000,
  },
  tier3: {
    strategy: 'full-jit-webgpu',
    tier: 'tier3',
    useJIT: true,
    useWebGPU: true,
    useMeshOffload: false,
    useAggressiveCaching: true,
    useBackgroundPrefetch: true,
    maxConcurrentWorkers: 4,
    chunkSize: 128 * 1024, // 128KB chunks
    timeout: 15000,
  },
  tier4: {
    strategy: 'mesh-offload',
    tier: 'tier4',
    useJIT: false,
    useWebGPU: false,
    useMeshOffload: true,
    useAggressiveCaching: false,
    useBackgroundPrefetch: false,
    maxConcurrentWorkers: 1,
    chunkSize: 16 * 1024, // 16KB chunks
    timeout: 60000, // Longer timeout for mesh
  },
};

// Content-specific strategy adjustments
const CONTENT_ADJUSTMENTS: Record<ContentType, Partial<ExecutionConfig>> = {
  'apk': {
    timeout: 45000, // APKs need more time
  },
  'exe': {
    timeout: 30000,
  },
  'html5-game': {
    timeout: 10000,
    useJIT: false, // HTML5 games don't need JIT
  },
  'wasm': {
    useJIT: false, // WASM is already compiled
    useWebGPU: true,
  },
};

class StrategySelector {
  private currentConfig: ExecutionConfig | null = null;
  private tierInfo: TierInfo | null = null;
  private changeCallbacks: Set<StrategyChangeCallback> = new Set();
  private performanceCheckInterval: number | null = null;
  private consecutiveLowFps: number = 0;
  private consecutiveHighMemory: number = 0;

  /**
   * Initialize the strategy selector
   */
  async initialize(): Promise<ExecutionConfig> {
    this.tierInfo = await getTierInfoCached();
    
    // Set user context for feature flags
    featureFlags.setUserContext({
      tier: this.tierInfo.tier,
    });

    // Get base config for tier
    const baseConfig = TIER_CONFIGS[this.tierInfo.tier];
    
    this.currentConfig = {
      ...baseConfig,
      memoryBudget: this.tierInfo.memoryBudget,
    };

    // Apply feature flag overrides
    this.applyFeatureFlagOverrides();

    // Start performance monitoring for dynamic adjustment
    this.startPerformanceMonitoring();

    // Update metrics collector with tier
    metricsCollector.setTier(this.tierInfo.tier);

    return this.currentConfig;
  }

  /**
   * Apply feature flag overrides to config
   */
  private applyFeatureFlagOverrides(): void {
    if (!this.currentConfig) return;

    if (!featureFlags.isEnabled('jit-compilation')) {
      this.currentConfig.useJIT = false;
    }

    if (!featureFlags.isEnabled('webgpu-rendering')) {
      this.currentConfig.useWebGPU = false;
    }

    if (!featureFlags.isEnabled('mesh-compute-offload')) {
      this.currentConfig.useMeshOffload = false;
    }

    if (!featureFlags.isEnabled('background-prefetch')) {
      this.currentConfig.useBackgroundPrefetch = false;
    }
  }

  /**
   * Start monitoring performance for dynamic tier adjustment
   */
  private startPerformanceMonitoring(): void {
    this.performanceCheckInterval = window.setInterval(() => {
      this.checkPerformanceAndAdjust();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check performance and adjust strategy if needed
   */
  private checkPerformanceAndAdjust(): void {
    if (!this.currentConfig) return;

    const metrics = metricsCollector.getCurrentMetrics();
    
    // Track consecutive low FPS
    if (metrics.execution.fps < 25) {
      this.consecutiveLowFps++;
    } else {
      this.consecutiveLowFps = 0;
    }

    // Track consecutive high memory
    const memoryRatio = metrics.memory.heapUsed / metrics.memory.heapLimit;
    if (memoryRatio > 0.85) {
      this.consecutiveHighMemory++;
    } else {
      this.consecutiveHighMemory = 0;
    }

    // Adjust if needed
    if (this.consecutiveLowFps >= 6) { // 30 seconds of low FPS
      this.downgradeStrategy('low_fps');
    } else if (this.consecutiveHighMemory >= 6) { // 30 seconds of high memory
      this.downgradeStrategy('high_memory');
    } else if (this.consecutiveLowFps === 0 && this.consecutiveHighMemory === 0) {
      // Consider upgrade if performance is good
      this.considerUpgrade();
    }
  }

  /**
   * Downgrade strategy due to performance issues
   */
  private downgradeStrategy(reason: string): void {
    if (!this.currentConfig) return;

    const currentTier = this.currentConfig.tier;
    let newTier: DeviceTier | null = null;

    if (currentTier === 'tier3') {
      newTier = 'tier2';
    } else if (currentTier === 'tier2') {
      newTier = 'tier1';
    }

    if (newTier) {
      this.switchToTier(newTier, reason);
    }
  }

  /**
   * Consider upgrading strategy if performance is consistently good
   */
  private considerUpgrade(): void {
    if (!this.currentConfig || !this.tierInfo) return;

    // Only consider upgrade if we've been stable for a while
    const currentTier = this.currentConfig.tier;
    const originalTier = this.tierInfo.tier;

    // Don't upgrade beyond original tier
    if (currentTier === originalTier) return;

    // Check if we should upgrade
    const metrics = metricsCollector.getCurrentMetrics();
    const stableFps = metrics.execution.fps > 50;
    const stableMemory = metrics.memory.heapUsed / metrics.memory.heapLimit < 0.6;

    if (stableFps && stableMemory) {
      let newTier: DeviceTier | null = null;

      if (currentTier === 'tier1' && originalTier !== 'tier1') {
        newTier = 'tier2';
      } else if (currentTier === 'tier2' && originalTier === 'tier3') {
        newTier = 'tier3';
      }

      if (newTier) {
        this.switchToTier(newTier, 'performance_improved');
      }
    }
  }

  /**
   * Switch to a different tier
   */
  private switchToTier(newTier: DeviceTier, reason: string): void {
    if (!this.currentConfig) return;

    const previousStrategy = this.currentConfig.strategy;
    const newConfig = TIER_CONFIGS[newTier];

    this.currentConfig = {
      ...newConfig,
      memoryBudget: this.tierInfo?.memoryBudget || 0,
    };

    this.applyFeatureFlagOverrides();

    // Notify listeners
    const event: StrategyChangeEvent = {
      previousStrategy,
      newStrategy: this.currentConfig.strategy,
      reason,
      timestamp: Date.now(),
    };

    this.notifyStrategyChange(event);

    // Update metrics
    metricsCollector.setTier(newTier);
  }

  /**
   * Get execution config for specific content type
   */
  getConfigForContent(contentType: ContentType): ExecutionConfig {
    if (!this.currentConfig) {
      throw new Error('Strategy selector not initialized');
    }

    const adjustments = CONTENT_ADJUSTMENTS[contentType];
    return {
      ...this.currentConfig,
      ...adjustments,
    };
  }

  /**
   * Get current execution config
   */
  getCurrentConfig(): ExecutionConfig {
    if (!this.currentConfig) {
      throw new Error('Strategy selector not initialized');
    }
    return { ...this.currentConfig };
  }

  /**
   * Get current tier
   */
  getCurrentTier(): DeviceTier {
    return this.currentConfig?.tier || 'tier2';
  }

  /**
   * Subscribe to strategy changes
   */
  onStrategyChange(callback: StrategyChangeCallback): () => void {
    this.changeCallbacks.add(callback);
    return () => this.changeCallbacks.delete(callback);
  }

  /**
   * Notify all listeners of strategy change
   */
  private notifyStrategyChange(event: StrategyChangeEvent): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(event);
      } catch (e) {
        console.error('Strategy change callback error:', e);
      }
    }
  }

  /**
   * Force a specific strategy (for testing/debugging)
   */
  forceStrategy(strategy: ExecutionStrategy): void {
    if (!this.currentConfig) return;

    const tierMap: Record<ExecutionStrategy, DeviceTier> = {
      'interpreter-only': 'tier1',
      'selective-jit': 'tier2',
      'full-jit-webgpu': 'tier3',
      'mesh-offload': 'tier4',
    };

    const newTier = tierMap[strategy];
    this.switchToTier(newTier, 'forced');
  }

  /**
   * Check if mesh offload is recommended for a task
   */
  shouldOffloadToMesh(
    estimatedLocalTime: number,
    estimatedDataSize: number,
    availablePeers: number
  ): boolean {
    if (!this.currentConfig?.useMeshOffload) return false;
    if (availablePeers === 0) return false;

    // Estimate mesh time (transfer + compute + return)
    const bandwidth = 10 * 1024 * 1024; // Assume 10 MB/s
    const transferTime = (estimatedDataSize / bandwidth) * 1000; // ms
    const meshTime = transferTime * 2 + estimatedLocalTime * 0.3; // Assume 30% of local time on peer

    // Offload if mesh is faster or local time is too long
    return meshTime < estimatedLocalTime || estimatedLocalTime > 5000;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
      this.performanceCheckInterval = null;
    }
    this.changeCallbacks.clear();
  }
}

// Singleton instance
export const strategySelector = new StrategySelector();

// Convenience exports
export function getExecutionConfig(): ExecutionConfig {
  return strategySelector.getCurrentConfig();
}

export function getContentConfig(contentType: ContentType): ExecutionConfig {
  return strategySelector.getConfigForContent(contentType);
}

export function onStrategyChange(callback: StrategyChangeCallback): () => void {
  return strategySelector.onStrategyChange(callback);
}