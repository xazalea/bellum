/**
 * Windows NT Kernel Emulation (NTOSKRNL.EXE)
 * Core kernel services for process, thread, memory, and I/O management
 */

import { VirtualMemoryManager, MemoryProtection, AllocationType } from '../memory/advanced-memory';
import { ThreadManager } from '../threading/thread-manager';

// Process Information
interface ProcessInfo {
  processId: number;
  parentProcessId: number;
  name: string;
  imageBase: number;
  imageSize: number;
  entryPoint: number;
  created: number;
  exitCode: number | null;
  threads: Set<number>;
  handles: Map<number, Handle>;
}

// Handle types
enum HandleType {
  FILE,
  PROCESS,
  THREAD,
  EVENT,
  MUTEX,
  SEMAPHORE,
  SECTION,
  KEY, // Registry key
}

interface Handle {
  type: HandleType;
  object: any;
  accessMask: number;
}

/**
 * Windows NT Kernel
 */
export class NTKernel {
  private vmm: VirtualMemoryManager;
  private threadManager: ThreadManager;
  private processes: Map<number, ProcessInfo> = new Map();
  private nextProcessId = 1;
  private nextHandle = 4; // Handles start at 4 (0-3 reserved)
  private currentProcess: ProcessInfo | null = null;
  
  constructor(vmm: VirtualMemoryManager, threadManager: ThreadManager) {
    this.vmm = vmm;
    this.threadManager = threadManager;
    console.log('[NTKernel] Initialized');
  }
  
  // ===== PROCESS MANAGEMENT =====
  
  /**
   * Create new process (CreateProcess)
   */
  createProcess(
    imagePath: string,
    commandLine: string,
    imageData: Uint8Array,
    entryPoint: number
  ): number {
    const processId = this.nextProcessId++;
    
    // Allocate address space for process
    const imageSize = imageData.length;
    const imageBase = this.vmm.allocate(
      0x00400000, // Standard base address
      imageSize,
      AllocationType.COMMIT,
      MemoryProtection.READ_EXECUTE
    );
    
    if (imageBase === 0) {
      console.error('[NTKernel] Failed to allocate process memory');
      return 0;
    }
    
    // Load image into memory
    this.vmm.write(imageBase, imageData);
    
    // Create process info
    const process: ProcessInfo = {
      processId,
      parentProcessId: this.currentProcess?.processId || 0,
      name: imagePath,
      imageBase,
      imageSize,
      entryPoint,
      created: Date.now(),
      exitCode: null,
      threads: new Set(),
      handles: new Map(),
    };
    
    this.processes.set(processId, process);
    
    // Create initial thread
    const mainThreadId = this.createThread(processId, entryPoint);
    if (mainThreadId === 0) {
      console.error('[NTKernel] Failed to create main thread');
      this.vmm.free(imageBase);
      this.processes.delete(processId);
      return 0;
    }
    
    console.log(`[NTKernel] Created process ${processId}: ${imagePath}`);
    return processId;
  }
  
  /**
   * Get current process ID (GetCurrentProcess)
   */
  getCurrentProcess(): number {
    return this.currentProcess?.processId || 0;
  }
  
  /**
   * Get process by ID (OpenProcess)
   */
  openProcess(processId: number, accessMask: number): number {
    const process = this.processes.get(processId);
    if (!process) return 0;
    
    const handle = this.createHandle(HandleType.PROCESS, process, accessMask);
    return handle;
  }
  
  /**
   * Exit process (ExitProcess)
   */
  exitProcess(processId: number, exitCode: number) {
    const process = this.processes.get(processId);
    if (!process) return;
    
    process.exitCode = exitCode;
    
    // Terminate all threads
    for (const threadId of process.threads) {
      this.threadManager.terminateThread(threadId);
    }
    
    // Free memory
    this.vmm.free(process.imageBase);
    
    // Close all handles
    process.handles.clear();
    
    console.log(`[NTKernel] Process ${processId} exited with code ${exitCode}`);
  }
  
  // ===== THREAD MANAGEMENT =====
  
  /**
   * Create thread (CreateThread)
   */
  createThread(processId: number, startAddress: number): number {
    const process = this.processes.get(processId);
    if (!process) return 0;
    
    const threadId = this.threadManager.createThread(
      () => {
        // Thread entry point - would execute code at startAddress
        console.log(`[NTKernel] Thread started at 0x${startAddress.toString(16)}`);
      },
      1024 * 1024, // 1MB stack
      `Thread-P${processId}`
    );
    
    if (threadId) {
      process.threads.add(threadId);
    }
    
    return threadId;
  }
  
  /**
   * Get current thread ID (GetCurrentThreadId)
   */
  getCurrentThreadId(): number {
    const thread = this.threadManager.getCurrentThread();
    return thread?.id || 0;
  }
  
