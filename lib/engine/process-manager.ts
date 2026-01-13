/**
 * Process Manager
 * Manages running processes and provides scheduling
 * 
 * Features:
 * - Process creation and termination
 * - Process suspension and resumption
 * - CPU scheduling (round-robin with priorities)
 * - Process information and statistics
 * - Inter-process communication
 */

import type { LoadedBinary } from './binary-loader';

// ============================================================================
// Types
// ============================================================================

export interface ManagedProcess {
  pid: number;
  name: string;
  binary: LoadedBinary;
  state: ProcessState;
  priority: number;
  cpuTime: number;
  memoryUsage: number;
  threads: Thread[];
  parentPid: number | null;
  children: number[];
  createdAt: number;
  exitCode?: number;
}

export enum ProcessState {
  CREATED = 'created',
  READY = 'ready',
  RUNNING = 'running',
  BLOCKED = 'blocked',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

export interface Thread {
  tid: number;
  pid: number;
  state: ThreadState;
  priority: number;
  entryPoint: number;
  stackPointer: number;
  cpuTime: number;
}

export enum ThreadState {
  READY = 'ready',
  RUNNING = 'running',
  BLOCKED = 'blocked',
  TERMINATED = 'terminated',
}

export interface ProcessInfo {
  pid: number;
  name: string;
  state: ProcessState;
  cpuTime: number;
  memoryUsage: number;
  threadCount: number;
  priority: number;
}

export interface SchedulingStats {
  totalProcesses: number;
  runningProcesses: number;
  readyProcesses: number;
  blockedProcesses: number;
  contextSwitches: number;
  averageWaitTime: number;
  cpuUtilization: number;
}

// ============================================================================
// Process Manager
// ============================================================================

export class ProcessManager {
  private processes: Map<number, ManagedProcess> = new Map();
  private threads: Map<number, Thread> = new Map();
  private readyQueue: number[] = []; // PIDs in ready queue
  private currentProcess: number | null = null;
  
  private nextPid: number = 1000;
  private nextTid: number = 1;
  
  private contextSwitches: number = 0;
  private schedulerRunning: boolean = false;
  private quantum: number = 50; // Time slice in ms
  
  private stats = {
    totalCreated: 0,
    totalTerminated: 0,
    totalCpuTime: 0,
  };

  /**
   * Create process
   */
  createProcess(binary: LoadedBinary, name?: string, parentPid?: number): ManagedProcess {
    const pid = this.nextPid++;
    const processName = name || binary.path;

    console.log(`[ProcessManager] Creating process: ${processName} (PID: ${pid})`);

    // Create main thread
    const mainThread: Thread = {
      tid: this.nextTid++,
      pid,
      state: ThreadState.READY,
      priority: 10, // Default priority
      entryPoint: 0, // Will be set based on binary
      stackPointer: 0,
      cpuTime: 0,
    };

    this.threads.set(mainThread.tid, mainThread);

    const process: ManagedProcess = {
      pid,
      name: processName,
      binary,
      state: ProcessState.READY,
      priority: 10,
      cpuTime: 0,
      memoryUsage: binary.data.byteLength,
      threads: [mainThread],
      parentPid: parentPid || null,
      children: [],
      createdAt: Date.now(),
    };

    this.processes.set(pid, process);
    this.readyQueue.push(pid);
    
    // Update parent
    if (parentPid) {
      const parent = this.processes.get(parentPid);
      if (parent) {
        parent.children.push(pid);
      }
    }

    this.stats.totalCreated++;

    return process;
  }

  /**
   * Terminate process
   */
  terminateProcess(pid: number, exitCode: number = 0): void {
    const process = this.processes.get(pid);
    if (!process) {
      console.warn(`[ProcessManager] Process ${pid} not found`);
      return;
    }

    console.log(`[ProcessManager] Terminating process ${pid} with code ${exitCode}`);

    // Terminate all threads
    for (const thread of process.threads) {
      thread.state = ThreadState.TERMINATED;
    }

    process.state = ProcessState.TERMINATED;
    process.exitCode = exitCode;

    // Remove from ready queue
    this.readyQueue = this.readyQueue.filter(p => p !== pid);

    // Terminate child processes
    for (const childPid of process.children) {
      this.terminateProcess(childPid, -1);
    }

    this.stats.totalTerminated++;
    this.stats.totalCpuTime += process.cpuTime;

    // Clean up after a delay
    setTimeout(() => {
      this.processes.delete(pid);
      for (const thread of process.threads) {
        this.threads.delete(thread.tid);
      }
    }, 1000);
  }

