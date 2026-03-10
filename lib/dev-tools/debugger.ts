/**
 * Integrated Debugger for APK/EXE Execution
 * Provides breakpoint management, stepping, and variable inspection
 */

export type BreakpointType = 'line' | 'function' | 'condition';
export type ExecutionState = 'running' | 'paused' | 'stopped' | 'step';

export interface Breakpoint {
  id: string;
  type: BreakpointType;
  file: string;
  line?: number;
  function?: string;
  condition?: string;
  enabled: boolean;
  hitCount: number;
}

export interface CallFrame {
  id: string;
  function: string;
  file: string;
  line: number;
  column: number;
  locals: Map<string, unknown>;
  arguments: Map<string, unknown>;
}

export interface WatchExpression {
  id: string;
  expression: string;
  value?: unknown;
  error?: string;
}

export interface DebugSession {
  id: string;
  state: ExecutionState;
  currentFile?: string;
  currentLine?: number;
  callStack: CallFrame[];
  breakpoints: Map<string, Breakpoint>;
  watches: Map<string, WatchExpression>;
  logs: string[];
  createdAt: number;
}

export interface DebugConfig {
  enabled: boolean;
  breakOnError: boolean;
  breakOnException: boolean;
  maxCallStackDepth: number;
  logConsole: boolean;
}

type DebugCallback = (event: string, data: any) => void;

const DEFAULT_CONFIG: DebugConfig = {
  enabled: false,
  breakOnError: true,
  breakOnException: true,
  maxCallStackDepth: 100,
  logConsole: true,
};

/**
 * Integrated Debugger
 */
class IntegratedDebugger {
  private config: DebugConfig;
  private session: DebugSession | null = null;
  private callbacks: Set<DebugCallback> = new Set();
  private breakpoints: Map<string, Breakpoint> = new Map();
  private watches: Map<string, WatchExpression> = new Map();

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Enable developer mode
   */
  enable(): void {
    this.config.enabled = true;
    this.notify('enabled', {});
  }

