/**
 * NachoOS Ultra-High-Performance System
 * 
 * Complete export for the ultra-high-performance temporal synthesis,
 * distributed execution, and rendering systems.
 * 
 * Systems:
 * - Temporal Synthesis (400-1000+ Hz visual output)
 * - Motion Vectors & Reprojection
 * - Prediction & Correction
 * - Input Pipeline (sub-millisecond latency)
 * - Distributed Execution Fabric
 * - Resource Pool Management
 * - Super GPU (intelligent resource reuse)
 * - Temporal Caching
 * - Ultra-Hz UI
 * - Graceful Degradation
 * 
 * This creates the illusion of a flagship discrete GPU appearing locally,
 * running at impossible frame rates, with zero perceived latency.
 */

// Temporal synthesis system
export * from './temporal';

// Input prediction pipeline
export { 
  InputPredictionPipeline,
  type InputPredictionConfig,
  type PredictedInput,
  type LateReprojectionResult 
} from './input/prediction-pipeline';

// Distributed execution
export { 
  ExecutionFabric,
  type Device,
  type DeviceCapabilities,
  type DeviceConnection,
  type Task,
  type TaskResult 
} from './distributed/execution-fabric';

export { 
  ResourcePoolManager,
  type ResourcePool,
  type LoadBalanceStrategy,
  type WorkloadMetrics 
} from './distributed/resource-pool';

// Rendering systems
export { 
  SuperGPU,
  type GPUCapabilities,
  type ResourceUsage 
} from './rendering/super-gpu';

export { 
  TemporalCache,
  FrameBufferCache,
  LightingCache,
  ShadowMapCache,
  ReflectionProbeCache,
  type CacheStats 
} from './rendering/temporal-cache';

// UI system
export { 
  UltraHzUI,
  DynamicIsland,
  type UIElement,
  type UIAnimation 
} from './ui/ultra-hz-ui';

/**
 * Quick Start Factory
 * 
 * Creates a fully-configured temporal synthesis system ready to use.
 */
export async function createUltraHzSystem(
  device: GPUDevice,
  options: {
    targetHz?: number;
    enablePrediction?: boolean;
    enableDegradation?: boolean;
    debugMode?: boolean;
  } = {}
): Promise<any> {
  const { TemporalIntegration } = await import('./temporal/integration');
  
  const system = new TemporalIntegration(device, {
    temporal: {
      authoritativeHz: 60,
      visualHz: options.targetHz || 400,
      synthesisRatio: Math.floor((options.targetHz || 400) / 60),
      predictionFrames: 2,
      correctionBlendFrames: 4
    },
    enablePrediction: options.enablePrediction ?? true,
    enableCorrection: true,
    enableDegradation: options.enableDegradation ?? true,
    debugMode: options.debugMode ?? false
  });

  await system.initialize();
  
  return system;
}

console.log('[NachoOS] Ultra-High-Performance System loaded');
console.log('  Performance = Perceived Continuity');
console.log('  FPS = Photon Update Credibility');
console.log('  Power = Prediction + Temporal Reuse');
