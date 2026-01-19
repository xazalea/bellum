/**
 * JavaScript Engine Integration
 * Combines mquickjs (ultra-lightweight VM execution) and ForesightJS (intelligent prefetching)
 */

export * from './mquickjs-integration';
export * from './foresight-integration';

// Re-export commonly used functions
export { 
  createMQuickJSContext,
  executeMQuickJS,
  getVMScriptEngine,
  type MQuickJSConfig,
  type MQuickJSContext,
} from './mquickjs-integration';

export {
  foresightManager,
  prefetchWasmModules,
  prefetchGameAssets,
  prefetchVMResources,
  type ForesightConfig,
  type PrefetchTarget,
} from './foresight-integration';
