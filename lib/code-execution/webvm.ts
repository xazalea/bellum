/**
 * WebVM - Local OS-Level Environment in the Browser
 * Provides a Linux environment for running code in multiple languages
 */

import { V86Loader, V86Config } from '../emulators/v86-loader';

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

export interface LanguageExecutor {
  name: string;
  execute(code: string, input?: string): Promise<CodeExecutionResult>;
  isAvailable(): boolean;
}

export class WebVM {
  private emulator: any = null;
  private isInitialized = false;
  private isRunning = false;
  private container: HTMLElement | null = null;
  private fileSystem: Map<string, string> = new Map();
  private executors: Map<string, LanguageExecutor> = new Map();

  constructor() {
    this.initializeExecutors();
  }

  /**
   * Initialize language executors
   */
  private initializeExecutors(): void {
    // Lua executor (Fengari)
    this.executors.set('lua', new LuaExecutor());

    // Python executor (Pyodide)
    this.executors.set('python', new PythonExecutor());

    // Go executor (WASM)
    this.executors.set('go', new GoExecutor());

    // Rust executor (WASM)
    this.executors.set('rust', new RustExecutor());

    // Zig executor (WASM)
    this.executors.set('zig', new ZigExecutor());
  }

  /**
   * Initialize the WebVM Linux environment
   */
  async initialize(container: HTMLElement): Promise<void> {
    if (this.isInitialized) return;

    this.container = container;

    // Load v86 library
    await V86Loader.load();

    // Use a minimal Linux distribution for code execution
    // This could be Alpine Linux or a custom minimal distro
    const v86Config: V86Config = {
      wasm_path: '/v86/v86.wasm',
      memory_size: 256 * 1024 * 1024, // 256MB for code execution
      vga_memory_size: 8 * 1024 * 1024,
      screen_container: container,
      bios: { url: '/v86/bios/seabios.bin' },
      vga_bios: { url: '/v86/bios/vgabios.bin' },
      autostart: false,
      boot_order: 0x1, // Boot from CD-ROM
      // Use a minimal Linux ISO or pre-built image
      cdrom: {
        url: '/images/linux-minimal.iso', // Placeholder - would need actual minimal Linux ISO
      },
    };

    this.emulator = V86Loader.create(v86Config);

    this.emulator.add_listener('emulator-ready', () => {
      this.isInitialized = true;
      this.setupEnvironment();
    });

    this.isInitialized = true;
  }

  /**
   * Setup the execution environment
   */
  private async setupEnvironment(): Promise<void> {
    // Wait for Linux to boot, then setup compilers/interpreters
    // This would involve sending commands to the VM
    await this.waitForBoot();

    // Install language runtimes (if not already in the image)
    // This is a placeholder - actual implementation would use VM commands
    console.log('WebVM environment ready');
  }

  /**
   * Wait for Linux to finish booting
   */
  private async waitForBoot(): Promise<void> {
    // Poll for boot completion
    return new Promise((resolve) => {
      const checkBoot = () => {
        // In a real implementation, we'd check for a specific prompt or file
        // For now, just wait a bit
        setTimeout(() => {
          resolve();
        }, 3000);
      };
      checkBoot();
    });
  }

  /**
   * Execute code in a specific language
   */
  async executeCode(
    language: string,
    code: string,
    input?: string
  ): Promise<CodeExecutionResult> {
    const executor = this.executors.get(language.toLowerCase());
    if (!executor) {
      throw new Error(`Language ${language} is not supported`);
    }

    if (!executor.isAvailable()) {
      throw new Error(`Language ${language} executor is not available`);
    }

    const startTime = performance.now();
    const result = await executor.execute(code, input);
    result.executionTime = performance.now() - startTime;

    return result;
  }

  /**
   * Load compiled WASM for a language executor
   */
  async loadWasmForLanguage(language: string, wasm: ArrayBuffer): Promise<void> {
    const executor = this.executors.get(language.toLowerCase());
    if (!executor) {
      throw new Error(`Language ${language} is not supported`);
    }

    // Check if executor has loadWasm method
    if ('loadWasm' in executor && typeof (executor as any).loadWasm === 'function') {
      await (executor as any).loadWasm(wasm);
    } else {
      throw new Error(`Language ${language} does not support WASM loading`);
    }
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): string[] {
    return Array.from(this.executors.keys()).filter((lang) =>
      this.executors.get(lang)?.isAvailable()
    );
  }

  /**
   * Start the WebVM
   */
  async start(): Promise<void> {
    if (!this.container) {
      throw new Error('WebVM not initialized. Call initialize() first.');
    }

    if (this.isRunning) return;

    if (!this.isInitialized) {
      await this.initialize(this.container);
    }

    // Start the emulator
    if (this.emulator && typeof this.emulator.boot === 'function') {
      // Boot would be handled by v86
    }

    this.isRunning = true;
  }