  /**
   * Disable developer mode
   */
  disable(): void {
    this.config.enabled = false;
    this.stopSession();
    this.notify('disabled', {});
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Start a debug session
   */
  startSession(id: string): DebugSession {
    this.session = {
      id,
      state: 'running',
      callStack: [],
      breakpoints: new Map(this.breakpoints),
      watches: new Map(this.watches),
      logs: [],
      createdAt: Date.now(),
    };

    this.notify('session_started', { sessionId: id });
    return this.session;
  }

  /**
   * Stop current session
   */
  stopSession(): void {
    if (this.session) {
      this.session.state = 'stopped';
      this.notify('session_stopped', { sessionId: this.session.id });
      this.session = null;
    }
  }

  /**
   * Get current session
   */
  getSession(): DebugSession | null {
    return this.session;
  }

  /**
   * Set a breakpoint
   */
  setBreakpoint(params: {
    type: BreakpointType;
    file: string;
    line?: number;
    function?: string;
    condition?: string;
  }): Breakpoint {
    const id = `bp_${params.file}_${params.line || params.function || Date.now()}`;
    
    const breakpoint: Breakpoint = {
      id,
      type: params.type,
      file: params.file,
      line: params.line,
      function: params.function,
      condition: params.condition,
      enabled: true,
      hitCount: 0,
    };

    this.breakpoints.set(id, breakpoint);
    
    if (this.session) {
      this.session.breakpoints.set(id, breakpoint);
    }

    this.notify('breakpoint_set', { breakpoint });
    return breakpoint;
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(id: string): boolean {
    const removed = this.breakpoints.delete(id);
    
    if (this.session) {
      this.session.breakpoints.delete(id);
    }

    if (removed) {
      this.notify('breakpoint_removed', { id });
    }

    return removed;
  }

  /**
   * Toggle breakpoint enabled state
   */
  toggleBreakpoint(id: string): boolean {
    const breakpoint = this.breakpoints.get(id);
    if (!breakpoint) return false;

    breakpoint.enabled = !breakpoint.enabled;
    this.notify('breakpoint_toggled', { id, enabled: breakpoint.enabled });
    return true;
  }

  /**
   * Get all breakpoints
   */
  getBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Get breakpoints for a file
   */
  getBreakpointsForFile(file: string): Breakpoint[] {
    return Array.from(this.breakpoints.values()).filter(bp => bp.file === file);
  }

  /**
   * Add a watch expression
   */
  addWatch(expression: string): WatchExpression {
    const id = `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const watch: WatchExpression = {
      id,
      expression,
    };

    this.watches.set(id, watch);
    this.notify('watch_added', { watch });
    return watch;
  }

  /**
   * Remove a watch expression
   */
  removeWatch(id: string): boolean {
    const removed = this.watches.delete(id);
    if (removed) {
      this.notify('watch_removed', { id });
    }
    return removed;
  }

  /**
   * Update watch values
   */
  updateWatches(evaluateFn: (expr: string) => unknown): void {
    for (const watch of this.watches.values()) {
      try {
        watch.value = evaluateFn(watch.expression);
        watch.error = undefined;
      } catch (e) {
        watch.value = undefined;
        watch.error = String(e);
      }
    }

    this.notify('watches_updated', { watches: Array.from(this.watches.values()) });
  }

  /**
   * Get all watch expressions
   */
  getWatches(): WatchExpression[] {
    return Array.from(this.watches.values());
  }

  /**
   * Pause execution
   */
  pause(): void {
    if (this.session && this.session.state === 'running') {
      this.session.state = 'paused';
      this.notify('paused', {
        file: this.session.currentFile,
        line: this.session.currentLine,
      });
    }
  }

  /**
   * Resume execution
   */
  resume(): void {
    if (this.session && this.session.state === 'paused') {
      this.session.state = 'running';
      this.notify('resumed', {});
    }
  }

  /**
   * Step over
   */
  stepOver(): void {
    if (this.session && this.session.state === 'paused') {
      this.session.state = 'step';
      this.notify('step_over', {});
    }
  }

  /**
   * Step into
   */
  stepInto(): void {
    if (this.session && this.session.state === 'paused') {
      this.session.state = 'step';
      this.notify('step_into', {});
    }
  }

  /**
   * Step out
   */
  stepOut(): void {
    if (this.session && this.session.state === 'paused') {
      this.session.state = 'step';
      this.notify('step_out', {});
    }
  }

  /**
   * Handle breakpoint hit
   */
  handleBreakpointHit(file: string, line: number): boolean {
    const breakpoint = Array.from(this.breakpoints.values()).find(
      bp => bp.enabled && bp.file === file && bp.line === line
    );

    if (breakpoint) {
      breakpoint.hitCount++;
      
      if (this.session) {
        this.session.state = 'paused';
        this.session.currentFile = file;
        this.session.currentLine = line;
      }

      this.notify('breakpoint_hit', { breakpoint, file, line });
      return true;
    }

    return false;
  }

  /**
   * Update call stack
   */
  updateCallStack(frames: CallFrame[]): void {
    if (this.session) {
      this.session.callStack = frames.slice(0, this.config.maxCallStackDepth);
      this.notify('call_stack_updated', { frames: this.session.callStack });
    }
  }

  /**
   * Get call stack
   */
  getCallStack(): CallFrame[] {
    return this.session?.callStack || [];
  }

  /**
   * Add log entry
   */
  log(message: string): void {
    if (this.session && this.config.logConsole) {
      this.session.logs.push(`[${new Date().toISOString()}] ${message}`);
      this.notify('log', { message });
    }
  }

  /**
   * Get logs
   */
  getLogs(): string[] {
    return this.session?.logs || [];
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    if (this.session) {
      this.session.logs = [];
      this.notify('logs_cleared', {});
    }
  }

  /**
   * Capture heap snapshot
   */
  async captureHeapSnapshot(): Promise<HeapSnapshot> {
    const snapshot: HeapSnapshot = {
      id: `heap_${Date.now()}`,
      timestamp: Date.now(),
      totalSize: 0,
      objectCount: 0,
      objects: [],
    };

    // Get memory info if available
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as any).memory;
      snapshot.totalSize = mem.usedJSHeapSize;
    }

    // Count objects (simplified)
    const globalKeys = Object.keys(globalThis);
    snapshot.objectCount = globalKeys.length;

    this.notify('heap_snapshot', { snapshot });
    return snapshot;
  }

  /**
   * Start CPU profiling
   */
  startProfiling(): void {
    this.notify('profiling_started', {});
  }

  /**
   * Stop CPU profiling and get profile
   */
  stopProfiling(): CPUProfile {
    const profile: CPUProfile = {
      id: `profile_${Date.now()}`,
      duration: 0,
      samples: [],
    };

    this.notify('profiling_stopped', { profile });
    return profile;
  }

  /**
   * Subscribe to debug events
   */
  subscribe(callback: DebugCallback): () => void {
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
        console.error('Debug callback error:', e);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export interface HeapSnapshot {
  id: string;
  timestamp: number;
  totalSize: number;
  objectCount: number;
  objects: HeapObject[];
}

export interface HeapObject {
  id: string;
  type: string;
  size: number;
  retainedSize: number;
  name?: string;
}

export interface CPUProfile {
  id: string;
  duration: number;
  samples: ProfileSample[];
}

export interface ProfileSample {
  timestamp: number;
  stack: string[];
}

// Singleton instance
export const integratedDebugger = new IntegratedDebugger();

// Convenience exports
export function enableDebugger(): void {
  integratedDebugger.enable();
}

export function disableDebugger(): void {
  integratedDebugger.disable();
}

export function isDebuggerEnabled(): boolean {
  return integratedDebugger.isEnabled();
}

export function setBreakpoint(params: Parameters<IntegratedDebugger['setBreakpoint']>[0]): Breakpoint {
  return integratedDebugger.setBreakpoint(params);
}

export function getBreakpoints(): Breakpoint[] {
  return integratedDebugger.getBreakpoints();
}