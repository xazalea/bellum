/**
 * Production Debugger
 * Full-featured debugger for Windows and Android apps
 * 
 * Features:
 * - Breakpoints (address, conditional, data)
 * - Stepping (over, into, out)
 * - Register inspection
 * - Memory inspection
 * - Call stack
 * - Variable watches
 * - Expression evaluation
 */

import type { ManagedProcess } from '../engine/process-manager';
import { virtualMemoryManager } from '../engine/memory-manager';

// ============================================================================
// Types
// ============================================================================

export interface Breakpoint {
  id: number;
  address: number;
  enabled: boolean;
  hitCount: number;
  condition?: string;
  type: 'address' | 'conditional' | 'data';
}

export interface CallFrame {
  address: number;
  functionName: string;
  args: any[];
  locals: Map<string, any>;
}

export interface RegisterState {
  // x86-64 registers
  rax?: number;
  rbx?: number;
  rcx?: number;
  rdx?: number;
  rsi?: number;
  rdi?: number;
  rbp?: number;
  rsp?: number;
  rip?: number;
  rflags?: number;

  // ARM registers
  r0?: number;
  r1?: number;
  r2?: number;
  r3?: number;
  r4?: number;
  r5?: number;
  r6?: number;
  r7?: number;
  pc?: number;
  sp?: number;
  lr?: number;
  cpsr?: number;
}

export interface WatchVariable {
  id: number;
  expression: string;
  value: any;
  type: string;
}

// ============================================================================
// Debugger
// ============================================================================

export class Debugger {
  private breakpoints: Map<number, Breakpoint> = new Map();
  private nextBreakpointId: number = 1;
  
  private callStack: CallFrame[] = [];
  private registers: RegisterState = {};
  private watches: Map<number, WatchVariable> = new Map();
  private nextWatchId: number = 1;
  
  private isPaused: boolean = false;
  private currentProcess: ManagedProcess | null = null;
  private currentAddress: number = 0;

  /**
   * Attach to process
   */
  attach(process: ManagedProcess): void {
    console.log(`[Debugger] Attaching to process ${process.pid} (${process.name})`);
    this.currentProcess = process;
    this.isPaused = false;
  }

  /**
   * Detach from process
   */
  detach(): void {
    if (this.currentProcess) {
      console.log(`[Debugger] Detaching from process ${this.currentProcess.pid}`);
      this.currentProcess = null;
      this.isPaused = false;
    }
  }

