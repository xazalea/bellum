/**
 * Web Worker Sandbox for APK/EXE Execution
 * Provides isolated execution environment with resource limits
 */

export interface SandboxConfig {
  maxMemoryMB: number;
  maxCpuTimeMs: number;
  maxNetworkRequests: number;
  allowedOrigins: string[];
  timeoutMs: number;
  enableDebugging: boolean;
}

export interface SandboxState {
  id: string;
  status: 'initializing' | 'running' | 'paused' | 'terminated' | 'error';
  memoryUsed: number;
  cpuTimeUsed: number;
  networkRequests: number;
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface SandboxMessage {
  type: 'ready' | 'result' | 'error' | 'log' | 'memory' | 'network';
  payload: unknown;
}

type SandboxCallback = (event: string, data: any) => void;

const DEFAULT_CONFIG: SandboxConfig = {
  maxMemoryMB: 256,
  maxCpuTimeMs: 30000,
  maxNetworkRequests: 100,
  allowedOrigins: [],
  timeoutMs: 60000,
  enableDebugging: false,
};

// Worker script that runs inside the sandbox
const SANDBOX_WORKER_CODE = `
let config = null;
let memoryUsed = 0;
let cpuTimeUsed = 0;
let networkRequests = 0;
let startTime = 0;

// Listen for messages from main thread
self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'init':
      config = payload.config;
      startTime = Date.now();
      self.postMessage({ type: 'ready', payload: { id: payload.id } });
      break;
      
    case 'execute':
      executeCode(payload);
      break;
      
    case 'terminate':
      self.postMessage({ type: 'terminated', payload: {} });
      self.close();
      break;
  }
};

async function executeCode(code) {
  try {
    // Create isolated function
    const fn = new Function('sandbox', code);
    
    // Execute with timeout
    const result = await Promise.race([
      fn(createSandboxAPI()),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), config.timeoutMs)
      )
    ]);
    
    self.postMessage({ type: 'result', payload: result });
  } catch (error) {
    self.postMessage({ type: 'error', payload: error.message });
  }
}

function createSandboxAPI() {
  return {
    log: (...args) => {
      self.postMessage({ type: 'log', payload: args });
    },
    fetch: async (url, options) => {
      networkRequests++;
      if (networkRequests > config.maxNetworkRequests) {
        throw new Error('Network request limit exceeded');
      }
      
      // Check allowed origins
      const urlObj = new URL(url);
      if (config.allowedOrigins.length > 0 && 
          !config.allowedOrigins.includes(urlObj.origin)) {
        throw new Error('Origin not allowed: ' + urlObj.origin);
      }
      
      const response = await fetch(url, options);
      self.postMessage({ type: 'network', payload: { url, method: options?.method || 'GET' } });
      return response;
    },
    memory: {
      allocate: (size) => {
        memoryUsed += size;
        if (memoryUsed > config.maxMemoryMB * 1024 * 1024) {
          throw new Error('Memory limit exceeded');
        }
        return new ArrayBuffer(size);
      },
      used: () => memoryUsed,
      limit: () => config.maxMemoryMB * 1024 * 1024,
    },
    cpu: {
      used: () => cpuTimeUsed,
      limit: () => config.maxCpuTimeMs,
    },
  };
}

// Memory monitoring
setInterval(() => {
  if (typeof performance !== 'undefined' && performance.memory) {
    memoryUsed = performance.memory.usedJSHeapSize;
    self.postMessage({ type: 'memory', payload: memoryUsed });
  }
}, 1000);
`;

/**
 * Sandbox Manager
 */
class SandboxManager {
  private config: SandboxConfig;
  private sandboxes: Map<string, SandboxState> = new Map();
  private workers: Map<string, Worker> = new Map();
  private callbacks: Set<SandboxCallback> = new Set();
  private sandboxIdCounter = 0;

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a new sandbox
   */
  async createSandbox(customConfig?: Partial<SandboxConfig>): Promise<string> {
    const id = `sandbox_${++this.sandboxIdCounter}`;
    const config = { ...this.config, ...customConfig };

    const state: SandboxState = {
      id,
      status: 'initializing',
      memoryUsed: 0,
      cpuTimeUsed: 0,
      networkRequests: 0,
      startTime: Date.now(),
    };

    this.sandboxes.set(id, state);

    // Create worker
    const blob = new Blob([SANDBOX_WORKER_CODE], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    // Set up message handler
    worker.onmessage = (e) => {
      this.handleWorkerMessage(id, e.data);
    };

    worker.onerror = (e) => {
      this.handleWorkerError(id, e);
    };

    this.workers.set(id, worker);

    // Initialize worker
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sandbox initialization timeout'));
      }, 5000);

