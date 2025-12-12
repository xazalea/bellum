/**
 * Android Runtime - Implements Android Syscalls and Runtime Environment
 */

export interface AndroidSyscall {
  name: string;
  handler: (args: any[]) => Promise<any>;
}

interface FileDescriptor {
    path: string;
    position: number;
    flags: number;
}

export class AndroidRuntime {
  private syscalls: Map<string, AndroidSyscall> = new Map();
  private fileSystem: Map<string, Uint8Array> = new Map();
  private openFiles: Map<number, FileDescriptor> = new Map();
  private threads: Map<number, any> = new Map();
  
  private nextFd = 100; // Start FDs at 100 to reserve 0,1,2
  private nextThreadId = 1;
  private memory: SharedArrayBuffer;

  constructor(memorySize: number = 1024 * 1024 * 64) { // Default 64MB RAM
    this.memory = new SharedArrayBuffer(memorySize);
    this.initializeSyscalls();
  }

  private initializeSyscalls() {
    // --- Logging ---
    this.registerSyscall('log', async (args: any[]) => {
      const priority = args[0] || 3; // ANDROID_LOG_DEBUG
      const tag = args[1] || 'Android';
      const message = args[2] || '';
      
      const levels = ['UNKNOWN', 'DEFAULT', 'VERBOSE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
      const levelStr = levels[priority] || 'INFO';
      
      console.log(`[AndroidRuntime][${levelStr}] ${tag}: ${message}`);
      return 0;
    });

    // --- File I/O ---
    this.registerSyscall('open', async (args: any[]) => {
      const path = args[0];
      const flags = args[1] || 0;
      
      if (!this.fileSystem.has(path)) {
          console.warn(`[AndroidRuntime] File not found: ${path}`);
          return -1; // ENOENT
      }

      const fd = this.nextFd++;
      this.openFiles.set(fd, { path, position: 0, flags });
      console.log(`[AndroidRuntime] Opened file '${path}' with fd ${fd}`);
      return fd;
    });

    this.registerSyscall('read', async (args: any[]) => {
      const fd = args[0];
      const buffer = args[1]; // Uint8Array or pointer
      const count = args[2];
      
      const fileDesc = this.openFiles.get(fd);
      if (!fileDesc) return -1; // EBADF

      const fileData = this.fileSystem.get(fileDesc.path);
      if (!fileData) return -1;

      const bytesRead = Math.min(count, fileData.length - fileDesc.position);
      if (bytesRead <= 0) return 0; // EOF

      // If buffer is a pointer (number), we'd write to this.memory
      // If buffer is Uint8Array (JS simulation), we copy directly
      if (buffer instanceof Uint8Array) {
          buffer.set(fileData.subarray(fileDesc.position, fileDesc.position + bytesRead));
      } else {
          // TODO: Write to SharedArrayBuffer at pointer 'buffer'
          // const heap = new Uint8Array(this.memory);
          // heap.set(fileData.subarray(fileDesc.position, fileDesc.position + bytesRead), buffer);
      }
      
      fileDesc.position += bytesRead;
      return bytesRead;
    });

    this.registerSyscall('write', async (args: any[]) => {
      const fd = args[0];
      // const buffer = args[1];
      const count = args[2];
      
      // Stdout/Stderr redirection
      if (fd === 1 || fd === 2) {
          const msg = new TextDecoder().decode(args[1].subarray(0, count));
          console.log(`[AndroidRuntime][STDOUT/ERR] ${msg}`);
          return count;
      }

      // TODO: Implement file writing
      return count;
    });

    this.registerSyscall('close', async (args: any[]) => {
      const fd = args[0];
      if (this.openFiles.delete(fd)) {
      return 0;
      }
      return -1;
    });

    // --- Memory Management ---
    this.registerSyscall('mmap', async (args: any[]) => {
        // void *mmap(void *addr, size_t length, int prot, int flags, int fd, off_t offset);
        const addr = args[0];
        const length = args[1];
        const prot = args[2];
        const flags = args[3];
        const fd = args[4];
        const offset = args[5];

        console.log(`[AndroidRuntime] mmap request: addr=${addr}, len=${length}, fd=${fd}`);

        // Simple allocation simulation
        // In a real WASM runtime, this would interface with the WASM Memory.grow or a specific heap allocator
        return 0x10000; // Fake pointer
    });

    // --- Threading ---
    this.registerSyscall('pthread_create', async (args: any[]) => {
      const threadId = this.nextThreadId++;
      console.log(`[AndroidRuntime] Creating thread ${threadId}`);
      this.threads.set(threadId, { status: 'running' });
      return threadId;
    });

    this.registerSyscall('pthread_join', async (args: any[]) => {
      const threadId = args[0];
      console.log(`[AndroidRuntime] Joining thread ${threadId}`);
      this.threads.delete(threadId);
      return 0;
    });
  }

  /**
   * Register a syscall handler
   */
  registerSyscall(name: string, handler: (args: any[]) => Promise<any>) {
    this.syscalls.set(name, { name, handler });
  }

  /**
   * Execute a syscall
   */
  async executeSyscall(name: string, args: any[]): Promise<any> {
    const syscall = this.syscalls.get(name);
    if (!syscall) {
      console.warn(`[AndroidRuntime] Unknown syscall: ${name}`);
      return -1; // ENOSYS
    }
    return await syscall.handler(args);
  }

  /**
   * Read file from virtual filesystem
   */
  readFile(path: string): Uint8Array | null {
    return this.fileSystem.get(path) || null;
  }

  /**
   * Write file to virtual filesystem
   */
  writeFile(path: string, data: Uint8Array): void {
    this.fileSystem.set(path, data);
  }

  /**
   * List files in directory
   */
  listFiles(directory: string): string[] {
    return Array.from(this.fileSystem.keys())
      .filter(path => path.startsWith(directory))
      .map(path => path.substring(directory.length));
  }
  
  /**
   * Access the shared memory of the runtime
   */
  getMemory(): SharedArrayBuffer {
      return this.memory;
  }
}