  /**
   * Stop the WebVM
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    // Cleanup would happen here
  }

  /**
   * Save file to virtual filesystem
   */
  saveFile(path: string, content: string): void {
    this.fileSystem.set(path, content);
  }

  /**
   * Read file from virtual filesystem
   */
  readFile(path: string): string | null {
    return this.fileSystem.get(path) || null;
  }

  /**
   * List files in directory
   */
  listFiles(directory: string): string[] {
    return Array.from(this.fileSystem.keys()).filter((path) =>
      path.startsWith(directory)
    );
  }
}

/**
 * Lua Executor using Fengari (Lua VM in JavaScript)
 */
class LuaExecutor implements LanguageExecutor {
  name = 'lua';
  private fengari: any = null;

  async execute(code: string, input?: string): Promise<CodeExecutionResult> {
    if (!this.isAvailable()) {
      throw new Error('Fengari not available');
    }

    try {
      // Load Fengari dynamically
      if (!this.fengari) {
        try {
          const fengariModule = await import('fengari');
          this.fengari = fengariModule;
        } catch (error) {
          throw new Error('Failed to load Fengari. Please install: npm install fengari');
        }
      }

      const lua = this.fengari.lua;
      const lauxlib = this.fengari.lauxlib;
      const lualib = this.fengari.lualib;

      const L = lauxlib.luaL_newstate();
      lualib.luaL_openlibs(L);

      // Capture stdout
      let stdout = '';
      let stderr = '';

      // Override print to capture output
      lauxlib.lua_register(L, 'print', (L: any) => {
        const n = lua.lua_gettop(L);
        const parts: string[] = [];
        for (let i = 1; i <= n; i++) {
          if (lua.lua_isstring(L, i)) {
            parts.push(lua.lua_tostring(L, i));
          } else {
            parts.push(String(lua.lua_topointer(L, i)));
          }
        }
        stdout += parts.join('\t') + '\n';
        return 0;
      });

      // Execute code
      const result = lauxlib.luaL_dostring(L, code);

      if (result !== 0) {
        const error = lauxlib.lua_tostring(L, -1);
        stderr = error || 'Unknown error';
      }

      lauxlib.lua_close(L);

      return {
        stdout: stdout.trim(),
        stderr,
        exitCode: result === 0 ? 0 : 1,
        executionTime: 0,
      };
    } catch (error: any) {
      return {
        stdout: '',
        stderr: error.message || 'Execution error',
        exitCode: 1,
        executionTime: 0,
      };
    }
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined';
  }
}

/**
 * Python Executor using Pyodide
 */
class PythonExecutor implements LanguageExecutor {
  name = 'python';
  private pyodide: any = null;
  private loadingPromise: Promise<any> | null = null;

  async execute(code: string, input?: string): Promise<CodeExecutionResult> {
    try {
      // Load Pyodide (only once)
      if (!this.pyodide) {
        if (!this.loadingPromise) {
          this.loadingPromise = this.loadPyodide();
        }
        this.pyodide = await this.loadingPromise;
      }

      // Capture stdout/stderr
      let stdout = '';
      let stderr = '';

      this.pyodide.setStdout({
        batched: (text: string) => {
          stdout += text;
        },
      });

      this.pyodide.setStderr({
        batched: (text: string) => {
          stderr += text;
        },
      });

      // Execute Python code
      try {
        if (input) {
          // Set input if provided
          this.pyodide.runPython(`import sys; sys.stdin = open('input.txt', 'r')`);
          // Would need to write input to a file in Pyodide's filesystem
        }
        
        this.pyodide.runPython(code);
        return {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
          executionTime: 0,
        };
      } catch (error: any) {
        return {
          stdout: stdout.trim(),
          stderr: (stderr || error.message || String(error)).trim(),
          exitCode: 1,
          executionTime: 0,
        };
      }
    } catch (error: any) {
      return {
        stdout: '',
        stderr: error.message || 'Failed to load Pyodide',
        exitCode: 1,
        executionTime: 0,
      };
    }
  }

  private async loadPyodide(): Promise<any> {
    // @ts-ignore - Pyodide loads globally
    if (typeof window !== 'undefined' && (window as any).loadPyodide) {
      return await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
      });
    }

    // Wait for script to load
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window not available'));
        return;
      }

      // Check if already loaded
      if ((window as any).loadPyodide) {
        resolve((window as any).loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
        }));
        return;
      }

      // Load script
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
      script.onload = async () => {
        try {
          // @ts-ignore
          const pyodide = await loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
          });
          resolve(pyodide);
        } catch (error) {
          reject(error);
        }
      };
      script.onerror = () => reject(new Error('Failed to load Pyodide script'));
      document.head.appendChild(script);
    });
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined';
  }
}

/**
 * Go Executor using WebAssembly
 */