      const handler = (event: string, data: any) => {
        if (event === 'ready' && data.id === id) {
          clearTimeout(timeout);
          state.status = 'running';
          this.callbacks.delete(handler);
          resolve(id);
        }
      };

      this.callbacks.add(handler);
      worker.postMessage({ type: 'init', payload: { id, config } });
    });
  }

  /**
   * Execute code in sandbox
   */
  async execute(sandboxId: string, code: string): Promise<unknown> {
    const worker = this.workers.get(sandboxId);
    const state = this.sandboxes.get(sandboxId);

    if (!worker || !state) {
      throw new Error('Sandbox not found');
    }

    if (state.status !== 'running') {
      throw new Error(`Sandbox is not running: ${state.status}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Execution timeout'));
        this.terminateSandbox(sandboxId);
      }, this.config.timeoutMs);

      const handler = (event: string, data: any) => {
        if (data.sandboxId !== sandboxId) return;

        if (event === 'result') {
          clearTimeout(timeout);
          this.callbacks.delete(handler);
          resolve(data.payload);
        } else if (event === 'error') {
          clearTimeout(timeout);
          this.callbacks.delete(handler);
          reject(new Error(data.payload));
        }
      };

      this.callbacks.add(handler);
      worker.postMessage({ type: 'execute', payload: code });
    });
  }

  /**
   * Terminate a sandbox
   */
  terminateSandbox(sandboxId: string): void {
    const worker = this.workers.get(sandboxId);
    const state = this.sandboxes.get(sandboxId);

    if (worker) {
      worker.terminate();
      this.workers.delete(sandboxId);
    }

    if (state) {
      state.status = 'terminated';
      state.endTime = Date.now();
      this.notify('terminated', { sandboxId, state });
    }
  }

  /**
   * Get sandbox state
   */
  getState(sandboxId: string): SandboxState | undefined {
    return this.sandboxes.get(sandboxId);
  }

  /**
   * Get all sandbox states
   */
  getAllStates(): SandboxState[] {
    return Array.from(this.sandboxes.values());
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(sandboxId: string, message: SandboxMessage): void {
    const state = this.sandboxes.get(sandboxId);
    if (!state) return;

    switch (message.type) {
      case 'memory':
        state.memoryUsed = message.payload as number;
        this.checkResourceLimits(sandboxId);
        break;
      case 'network':
        state.networkRequests++;
        break;
      case 'log':
        this.notify('log', { sandboxId, message: message.payload });
        break;
      case 'result':
        this.notify('result', { sandboxId, result: message.payload });
        break;
      case 'error':
        state.status = 'error';
        state.error = message.payload as string;
        this.notify('error', { sandboxId, error: message.payload });
        break;
    }
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(sandboxId: string, error: ErrorEvent): void {
    const state = this.sandboxes.get(sandboxId);
    if (state) {
      state.status = 'error';
      state.error = error.message;
    }

    this.notify('error', { sandboxId, error: error.message });
  }

  /**
   * Check resource limits
   */
  private checkResourceLimits(sandboxId: string): void {
    const state = this.sandboxes.get(sandboxId);
    if (!state || state.status !== 'running') return;

    // Check memory limit
    if (state.memoryUsed > this.config.maxMemoryMB * 1024 * 1024) {
      state.status = 'error';
      state.error = 'Memory limit exceeded';
      this.terminateSandbox(sandboxId);
      this.notify('limit_exceeded', { sandboxId, type: 'memory', used: state.memoryUsed });
    }
  }

  /**
   * Subscribe to sandbox events
   */
  subscribe(callback: SandboxCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Notify callbacks
   */
  private notify(event: string, data: any): void {
    for (const callback of this.callbacks) {
      try {
        callback(event, data);
      } catch (e) {
        console.error('Sandbox callback error:', e);
      }
    }
  }

  /**
   * Clean up terminated sandboxes
   */
  cleanup(): void {
    for (const [id, state] of this.sandboxes) {
      if (state.status === 'terminated' || state.status === 'error') {
        this.sandboxes.delete(id);
      }
    }
  }
}

// Singleton instance
export const sandboxManager = new SandboxManager();

// Convenience exports
export async function createSandbox(config?: Partial<SandboxConfig>): Promise<string> {
  return sandboxManager.createSandbox(config);
}

export async function executeInSandbox(sandboxId: string, code: string): Promise<unknown> {
  return sandboxManager.execute(sandboxId, code);
}

export function terminateSandbox(sandboxId: string): void {
  sandboxManager.terminateSandbox(sandboxId);
}