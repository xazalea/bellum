/**
 * WASM Module Index
 * Central export for all WASM functionality
 */

// Core loader
export * from './loader';

// Module wrappers
export * from './compression';
export * from './fingerprint';
export * from './animation-engine';
export * from './game-parser';
export * from './storage';

// Worker management
export * from './compression-pool';
export * from './worker-manager';

// VM optimization
export * from './vm-config';

// Utilities
export * from './preload';
export * from './benchmark';

// Re-export commonly used types
export type { CompressionAlgorithm } from './compression';
export type { AnimalState, ParticleState } from './animation-engine';
export type { GameInfo } from './game-parser';
export type { BenchmarkResult, BenchmarkSuite } from './benchmark';
