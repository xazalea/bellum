/**
 * Thread Management System
 * Implements multi-threading with synchronization primitives
 */

import { VirtualMemoryManager, MemoryProtection, AllocationType } from '../memory/advanced-memory';

// Thread States
export enum ThreadState {
  CREATED,
  READY,
  RUNNING,
  BLOCKED,
  WAITING,
  TERMINATED,
}

// Thread Priority
export enum ThreadPriority {
  IDLE = 0,
  LOWEST = 1,
  BELOW_NORMAL = 2,
  NORMAL = 3,
  ABOVE_NORMAL = 4,
  HIGHEST = 5,
  TIME_CRITICAL = 6,
}

/**
 * Thread Control Block
 */
export class Thread {
  id: number;
  name: string;
  state: ThreadState;
  priority: ThreadPriority;
  
  // CPU State
  registers: Map<string, number> = new Map();
  stackPointer: number;
  instructionPointer: number;
  
  // Stack
  stackBase: number;
  stackSize: number;
  
  // Entry point
  entryPoint: () => void;
  
  // Thread-local storage
  tls: Map<number, any> = new Map();
  
  // Statistics
  creationTime: number;
  cpuTime: number = 0;
  lastScheduled: number = 0;
  
  constructor(
    id: number,
    entryPoint: () => void,
    stackBase: number,
    stackSize: number,
    name = `Thread-${id}`
  ) {
    this.id = id;
    this.name = name;
    this.entryPoint = entryPoint;
    this.stackBase = stackBase;
    this.stackSize = stackSize;
    this.stackPointer = stackBase + stackSize;
    this.instructionPointer = 0;
    this.state = ThreadState.CREATED;
    this.priority = ThreadPriority.NORMAL;
    this.creationTime = performance.now();
  }
}

/**
 * Mutex (Mutual Exclusion Lock)
 */
export class Mutex {
  private locked = false;
  private owner: number | null = null;
  private waitQueue: number[] = [];
  
  /**
   * Try to acquire the mutex
   */
  tryLock(threadId: number): boolean {
    if (!this.locked) {
      this.locked = true;
      this.owner = threadId;
      return true;
    }
    return false;
  }
  
  /**
   * Acquire the mutex (blocks if necessary)
   */
  lock(threadId: number): boolean {
    if (this.tryLock(threadId)) {
      return true;
    }
    
    // Add to wait queue
    if (!this.waitQueue.includes(threadId)) {
      this.waitQueue.push(threadId);
    }
    return false;
  }
  
  /**
   * Release the mutex
   */
  unlock(threadId: number): boolean {
    if (this.owner !== threadId) {
      console.error(`[Mutex] Thread ${threadId} does not own mutex`);
      return false;
    }
    
    this.locked = false;
    this.owner = null;
    
    // Wake up next waiting thread
    if (this.waitQueue.length > 0) {
      const nextThread = this.waitQueue.shift()!;
      this.locked = true;
      this.owner = nextThread;
      return true;
    }
    
    return true;
  }
  
  /**
   * Get waiting threads
   */
  getWaitingThreads(): number[] {
    return [...this.waitQueue];
  }
  
  isLocked(): boolean {
    return this.locked;
  }
  
  getOwner(): number | null {
    return this.owner;
  }
}

/**
 * Semaphore
 */
export class Semaphore {
  private count: number;
  private maxCount: number;
  private waitQueue: number[] = [];
  
  constructor(initialCount: number, maxCount: number = Infinity) {
    this.count = initialCount;
    this.maxCount = maxCount;
  }
  
  /**
   * Wait (decrement semaphore)
   */
  wait(threadId: number): boolean {
    if (this.count > 0) {
      this.count--;
      return true;
    }
    
    // Add to wait queue
    if (!this.waitQueue.includes(threadId)) {
      this.waitQueue.push(threadId);
    }
    return false;
  }
  
  /**
   * Signal (increment semaphore)
   */
  signal(): boolean {
    if (this.count < this.maxCount) {
      this.count++;
      
      // Wake up waiting thread
      if (this.waitQueue.length > 0 && this.count > 0) {
        this.waitQueue.shift();
        this.count--;
      }
      
      return true;
    }
    return false;
  }
  
  getCount(): number {
    return this.count;
  }
  
  getWaitingThreads(): number[] {
    return [...this.waitQueue];
  }
}

/**
 * Condition Variable
 */
export class ConditionVariable {
  private waitQueue: number[] = [];
  
  /**
   * Wait on condition
   */
  wait(threadId: number, mutex: Mutex): boolean {
    // Add to wait queue
    if (!this.waitQueue.includes(threadId)) {
      this.waitQueue.push(threadId);
    }
    
    // Release mutex while waiting
    mutex.unlock(threadId);
    return false; // Thread should block
  }
  
  /**
   * Signal one waiting thread
   */
  signal(mutex: Mutex): boolean {
    if (this.waitQueue.length > 0) {
      const threadId = this.waitQueue.shift()!;
      // Thread will reacquire mutex when woken
      return true;
    }
    return false;
  }
  
