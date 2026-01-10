/**
 * Ultra-High-Performance Temporal Synthesis System
 * 
 * Main export file for the temporal synthesis system.
 * 
 * This system achieves 400-1000+ Hz equivalent visual output through:
 * - Four-clock temporal model (Authoritative, Visual, Prediction, Correction)
 * - Motion vector-driven frame synthesis
 * - Depth-aware reprojection
 * - Input prediction and late reprojection
 * - Invisible error correction
 * - Graceful degradation that preserves smoothness
 * 
 * Performance = Perceived Continuity
 * FPS = Photon Update Credibility
 * Power = Prediction + Temporal Reuse
 * 
 * "This should not be possible — yet somehow it is."
 */

// Core temporal system
export { 
  TemporalSynthesisEngine, 
  TemporalClockSystem,
  type TemporalConfig,
  type Frame 
} from './temporal-synthesis';

// Motion vectors
export { 
  MotionVectorGenerator,
  type Transform,
  type Camera,
  type MotionVectorData 
} from './motion-vectors';

// Frame reprojection
export { 
  FrameReprojection,
  type ReprojectionConfig,
  type ReprojectedFrame 
} from './frame-reprojection';

// Prediction engine
export { 
  PredictionEngine,
  type InputState,
  type PredictionResult,
  type PhysicsState 
} from './prediction-engine';

// Correction engine
export { 
  CorrectionEngine,
  type CorrectionConfig,
  type CorrectionRecord 
} from './correction-engine';

// Degradation manager
export { 
  DegradationManager,
  type PerformanceMetrics,
  type DegradationLevel,
  type DegradationConfig 
} from './degradation-manager';

// Integration layer
export { 
  TemporalIntegration,
  type IntegrationConfig,
  type EmulatorFrame 
} from './integration';

console.log('[Temporal] Module exports loaded');