  /**
   * Suspend thread (SuspendThread)
   */
  suspendThread(threadId: number): boolean {
    const thread = this.threadManager.getThread(threadId);
    if (!thread) return false;
    
    // Set thread to WAITING state
    thread.state = 2; // WAITING
    return true;
  }
  
  /**
   * Resume thread (ResumeThread)
   */
  resumeThread(threadId: number): boolean {
    const thread = this.threadManager.getThread(threadId);
    if (!thread) return false;
    
    // Set thread to READY state
    thread.state = 1; // READY
    return true;
  }
  
  /**
   * Terminate thread (TerminateThread)
   */
  terminateThread(threadId: number, exitCode: number): boolean {
    this.threadManager.terminateThread(threadId);
    return true;
  }
  
  // ===== MEMORY MANAGEMENT =====
  
  /**
   * Allocate virtual memory (VirtualAlloc)
   */
  virtualAlloc(
    address: number,
    size: number,
    allocationType: number,
    protect: number
  ): number {
    // Map Win32 protection to our MemoryProtection
    let protection = MemoryProtection.NONE;
    if (protect & 0x02) protection |= MemoryProtection.READ;
    if (protect & 0x04) protection |= MemoryProtection.READ_WRITE;
    if (protect & 0x20) protection |= MemoryProtection.READ_EXECUTE;
    if (protect & 0x40) protection |= MemoryProtection.READ_WRITE_EXECUTE;
    
    return this.vmm.allocate(address, size, allocationType, protection);
  }
  
  /**
   * Free virtual memory (VirtualFree)
   */
  virtualFree(address: number): boolean {
    return this.vmm.free(address);
  }
  
  /**
   * Change memory protection (VirtualProtect)
   */
  virtualProtect(address: number, size: number, newProtect: number): boolean {
    let protection = MemoryProtection.NONE;
    if (newProtect & 0x02) protection |= MemoryProtection.READ;
    if (newProtect & 0x04) protection |= MemoryProtection.READ_WRITE;
    if (newProtect & 0x20) protection |= MemoryProtection.READ_EXECUTE;
    if (newProtect & 0x40) protection |= MemoryProtection.READ_WRITE_EXECUTE;
    
    return this.vmm.protect(address, size, protection);
  }
  
  /**
   * Query memory information (VirtualQuery)
   */
  virtualQuery(address: number): any {
    // Simplified - would return full MEMORY_BASIC_INFORMATION structure
    return {
      baseAddress: address & ~0xFFF,
      allocationBase: address & ~0xFFF,
      regionSize: 4096,
      state: 0x1000, // MEM_COMMIT
      protect: 0x04, // PAGE_READWRITE
      type: 0x20000, // MEM_PRIVATE
    };
  }
  
  // ===== HANDLE MANAGEMENT =====
  
  /**
   * Create handle
   */
  private createHandle(type: HandleType, object: any, accessMask: number): number {
    const handle = this.nextHandle++;
    
    if (this.currentProcess) {
      this.currentProcess.handles.set(handle, { type, object, accessMask });
    }
    
    return handle;
  }
  
  /**
   * Close handle (CloseHandle)
   */
  closeHandle(handle: number): boolean {
    if (!this.currentProcess) return false;
    
    const handleInfo = this.currentProcess.handles.get(handle);
    if (!handleInfo) return false;
    
    this.currentProcess.handles.delete(handle);
    return true;
  }
  
  /**
   * Duplicate handle (DuplicateHandle)
   */
  duplicateHandle(sourceHandle: number): number {
    if (!this.currentProcess) return 0;
    
    const handleInfo = this.currentProcess.handles.get(sourceHandle);
    if (!handleInfo) return 0;
    
    return this.createHandle(handleInfo.type, handleInfo.object, handleInfo.accessMask);
  }
  
  // ===== I/O MANAGEMENT =====
  
  /**
   * Create file (CreateFile)
   */
  createFile(
    fileName: string,
    desiredAccess: number,
    shareMode: number,
    creationDisposition: number
  ): number {
    // Simplified - would interact with virtual file system
    console.log(`[NTKernel] CreateFile: ${fileName}`);
    
    const fileObject = {
      name: fileName,
      size: 0,
      data: new Uint8Array(0),
      position: 0,
    };
    
    return this.createHandle(HandleType.FILE, fileObject, desiredAccess);
  }
  
  /**
   * Read file (ReadFile)
   */
  readFile(fileHandle: number, buffer: Uint8Array, bytesToRead: number): number {
    if (!this.currentProcess) return 0;
    
    const handleInfo = this.currentProcess.handles.get(fileHandle);
    if (!handleInfo || handleInfo.type !== HandleType.FILE) return 0;
    
    const file = handleInfo.object;
    const bytesRead = Math.min(bytesToRead, file.data.length - file.position);
    
    buffer.set(file.data.subarray(file.position, file.position + bytesRead));
    file.position += bytesRead;
    
    return bytesRead;
  }
  