  /**
   * Broadcast to all waiting threads
   */
  broadcast(mutex: Mutex): number {
    const count = this.waitQueue.length;
    this.waitQueue = [];
    return count;
  }
  
  getWaitingThreads(): number[] {
    return [...this.waitQueue];
  }
}

/**
 * Thread Manager
 * Manages thread lifecycle and scheduling
 */
export class ThreadManager {
  private threads: Map<number, Thread> = new Map();
  private nextThreadId = 1;
  private currentThread: Thread | null = null;
  private readyQueue: Thread[] = [];
  private vmm: VirtualMemoryManager;
  
  // Synchronization primitives
  private mutexes: Map<number, Mutex> = new Map();
  private semaphores: Map<number, Semaphore> = new Map();
  private condVars: Map<number, ConditionVariable> = new Map();
  private nextSyncId = 1;
  
  // Scheduler settings
  private timeSlice = 10; // ms
  private useWebWorkers = false; // Can't use in browser yet due to SharedArrayBuffer
  
  constructor(vmm: VirtualMemoryManager) {
    this.vmm = vmm;
    console.log('[ThreadManager] Initialized');
  }
  
  /**
   * Create new thread
   */
  createThread(
    entryPoint: () => void,
    stackSize = 1024 * 1024, // 1MB default
    name?: string
  ): number {
    // Allocate stack
    const stackBase = this.vmm.allocate(
      0,
      stackSize,
      AllocationType.COMMIT,
      MemoryProtection.READ_WRITE
    );
    
    if (stackBase === 0) {
      console.error('[ThreadManager] Failed to allocate stack');
      return 0;
    }
    
    const threadId = this.nextThreadId++;
    const thread = new Thread(threadId, entryPoint, stackBase, stackSize, name);
    
    this.threads.set(threadId, thread);
    thread.state = ThreadState.READY;
    this.readyQueue.push(thread);
    
    console.log(`[ThreadManager] Created thread ${threadId}: ${thread.name}`);
    return threadId;
  }
  
  /**
   * Start executing threads
   */
  start() {
    // Simple cooperative scheduling (real impl would use Web Workers + SharedArrayBuffer)
    this.schedule();
  }
  
  /**
   * Simple round-robin scheduler
   */
  private schedule() {
    while (this.readyQueue.length > 0) {
      const thread = this.readyQueue.shift()!;
      
      if (thread.state !== ThreadState.READY) {
        continue;
      }
      
      // Switch to thread
      this.currentThread = thread;
      thread.state = ThreadState.RUNNING;
      thread.lastScheduled = performance.now();
      
      try {
        // Execute thread (simplified - would need proper context switching)
        thread.entryPoint();
        
        // Thread completed
        thread.state = ThreadState.TERMINATED;
        console.log(`[ThreadManager] Thread ${thread.id} terminated`);
        
      } catch (e) {
        console.error(`[ThreadManager] Thread ${thread.id} crashed:`, e);
        thread.state = ThreadState.TERMINATED;
      }
      
      // Update CPU time
      thread.cpuTime += performance.now() - thread.lastScheduled;
      this.currentThread = null;
    }
  }
  
  /**
   * Yield CPU to other threads
   */
  yield() {
    if (this.currentThread) {
      this.currentThread.state = ThreadState.READY;
      this.readyQueue.push(this.currentThread);
    }
  }
  
  /**
   * Sleep current thread
   */
  sleep(milliseconds: number) {
    if (this.currentThread) {
      this.currentThread.state = ThreadState.WAITING;
      
      // Wake up after timeout
      setTimeout(() => {
        if (this.currentThread) {
          this.currentThread.state = ThreadState.READY;
          this.readyQueue.push(this.currentThread);
        }
      }, milliseconds);
    }
  }
  
  /**
   * Terminate thread
   */
  terminateThread(threadId: number) {
    const thread = this.threads.get(threadId);
    if (!thread) return;
    
    thread.state = ThreadState.TERMINATED;
    
    // Free stack
    this.vmm.free(thread.stackBase);
    
    console.log(`[ThreadManager] Terminated thread ${threadId}`);
  }
  
  /**
   * Get current thread
   */
  getCurrentThread(): Thread | null {
    return this.currentThread;
  }
  
  /**
   * Get thread by ID
   */
  getThread(threadId: number): Thread | null {
    return this.threads.get(threadId) || null;
  }
  
  /**
   * Create mutex
   */
  createMutex(): number {
    const id = this.nextSyncId++;
    this.mutexes.set(id, new Mutex());
    return id;
  }
  
  /**
   * Lock mutex
   */
  lockMutex(mutexId: number, threadId: number): boolean {
    const mutex = this.mutexes.get(mutexId);
    if (!mutex) return false;
    
    if (mutex.lock(threadId)) {
      return true;
    }
    
    // Block thread
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.state = ThreadState.BLOCKED;
    }
    
