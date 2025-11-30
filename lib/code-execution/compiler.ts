/**
 * Code Compiler - Compiles code to WebAssembly for execution
 * Supports Go, Rust, and Zig compilation via backend service
 */

export interface CompilationResult {
  wasm: ArrayBuffer | null;
  error: string | null;
  warnings: string[];
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export class CodeCompiler {
  /**
   * Compile Go code to WebAssembly
   */
  async compileGo(code: string): Promise<CompilationResult> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/codecompilation/compile/go`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          wasm: null,
          error: error.error || 'Compilation failed',
          warnings: [],
        };
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          wasm: null,
          error: result.error || 'Compilation failed',
          warnings: result.warnings || [],
        };
      }

      // Convert base64 to ArrayBuffer
      const wasmBytes = Uint8Array.from(atob(result.wasmBase64), c => c.charCodeAt(0));
      return {
        wasm: wasmBytes.buffer,
        error: null,
        warnings: result.warnings || [],
      };
    } catch (error: any) {
      return {
        wasm: null,
        error: error.message || 'Failed to connect to compilation service',
        warnings: [],
      };
    }
  }

  /**
   * Compile Rust code to WebAssembly
   */
  async compileRust(code: string, cargoToml?: string): Promise<CompilationResult> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/codecompilation/compile/rust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, config: cargoToml }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          wasm: null,
          error: error.error || 'Compilation failed',
          warnings: [],
        };
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          wasm: null,
          error: result.error || 'Compilation failed',
          warnings: result.warnings || [],
        };
      }

      // Convert base64 to ArrayBuffer
      const wasmBytes = Uint8Array.from(atob(result.wasmBase64), c => c.charCodeAt(0));
      return {
        wasm: wasmBytes.buffer,
        error: null,
        warnings: result.warnings || [],
      };
    } catch (error: any) {
      return {
        wasm: null,
        error: error.message || 'Failed to connect to compilation service',
        warnings: [],
      };
    }
  }

  /**
   * Compile Zig code to WebAssembly
   */
  async compileZig(code: string): Promise<CompilationResult> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/codecompilation/compile/zig`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          wasm: null,
          error: error.error || 'Compilation failed',
          warnings: [],
        };
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          wasm: null,
          error: result.error || 'Compilation failed',
          warnings: result.warnings || [],
        };
      }

      // Convert base64 to ArrayBuffer
      const wasmBytes = Uint8Array.from(atob(result.wasmBase64), c => c.charCodeAt(0));
      return {
        wasm: wasmBytes.buffer,
        error: null,
        warnings: result.warnings || [],
      };
    } catch (error: any) {
      return {
        wasm: null,
        error: error.message || 'Failed to connect to compilation service',
        warnings: [],
      };
    }
  }

  /**
   * Execute compiled WASM module
   */
  async executeWasm(wasm: ArrayBuffer, input?: string): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    try {
      const wasmModule = await WebAssembly.instantiate(wasm);
      const instance = wasmModule.instance;

      // Call the main function if it exists
      const main = instance.exports.main as (() => number) | undefined;
      if (main) {
        const exitCode = main();
        return {
          stdout: '',
          stderr: '',
          exitCode: exitCode || 0,
        };
      }

      return {
        stdout: '',
        stderr: 'No main function found in WASM module',
        exitCode: 1,
      };
    } catch (error: any) {
      return {
        stdout: '',
        stderr: error.message || 'WASM execution failed',
        exitCode: 1,
      };
    }
  }
}

export const codeCompiler = new CodeCompiler();

