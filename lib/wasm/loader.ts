/**
 * Universal WASM Module Loader
 * Handles loading, caching, and fallback logic for all WASM modules
 */

export type WasmModule = any; // WebAssembly.Module or loaded instance

interface LoadedModule {
  module: WasmModule;
  instance?: any;
  timestamp: number;
}

const moduleCache = new Map<string, LoadedModule>();
const loadingPromises = new Map<string, Promise<WasmModule>>();

export interface WasmLoaderOptions {
  wasmPath: string;
  fallback?: () => any;
  timeout?: number; // ms
  cache?: boolean;
}

/**
 * Load a WASM module with caching and fallback support
 */
export async function loadWasmModule(options: WasmLoaderOptions): Promise<WasmModule | null> {
  const { wasmPath, fallback, timeout = 5000, cache = true } = options;

  // Check cache first
  if (cache && moduleCache.has(wasmPath)) {
    const cached = moduleCache.get(wasmPath)!;
    // Cache valid for 5 minutes
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.module;
    }
    moduleCache.delete(wasmPath);
  }

  // Check if already loading
  if (loadingPromises.has(wasmPath)) {
    return loadingPromises.get(wasmPath)!;
  }

  // Start loading
  const loadPromise = (async () => {
    try {
      // Load with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(wasmPath, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.statusText}`);
      }

      const wasmBytes = await response.arrayBuffer();
      
      // Instantiate WASM module
      const module = await WebAssembly.compile(wasmBytes);
      
      // Cache the module
      if (cache) {
        moduleCache.set(wasmPath, {
          module,
          timestamp: Date.now(),
        });
      }

      return module;
    } catch (error) {
      console.warn(`WASM load failed (${wasmPath}):`, error);
      
      // Try fallback
      if (fallback) {
        console.log(`Using fallback for ${wasmPath}`);
        return fallback();
      }
      
      return null;
    } finally {
      loadingPromises.delete(wasmPath);
    }
  })();

  loadingPromises.set(wasmPath, loadPromise);
  return loadPromise;
}

/**
 * Instantiate a compiled WASM module with imports
 */
export async function instantiateWasm(
  module: WasmModule,
  imports: WebAssembly.Imports = {}
): Promise<WebAssembly.Instance> {
  return await WebAssembly.instantiate(module, imports);
}

/**
 * Load and instantiate a WASM module in one call
 */
export async function loadAndInstantiate(
  wasmPath: string,
  imports: WebAssembly.Imports = {},
  fallback?: () => any
): Promise<any> {
  const module = await loadWasmModule({ wasmPath, fallback });
  
  if (!module) {
    return fallback ? fallback() : null;
  }

  const instance = await instantiateWasm(module, imports);
  return instance.exports;
}

/**
 * Preload WASM modules in parallel (for faster init)
 */
export async function preloadWasmModules(paths: string[]): Promise<void> {
  const promises = paths.map(path => 
    loadWasmModule({ wasmPath: path, cache: true })
      .catch(err => console.warn(`Preload failed for ${path}:`, err))
  );
  
  await Promise.all(promises);
  console.log(`Preloaded ${paths.length} WASM modules`);
}

/**
 * Check if WebAssembly is supported
 */
export function isWasmSupported(): boolean {
  try {
    if (typeof WebAssembly === 'object'
        && typeof WebAssembly.instantiate === 'function'
        && typeof WebAssembly.compile === 'function') {
      // Test with a minimal WASM module
      const module = new WebAssembly.Module(
        new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
      );
      return module instanceof WebAssembly.Module;
    }
  } catch (e) {
    // WASM not supported
  }
  return false;
}

/**
 * Get WASM module cache stats
 */
export function getCacheStats() {
  return {
    cachedModules: moduleCache.size,
    loadingModules: loadingPromises.size,
    totalMemory: Array.from(moduleCache.values())
      .reduce((sum, mod) => sum + (mod.instance?.memory?.buffer?.byteLength || 0), 0),
  };
}

/**
 * Clear WASM module cache
 */
export function clearCache() {
  moduleCache.clear();
  console.log('WASM module cache cleared');
}