    return false;
  }
  
  /**
   * Unlock mutex
   */
  unlockMutex(mutexId: number, threadId: number): boolean {
    const mutex = this.mutexes.get(mutexId);
    if (!mutex) return false;
    
    if (mutex.unlock(threadId)) {
      // Wake up waiting threads
      const waiting = mutex.getWaitingThreads();
      for (const tid of waiting) {
        const thread = this.threads.get(tid);
        if (thread && thread.state === ThreadState.BLOCKED) {
          thread.state = ThreadState.READY;
          this.readyQueue.push(thread);
        }
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Create semaphore
   */
  createSemaphore(initialCount: number, maxCount?: number): number {
    const id = this.nextSyncId++;
    this.semaphores.set(id, new Semaphore(initialCount, maxCount));
    return id;
  }
  
  /**
   * Wait on semaphore
   */
  waitSemaphore(semId: number, threadId: number): boolean {
    const sem = this.semaphores.get(semId);
    if (!sem) return false;
    
    if (sem.wait(threadId)) {
      return true;
    }
    
    // Block thread
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.state = ThreadState.BLOCKED;
    }
    
    return false;
  }
  
  /**
   * Signal semaphore
   */
  signalSemaphore(semId: number): boolean {
    const sem = this.semaphores.get(semId);
    if (!sem) return false;
    
    if (sem.signal()) {
      // Wake up waiting threads
      const waiting = sem.getWaitingThreads();
      for (const tid of waiting) {
        const thread = this.threads.get(tid);
        if (thread && thread.state === ThreadState.BLOCKED) {
          thread.state = ThreadState.READY;
          this.readyQueue.push(thread);
        }
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Create condition variable
   */
  createConditionVariable(): number {
    const id = this.nextSyncId++;
    this.condVars.set(id, new ConditionVariable());
    return id;
  }
  
  /**
   * Wait on condition variable
   */
  waitCondition(condId: number, mutexId: number, threadId: number): boolean {
    const cond = this.condVars.get(condId);
    const mutex = this.mutexes.get(mutexId);
    if (!cond || !mutex) return false;
    
    // Block thread
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.state = ThreadState.WAITING;
    }
    
    return cond.wait(threadId, mutex);
  }
  
  /**
   * Signal condition variable
   */
  signalCondition(condId: number, mutexId: number): boolean {
    const cond = this.condVars.get(condId);
    const mutex = this.mutexes.get(mutexId);
    if (!cond || !mutex) return false;
    
    return cond.signal(mutex);
  }
  
  /**
   * Broadcast condition variable
   */
  broadcastCondition(condId: number, mutexId: number): number {
    const cond = this.condVars.get(condId);
    const mutex = this.mutexes.get(mutexId);
    if (!cond || !mutex) return 0;
    
    return cond.broadcast(mutex);
  }
  
  /**
   * Get thread statistics
   */
  getStats() {
    const states = new Map<ThreadState, number>();
    let totalCpuTime = 0;
    
    for (const thread of this.threads.values()) {
      const count = states.get(thread.state) || 0;
      states.set(thread.state, count + 1);
      totalCpuTime += thread.cpuTime;
    }
    
    return {
      totalThreads: this.threads.size,
      readyThreads: this.readyQueue.length,
      states: Object.fromEntries(states),
      totalCpuTime,
      mutexes: this.mutexes.size,
      semaphores: this.semaphores.size,
      conditionVariables: this.condVars.size,
    };
  }
}

/**
 * Atomic Operations
 * Wrapper around Atomics API for SharedArrayBuffer
 */
export class AtomicOps {
  /**
   * Atomic add
   */
  static add(buffer: Int32Array, index: number, value: number): number {
    if (typeof Atomics !== 'undefined') {
      return Atomics.add(buffer, index, value);
    }
    // Fallback for non-SharedArrayBuffer
    const old = buffer[index];
    buffer[index] += value;
    return old;
  }
  
  /**
   * Atomic sub
   */
  static sub(buffer: Int32Array, index: number, value: number): number {
    if (typeof Atomics !== 'undefined') {
      return Atomics.sub(buffer, index, value);
    }
    const old = buffer[index];
    buffer[index] -= value;
    return old;
  }
  
  /**
   * Atomic compare and exchange
   */
  static compareExchange(
    buffer: Int32Array,
    index: number,
    expected: number,
    replacement: number
  ): number {
    if (typeof Atomics !== 'undefined') {
      return Atomics.compareExchange(buffer, index, expected, replacement);
    }
    const old = buffer[index];
    if (old === expected) {
      buffer[index] = replacement;
    }
    return old;
  }
  
  /**
   * Atomic load
   */
  static load(buffer: Int32Array, index: number): number {
    if (typeof Atomics !== 'undefined') {
      return Atomics.load(buffer, index);
    }
    return buffer[index];
  }
  
  /**
   * Atomic store
   */
  static store(buffer: Int32Array, index: number, value: number): number {
    if (typeof Atomics !== 'undefined') {
      return Atomics.store(buffer, index, value);
    }
    buffer[index] = value;
    return value;
  }
}