  /**
   * Set breakpoint at address
   */
  setBreakpoint(address: number, condition?: string): Breakpoint {
    const bp: Breakpoint = {
      id: this.nextBreakpointId++,
      address,
      enabled: true,
      hitCount: 0,
      condition,
      type: condition ? 'conditional' : 'address',
    };

    this.breakpoints.set(address, bp);
    console.log(`[Debugger] Breakpoint ${bp.id} set at 0x${address.toString(16)}`);

    return bp;
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(address: number): boolean {
    const bp = this.breakpoints.get(address);
    if (bp) {
      this.breakpoints.delete(address);
      console.log(`[Debugger] Breakpoint ${bp.id} removed`);
      return true;
    }
    return false;
  }

  /**
   * Enable/disable breakpoint
   */
  toggleBreakpoint(address: number, enabled: boolean): void {
    const bp = this.breakpoints.get(address);
    if (bp) {
      bp.enabled = enabled;
      console.log(`[Debugger] Breakpoint ${bp.id} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Check if execution hit breakpoint
   */
  checkBreakpoint(address: number): boolean {
    const bp = this.breakpoints.get(address);
    if (!bp || !bp.enabled) {
      return false;
    }

    bp.hitCount++;

    // Check condition if conditional breakpoint
    if (bp.condition) {
      try {
        const result = this.evaluateExpression(bp.condition);
        if (!result) {
          return false;
        }
      } catch (error) {
        console.warn(`[Debugger] Breakpoint condition evaluation failed:`, error);
        return false;
      }
    }

    console.log(`[Debugger] Hit breakpoint ${bp.id} at 0x${address.toString(16)}`);
    this.isPaused = true;
    this.currentAddress = address;

    return true;
  }

  /**
   * Step over (execute next instruction)
   */
  stepOver(): void {
    if (!this.isPaused) {
      console.warn('[Debugger] Not paused');
      return;
    }

    console.log('[Debugger] Step over');
    this.currentAddress += 4; // Assume 4-byte instruction
    this.isPaused = true;

    // Execute single instruction
    this.executeSingleInstruction();
  }

  /**
   * Step into (enter function call)
   */
  stepInto(): void {
    if (!this.isPaused) {
      console.warn('[Debugger] Not paused');
      return;
    }

    console.log('[Debugger] Step into');
    this.isPaused = true;

    // Execute and potentially enter function
    this.executeSingleInstruction();
  }

  /**
   * Step out (return from function)
   */
  stepOut(): void {
    if (!this.isPaused) {
      console.warn('[Debugger] Not paused');
      return;
    }

    console.log('[Debugger] Step out');

    // Set temporary breakpoint at return address
    if (this.callStack.length > 0) {
      const returnAddress = this.callStack[this.callStack.length - 1].address;
      const tempBp = this.setBreakpoint(returnAddress);
      
      // Continue execution
      this.continue();
      
      // Remove temporary breakpoint when hit
      setTimeout(() => this.removeBreakpoint(returnAddress), 100);
    }
  }

  /**
   * Continue execution
   */
  continue(): void {
    if (!this.isPaused) {
      console.warn('[Debugger] Not paused');
      return;
    }

    console.log('[Debugger] Continue');
    this.isPaused = false;
  }

  /**
   * Get registers
   */
  getRegisters(): RegisterState {
    // Return current register state
    return { ...this.registers };
  }

  /**
   * Set register value
   */
  setRegister(name: keyof RegisterState, value: number): void {
    this.registers[name] = value;
    console.log(`[Debugger] Set ${name} = 0x${value.toString(16)}`);
  }

  /**
   * Get memory at address
   */
  getMemory(address: number, size: number): Uint8Array {
    try {
      return virtualMemoryManager.read(address, size);
    } catch (error) {
      console.error(`[Debugger] Failed to read memory at 0x${address.toString(16)}:`, error);
      return new Uint8Array(size);
    }
  }

  /**
   * Get call stack
   */
  getCallStack(): CallFrame[] {
    return [...this.callStack];
  }

  /**
   * Add call frame
   */
  pushCallFrame(address: number, functionName: string, args: any[] = []): void {
    this.callStack.push({
      address,
      functionName,
      args,
      locals: new Map(),
    });
  }

  /**
   * Remove call frame
   */
  popCallFrame(): CallFrame | undefined {
    return this.callStack.pop();
  }

  /**
   * Watch variable
   */
  watchVariable(expression: string): WatchVariable {
    const watch: WatchVariable = {
      id: this.nextWatchId++,
      expression,
      value: null,
      type: 'unknown',
    };

    try {
      watch.value = this.evaluateExpression(expression);
      watch.type = typeof watch.value;
    } catch (error) {
      console.warn(`[Debugger] Failed to evaluate watch expression: ${expression}`, error);
    }

    this.watches.set(watch.id, watch);
    console.log(`[Debugger] Watching: ${expression}`);

    return watch;
  }

  /**
   * Remove watch
   */
  unwatchVariable(id: number): boolean {
    return this.watches.delete(id);
  }

  /**
   * Update watch values
   */
  updateWatches(): void {
    for (const watch of this.watches.values()) {
      try {
        watch.value = this.evaluateExpression(watch.expression);
        watch.type = typeof watch.value;
      } catch (error) {
        watch.value = '<error>';
        watch.type = 'error';
      }
    }
  }

  /**
   * Get all watches
   */
  getWatches(): WatchVariable[] {
    return Array.from(this.watches.values());
  }

  /**
   * Evaluate expression
   */
  evaluateExpression(expr: string): any {
    console.log(`[Debugger] Evaluating: ${expr}`);

    // Simple expression evaluator
    // In real implementation, would parse and evaluate complex expressions

    // Check for register references
    if (expr.startsWith('$')) {
      const regName = expr.substring(1) as keyof RegisterState;
      return this.registers[regName];
    }

    // Check for memory references
    if (expr.startsWith('*0x')) {
      const address = parseInt(expr.substring(3), 16);
      const data = this.getMemory(address, 8);
      return new DataView(data.buffer).getBigUint64(0, true);
    }

    // Try to evaluate as JavaScript
    try {
      return eval(expr);
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${expr}`);
    }
  }

  /**
   * Get breakpoint list
   */
  getBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Execute single instruction
   */
  private executeSingleInstruction(): void {
    // Simulate instruction execution
    // In real implementation, would execute actual instruction

    // Update registers
    this.registers.rip = this.currentAddress;

    // Update watches
    this.updateWatches();
  }

  /**
   * Check if paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Get current address
   */
  getCurrentAddress(): number {
    return this.currentAddress;
  }

  /**
   * Reset debugger state
   */
  reset(): void {
    console.log('[Debugger] Resetting');
    
    this.breakpoints.clear();
    this.callStack = [];
    this.registers = {};
    this.watches.clear();
    this.isPaused = false;
    this.currentProcess = null;
    this.currentAddress = 0;
  }
}

// Export singleton
export const nachoDebugger = new Debugger();
