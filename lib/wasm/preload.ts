/**
 * WASM Module Preloader
 * Preloads all WASM modules in parallel for faster initialization
 */

import { preloadWasmModules, isWasmSupported } from './loader';
import { workerManager } from './worker-manager';

const WASM_MODULES = [
  '/wasm/compression.wasm',
  '/wasm/fingerprint.wasm',
  '/wasm/animation.wasm',
  '/wasm/game-parser.wasm',
  '/wasm/storage.wasm',
];

let preloaded = false;

/**
 * Preload all WASM modules
 */
export async function preloadWasm(): Promise<void> {
  if (preloaded) return;
  
  if (!isWasmSupported()) {
    console.warn('WebAssembly not supported, using JavaScript fallbacks');
    return;
  }
  
  console.log('🚀 Preloading WASM modules...');
  const startTime = performance.now();
  
  try {
    // Preload WASM modules in parallel
    await preloadWasmModules(WASM_MODULES);
    
    // Initialize worker pool
    await workerManager.initialize();
    
    const loadTime = performance.now() - startTime;
    console.log(`✅ WASM modules preloaded in ${loadTime.toFixed(2)}ms`);
    
    preloaded = true;
  } catch (error) {
    console.error('WASM preload failed:', error);
  }
}

/**
 * Check if WASM is preloaded
 */
export function isPreloaded(): boolean {
  return preloaded;
}

// Auto-preload on idle (non-blocking)
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadWasm();
    }, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      preloadWasm();
    }, 1000);
  }
}