  /**
   * Suspend process
   */
  suspendProcess(pid: number): void {
    const process = this.processes.get(pid);
    if (!process) {
      console.warn(`[ProcessManager] Process ${pid} not found`);
      return;
    }

    console.log(`[ProcessManager] Suspending process ${pid}`);

    process.state = ProcessState.SUSPENDED;
    
    // Remove from ready queue
    this.readyQueue = this.readyQueue.filter(p => p !== pid);

    // If this is the current process, schedule next
    if (this.currentProcess === pid) {
      this.currentProcess = null;
      this.scheduleNext();
    }
  }

  /**
   * Resume process
   */
  resumeProcess(pid: number): void {
    const process = this.processes.get(pid);
    if (!process) {
      console.warn(`[ProcessManager] Process ${pid} not found`);
      return;
    }

    if (process.state !== ProcessState.SUSPENDED) {
      console.warn(`[ProcessManager] Process ${pid} not suspended`);
      return;
    }

    console.log(`[ProcessManager] Resuming process ${pid}`);

    process.state = ProcessState.READY;
    this.readyQueue.push(pid);
  }

  /**
   * Get process list
   */
  getProcessList(): ProcessInfo[] {
    const list: ProcessInfo[] = [];

    for (const process of this.processes.values()) {
      list.push({
        pid: process.pid,
        name: process.name,
        state: process.state,
        cpuTime: process.cpuTime,
        memoryUsage: process.memoryUsage,
        threadCount: process.threads.length,
        priority: process.priority,
      });
    }

    return list;
  }

  /**
   * Get process info
   */
  getProcessInfo(pid: number): ProcessInfo | null {
    const process = this.processes.get(pid);
    if (!process) {
      return null;
    }

    return {
      pid: process.pid,
      name: process.name,
      state: process.state,
      cpuTime: process.cpuTime,
      memoryUsage: process.memoryUsage,
      threadCount: process.threads.length,
      priority: process.priority,
    };
  }

  /**
   * Get detailed process
   */
  getProcess(pid: number): ManagedProcess | null {
    return this.processes.get(pid) || null;
  }

  /**
   * Schedule next process
   */
  scheduleNext(): ManagedProcess | null {
    if (this.readyQueue.length === 0) {
      this.currentProcess = null;
      return null;
    }

    // Round-robin with priority
    // Sort by priority (higher = more important)
    this.readyQueue.sort((a, b) => {
      const procA = this.processes.get(a);
      const procB = this.processes.get(b);
      return (procB?.priority || 0) - (procA?.priority || 0);
    });

    // Get next process
    const pid = this.readyQueue.shift()!;
    const process = this.processes.get(pid);

    if (!process) {
      return this.scheduleNext(); // Try next
    }

    if (process.state !== ProcessState.READY) {
      return this.scheduleNext(); // Skip non-ready processes
    }

    // Context switch
    if (this.currentProcess && this.currentProcess !== pid) {
      this.contextSwitches++;
      const oldProcess = this.processes.get(this.currentProcess);
      if (oldProcess && oldProcess.state === ProcessState.RUNNING) {
        oldProcess.state = ProcessState.READY;
        this.readyQueue.push(this.currentProcess);
      }
    }

    // Schedule process
    this.currentProcess = pid;
    process.state = ProcessState.RUNNING;

    console.log(`[ProcessManager] Scheduled process ${pid} (${process.name})`);

    // Re-queue after quantum
    setTimeout(() => {
      if (this.currentProcess === pid) {
        const proc = this.processes.get(pid);
        if (proc && proc.state === ProcessState.RUNNING) {
          proc.state = ProcessState.READY;
          this.readyQueue.push(pid);
          this.scheduleNext();
        }
      }
    }, this.quantum);

    return process;
  }

  /**
   * Yield current process
   */
  yield(): void {
    if (this.currentProcess) {
      const process = this.processes.get(this.currentProcess);
      if (process && process.state === ProcessState.RUNNING) {
        process.state = ProcessState.READY;
        this.readyQueue.push(this.currentProcess);
        this.currentProcess = null;
        this.scheduleNext();
      }
    }
  }