class GoExecutor implements LanguageExecutor {
  name = 'go';
  private wasmModule: WebAssembly.Module | null = null;
  private wasmInstance: WebAssembly.Instance | null = null;

  async execute(code: string, input?: string): Promise<CodeExecutionResult> {
    // Go code must be compiled to WASM first
    // This executor expects pre-compiled WASM
    if (!this.wasmInstance) {
      return {
        stdout: '',
        stderr: 'Go code must be compiled to WebAssembly first. Use the compile button.',
        exitCode: 1,
        executionTime: 0,
      };
    }

    try {
      // Execute the WASM module
      const main = this.wasmInstance.exports.main as (() => number) | undefined;
      if (main) {
        const exitCode = main();
        return {
          stdout: '',
          stderr: '',
          exitCode: exitCode || 0,
          executionTime: 0,
        };
      }

      return {
        stdout: '',
        stderr: 'No main function found in WASM module',
        exitCode: 1,
        executionTime: 0,
      };
    } catch (error: any) {
      return {
        stdout: '',
        stderr: error.message || 'WASM execution failed',
        exitCode: 1,
        executionTime: 0,
      };
    }
  }

  async loadWasm(wasm: ArrayBuffer): Promise<void> {
    try {
      this.wasmModule = await WebAssembly.compile(wasm);
      this.wasmInstance = await WebAssembly.instantiate(this.wasmModule);
    } catch (error: any) {
      throw new Error(`Failed to load WASM: ${error.message}`);
    }
  }

  isAvailable(): boolean {
    return typeof WebAssembly !== 'undefined';
  }
}

/**
 * Rust Executor using WebAssembly
 */
class RustExecutor implements LanguageExecutor {
  name = 'rust';
  private wasmModule: WebAssembly.Module | null = null;
  private wasmInstance: WebAssembly.Instance | null = null;

  async execute(code: string, input?: string): Promise<CodeExecutionResult> {
    // Rust code must be compiled to WASM first
    if (!this.wasmInstance) {
      return {
        stdout: '',
        stderr: 'Rust code must be compiled to WebAssembly first. Use the compile button.',
        exitCode: 1,
        executionTime: 0,
      };
    }

    try {
      // Execute the WASM module
      const main = this.wasmInstance.exports.main as (() => number) | undefined;
      if (main) {
        const exitCode = main();
        return {
          stdout: '',
          stderr: '',
          exitCode: exitCode || 0,
          executionTime: 0,
        };
      }

      return {
        stdout: '',
        stderr: 'No main function found in WASM module',
        exitCode: 1,
        executionTime: 0,
      };
    } catch (error: any) {
      return {
        stdout: '',
        stderr: error.message || 'WASM execution failed',
        exitCode: 1,
        executionTime: 0,
      };
    }
  }

  async loadWasm(wasm: ArrayBuffer): Promise<void> {
    try {
      this.wasmModule = await WebAssembly.compile(wasm);
      this.wasmInstance = await WebAssembly.instantiate(this.wasmModule);
    } catch (error: any) {
      throw new Error(`Failed to load WASM: ${error.message}`);
    }
  }

  isAvailable(): boolean {
    return typeof WebAssembly !== 'undefined';
  }
}

/**
 * Zig Executor using WebAssembly
 */
class ZigExecutor implements LanguageExecutor {
  name = 'zig';
  private wasmModule: WebAssembly.Module | null = null;
  private wasmInstance: WebAssembly.Instance | null = null;

  async execute(code: string, input?: string): Promise<CodeExecutionResult> {
    // Zig code must be compiled to WASM first
    if (!this.wasmInstance) {
      return {
        stdout: '',
        stderr: 'Zig code must be compiled to WebAssembly first. Use the compile button.',
        exitCode: 1,
        executionTime: 0,
      };
    }

    try {
      // Execute the WASM module
      const main = this.wasmInstance.exports.main as (() => number) | undefined;
      if (main) {
        const exitCode = main();
        return {
          stdout: '',
          stderr: '',
          exitCode: exitCode || 0,
          executionTime: 0,
        };
      }

      return {
        stdout: '',
        stderr: 'No main function found in WASM module',
        exitCode: 1,
        executionTime: 0,
      };
    } catch (error: any) {
      return {
        stdout: '',
        stderr: error.message || 'WASM execution failed',
        exitCode: 1,
        executionTime: 0,
      };
    }
  }

  async loadWasm(wasm: ArrayBuffer): Promise<void> {
    try {
      this.wasmModule = await WebAssembly.compile(wasm);
      this.wasmInstance = await WebAssembly.instantiate(this.wasmModule);
    } catch (error: any) {
      throw new Error(`Failed to load WASM: ${error.message}`);
    }
  }

  isAvailable(): boolean {
    return typeof WebAssembly !== 'undefined';
  }
}

// Global WebVM instance
export const webVM = typeof window !== 'undefined' ? new WebVM() : null;

