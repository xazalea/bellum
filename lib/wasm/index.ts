/**
 * WASM Module Index
 * Central export for all WASM functionality
 */

// Core loader
export * from './loader';

// Module wrappers - export everything except isUsingWasm to avoid conflicts
export {
  CompressionAlgorithm,
  initCompression,
  compress,
  decompress,
  compressBlob,
  decompressBlob,
  getCompressionRatio,
  estimateCompressedSize,
} from './compression';
export { isUsingWasm as isUsingWasmCompression } from './compression';

export {
  initFingerprint,
  hashSHA256,
  hashCombined,
  bytesToHex,
  hashCanvasData,
  hashAudioData,
  generateFingerprintId,
} from './fingerprint';
export { isUsingWasm as isUsingWasmFingerprint } from './fingerprint';

export {
  initAnimationEngine,
  initAnimal,
  updateAllAnimals,
  getAnimalPosition,
  addParticle,
  updateParticles,
  getParticleCount,
  getParticlePosition,
  clearParticles,
  getAnimalCount,
  clearAnimals,
  checkCollision,
  distance,
  lerp,
} from './animation-engine';
export type { AnimalState, ParticleState } from './animation-engine';
export { isUsingWasm as isUsingWasmAnimation } from './animation-engine';

export {
  initGameParser,
  parseGameXML,
  getGameCount,
  getGames,
  searchGames,
  filterByCategory,
} from './game-parser';
export type { GameInfo } from './game-parser';
export { isUsingWasm as isUsingWasmGameParser } from './game-parser';

export {
  Chunker,
  hashChunk,
  hashChunksBatch,
  contentAddress,
  verifyChunk,
} from './storage';
export { isUsingWasm as isUsingWasmStorage } from './storage';

// Worker management
export * from './compression-pool';
export * from './worker-manager';

// VM optimization
export * from './vm-config';

// Utilities
export * from './preload';
export * from './benchmark';

// Re-export commonly used types (CompressionAlgorithm, AnimalState, ParticleState, GameInfo already exported above)
export type { BenchmarkResult, BenchmarkSuite } from './benchmark';