  /**
   * Start scheduler
   */
  startScheduler(): void {
    if (this.schedulerRunning) {
      console.warn('[ProcessManager] Scheduler already running');
      return;
    }

    console.log('[ProcessManager] Starting scheduler');
    this.schedulerRunning = true;

    const schedulerLoop = () => {
      if (!this.schedulerRunning) return;

      // If no current process, schedule next
      if (!this.currentProcess) {
        this.scheduleNext();
      }

      // Update CPU time
      if (this.currentProcess) {
        const process = this.processes.get(this.currentProcess);
        if (process) {
          process.cpuTime += this.quantum;
        }
      }

      setTimeout(schedulerLoop, this.quantum);
    };

    schedulerLoop();
  }

  /**
   * Stop scheduler
   */
  stopScheduler(): void {
    console.log('[ProcessManager] Stopping scheduler');
    this.schedulerRunning = false;
  }

  /**
   * Get scheduling statistics
   */
  getSchedulingStats(): SchedulingStats {
    const processes = Array.from(this.processes.values());

    const running = processes.filter(p => p.state === ProcessState.RUNNING).length;
    const ready = processes.filter(p => p.state === ProcessState.READY).length;
    const blocked = processes.filter(p => p.state === ProcessState.BLOCKED).length;

    const totalCpuTime = processes.reduce((sum, p) => sum + p.cpuTime, 0);
    const uptime = Date.now() - (processes[0]?.createdAt || Date.now());
    const cpuUtilization = uptime > 0 ? (totalCpuTime / uptime) * 100 : 0;

    return {
      totalProcesses: processes.length,
      runningProcesses: running,
      readyProcesses: ready,
      blockedProcesses: blocked,
      contextSwitches: this.contextSwitches,
      averageWaitTime: 0, // Would track wait times in real impl
      cpuUtilization: Math.min(100, cpuUtilization),
    };
  }

  /**
   * Set process priority
   */
  setPriority(pid: number, priority: number): void {
    const process = this.processes.get(pid);
    if (process) {
      process.priority = Math.max(0, Math.min(20, priority)); // Clamp to 0-20
      console.log(`[ProcessManager] Set priority for PID ${pid}: ${process.priority}`);
    }
  }

  /**
   * Create thread
   */
  createThread(pid: number, entryPoint: number, priority: number = 10): Thread | null {
    const process = this.processes.get(pid);
    if (!process) {
      console.warn(`[ProcessManager] Process ${pid} not found`);
      return null;
    }

    const thread: Thread = {
      tid: this.nextTid++,
      pid,
      state: ThreadState.READY,
      priority,
      entryPoint,
      stackPointer: 0,
      cpuTime: 0,
    };

    this.threads.set(thread.tid, thread);
    process.threads.push(thread);

    console.log(`[ProcessManager] Created thread ${thread.tid} for process ${pid}`);

    return thread;
  }

  /**
   * Terminate thread
   */
  terminateThread(tid: number): void {
    const thread = this.threads.get(tid);
    if (!thread) {
      console.warn(`[ProcessManager] Thread ${tid} not found`);
      return;
    }

    thread.state = ThreadState.TERMINATED;

    const process = this.processes.get(thread.pid);
    if (process) {
      process.threads = process.threads.filter(t => t.tid !== tid);
      
      // If no threads left, terminate process
      if (process.threads.length === 0) {
        this.terminateProcess(process.pid, 0);
      }
    }

    this.threads.delete(tid);
  }

  /**
   * Get current process ID
   */
  getCurrentPid(): number | null {
    return this.currentProcess;
  }

  /**
   * Get process count
   */
  getProcessCount(): number {
    return this.processes.size;
  }

  /**
   * Kill all processes
   */
  killAll(): void {
    console.log('[ProcessManager] Killing all processes');

    for (const pid of Array.from(this.processes.keys())) {
      this.terminateProcess(pid, -1);
    }

    this.processes.clear();
    this.threads.clear();
    this.readyQueue = [];
    this.currentProcess = null;
  }

  /**
   * Reset process manager
   */
  reset(): void {
    console.log('[ProcessManager] Resetting');

    this.stopScheduler();
    this.killAll();

    this.nextPid = 1000;
    this.nextTid = 1;
    this.contextSwitches = 0;
    
    this.stats = {
      totalCreated: 0,
      totalTerminated: 0,
      totalCpuTime: 0,
    };
  }
}

// Export singleton
export const processManager = new ProcessManager();
