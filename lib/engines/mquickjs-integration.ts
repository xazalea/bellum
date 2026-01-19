/**
 * mquickjs Integration for VM Emulation
 * Ultra-lightweight JavaScript engine by Fabrice Bellard
 * Perfect for embedded systems and VM contexts
 * 
 * @see https://github.com/bellard/mquickjs
 */

export interface MQuickJSConfig {
  memorySize: number; // Memory buffer size in bytes
  enableStdlib: boolean; // Enable standard library
  enableMath: boolean; // Enable math functions
  debug: boolean; // Debug mode
}

export interface MQuickJSContext {
  eval(code: string): any;
  evalFile(path: string): any;
  destroy(): void;
  getMemoryUsage(): { used: number; total: number };
}

/**
 * Load mquickjs WASM module
 */
let mqjsModule: any = null;
let mqjsLoaded = false;

export async function loadMQuickJS(): Promise<boolean> {
  if (mqjsLoaded && mqjsModule) return true;
  
  try {
    // Load mquickjs WASM
    const response = await fetch('/wasm/mquickjs.wasm');
    const wasmBytes = await response.arrayBuffer();
    
    const imports = {
      env: {
        // Minimal imports - mquickjs has almost no dependencies
        abort: () => console.error('mquickjs abort'),
      },
    };
    
    const { instance } = await WebAssembly.instantiate(wasmBytes, imports);
    mqjsModule = instance.exports;
    mqjsLoaded = true;
    
    console.log('✅ mquickjs loaded for VM emulation');
    return true;
  } catch (error) {
    console.warn('mquickjs load failed:', error);
    return false;
  }
}

/**
 * Create mquickjs context for VM execution
 */
export async function createMQuickJSContext(
  config: Partial<MQuickJSConfig> = {}
): Promise<MQuickJSContext> {
  await loadMQuickJS();
  
  const {
    memorySize = 8192, // 8KB default (very small!)
    enableStdlib = true,
    enableMath = true,
    debug = false,
  } = config;
  
  if (!mqjsModule) {
    throw new Error('mquickjs not loaded');
  }
  
  // Allocate memory buffer for the context
  const memBuffer = new Uint8Array(memorySize);
  
  // Create context (simplified API - actual WASM binding would be more complex)
  const contextPtr = mqjsModule.JS_NewContext?.(
    memBuffer.byteOffset,
    memBuffer.byteLength,
    enableStdlib ? 1 : 0
  );
  
  if (!contextPtr) {
    throw new Error('Failed to create mquickjs context');
  }
  
  const context: MQuickJSContext = {
    eval(code: string): any {
      if (!mqjsModule) throw new Error('mquickjs not loaded');
      
      try {
        // Encode string to UTF-8
        const encoder = new TextEncoder();
        const codeBytes = encoder.encode(code);
        
        // Allocate in WASM memory and evaluate
        const resultPtr = mqjsModule.JS_Eval?.(
          contextPtr,
          codeBytes,
          codeBytes.length,
          '<eval>',
          0
        );
        
        if (!resultPtr) {
          throw new Error('Evaluation failed');
        }
        
        // Convert result back to JS (simplified)
        return mqjsModule.JS_GetValue?.(resultPtr);
      } catch (error) {
        console.error('mquickjs eval error:', error);
        throw error;
      }
    },
    
    evalFile(path: string): any {
      // Load file and evaluate
      return this.eval(`require('${path}')`);
    },
    
    destroy(): void {
      if (mqjsModule && contextPtr) {
        mqjsModule.JS_FreeContext?.(contextPtr);
      }
    },
    
    getMemoryUsage(): { used: number; total: number } {
      if (!mqjsModule || !contextPtr) {
        return { used: 0, total: memorySize };
      }
      
      const stats = mqjsModule.JS_GetMemoryUsage?.(contextPtr);
      return {
        used: stats?.used || 0,
        total: memorySize,
      };
    },
  };
  
  return context;
}

/**
 * Quick execution helper for one-off scripts
 */
export async function executeMQuickJS(
  code: string,
  config?: Partial<MQuickJSConfig>
): Promise<any> {
  const ctx = await createMQuickJSContext(config);
  
  try {
    return ctx.eval(code);
  } finally {
    ctx.destroy();
  }
}

/**
 * Performance comparison: mquickjs vs native eval
 */
export async function benchmarkMQuickJS(): Promise<{
  mqjsTime: number;
  nativeTime: number;
  memoryUsage: number;
}> {
  const testCode = `
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      sum += i;
    }
    sum;
  `;
  
  // Native eval benchmark
  const nativeStart = performance.now();
  eval(testCode);
  const nativeTime = performance.now() - nativeStart;
  
  // mquickjs benchmark
  const ctx = await createMQuickJSContext();
  const mqjsStart = performance.now();
  ctx.eval(testCode);
  const mqjsTime = performance.now() - mqjsStart;
  const memoryUsage = ctx.getMemoryUsage().used;
  ctx.destroy();
  
  console.log(`mquickjs: ${mqjsTime.toFixed(2)}ms, ${memoryUsage} bytes`);
  console.log(`Native: ${nativeTime.toFixed(2)}ms`);
  
  return { mqjsTime, nativeTime, memoryUsage };
}

/**
 * Use mquickjs for VM script execution
 */
export class VMScriptEngine {
  private ctx: MQuickJSContext | null = null;
  
  async initialize(memorySize: number = 32768): Promise<void> {
    this.ctx = await createMQuickJSContext({ memorySize });
  }
  
  execute(script: string): any {
    if (!this.ctx) {
      throw new Error('Engine not initialized');
    }
    return this.ctx.eval(script);
  }
  
  getMemoryUsage(): { used: number; total: number } {
    if (!this.ctx) {
      return { used: 0, total: 0 };
    }
    return this.ctx.getMemoryUsage();
  }
  
  reset(): void {
    if (this.ctx) {
      this.ctx.destroy();
      this.ctx = null;
    }
  }
  
  destroy(): void {
    this.reset();
  }
}

/**
 * Global VM script engine singleton
 */
let globalVMEngine: VMScriptEngine | null = null;

export function getVMScriptEngine(): VMScriptEngine {
  if (!globalVMEngine) {
    globalVMEngine = new VMScriptEngine();
  }
  return globalVMEngine;
}