  /**
   * Write file (WriteFile)
   */
  writeFile(fileHandle: number, buffer: Uint8Array, bytesToWrite: number): number {
    if (!this.currentProcess) return 0;
    
    const handleInfo = this.currentProcess.handles.get(fileHandle);
    if (!handleInfo || handleInfo.type !== HandleType.FILE) return 0;
    
    const file = handleInfo.object;
    
    // Expand file data if necessary
    if (file.position + bytesToWrite > file.data.length) {
      const newData = new Uint8Array(file.position + bytesToWrite);
      newData.set(file.data);
      file.data = newData;
    }
    
    file.data.set(buffer.subarray(0, bytesToWrite), file.position);
    file.position += bytesToWrite;
    file.size = Math.max(file.size, file.position);
    
    return bytesToWrite;
  }
  
  /**
   * Device I/O control (DeviceIoControl)
   */
  deviceIoControl(
    deviceHandle: number,
    ioControlCode: number,
    inputBuffer: Uint8Array | null,
    outputBuffer: Uint8Array | null
  ): boolean {
    console.log(`[NTKernel] DeviceIoControl: code=0x${ioControlCode.toString(16)}`);
    // Simplified - would handle specific device control codes
    return true;
  }
  
  // ===== SYNCHRONIZATION =====
  
  /**
   * Create event (CreateEvent)
   */
  createEvent(manualReset: boolean, initialState: boolean): number {
    const event = {
      manualReset,
      signaled: initialState,
      waiters: [] as number[],
    };
    
    return this.createHandle(HandleType.EVENT, event, 0x001F0003); // EVENT_ALL_ACCESS
  }
  
  /**
   * Set event (SetEvent)
   */
  setEvent(eventHandle: number): boolean {
    if (!this.currentProcess) return false;
    
    const handleInfo = this.currentProcess.handles.get(eventHandle);
    if (!handleInfo || handleInfo.type !== HandleType.EVENT) return false;
    
    const event = handleInfo.object;
    event.signaled = true;
    
    // Wake up waiting threads
    for (const threadId of event.waiters) {
      this.resumeThread(threadId);
    }
    
    if (event.manualReset) {
      event.waiters = [];
    } else {
      event.waiters.shift(); // Auto-reset: wake only one thread
    }
    
    return true;
  }
  
  /**
   * Reset event (ResetEvent)
   */
  resetEvent(eventHandle: number): boolean {
    if (!this.currentProcess) return false;
    
    const handleInfo = this.currentProcess.handles.get(eventHandle);
    if (!handleInfo || handleInfo.type !== HandleType.EVENT) return false;
    
    handleInfo.object.signaled = false;
    return true;
  }
  
  /**
   * Wait for single object (WaitForSingleObject)
   */
  waitForSingleObject(handle: number, timeout: number): number {
    if (!this.currentProcess) return 0xFFFFFFFF; // WAIT_FAILED
    
    const handleInfo = this.currentProcess.handles.get(handle);
    if (!handleInfo) return 0xFFFFFFFF;
    
    // Simplified wait logic
    switch (handleInfo.type) {
      case HandleType.EVENT:
        {
          const event = handleInfo.object;
          if (event.signaled) {
            if (!event.manualReset) {
              event.signaled = false;
            }
            return 0; // WAIT_OBJECT_0
          }
          
          // Block thread
          const threadId = this.getCurrentThreadId();
          event.waiters.push(threadId);
          this.suspendThread(threadId);
          return 0x00000102; // WAIT_TIMEOUT (for now)
        }
        
      case HandleType.THREAD:
        // Wait for thread termination
        return 0;
        
      case HandleType.PROCESS:
        // Wait for process termination
        return 0;
        
      default:
        return 0xFFFFFFFF;
    }
  }
  
  // ===== SYSTEM INFORMATION =====
  
  /**
   * Get system information (GetSystemInfo)
   */
  getSystemInfo(): any {
    return {
      dwPageSize: 4096,
      lpMinimumApplicationAddress: 0x00010000,
      lpMaximumApplicationAddress: 0x7FFFFFFF,
      dwActiveProcessorMask: 0xF, // 4 processors
      dwNumberOfProcessors: 4,
      dwProcessorType: 586, // Pentium
      dwAllocationGranularity: 65536,
      wProcessorLevel: 6,
      wProcessorRevision: 0,
    };
  }
  
  /**
   * Get system time (GetSystemTime)
   */
  getSystemTime(): Date {
    return new Date();
  }
  
  /**
   * Get tick count (GetTickCount)
   */
  getTickCount(): number {
    return performance.now();
  }
  
  /**
   * Get kernel statistics
   */
  getStats() {
    const memStats = this.vmm.getStats();
    const threadStats = this.threadManager.getStats();
    
    return {
      processes: this.processes.size,
      ...threadStats,
      ...memStats,
    };
  }
}
