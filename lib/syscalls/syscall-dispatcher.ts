/**
 * System Call Dispatcher
 * Implements actual Linux/Windows/Android syscalls
 * This is the critical missing piece for real execution
 */

import { virtualMemoryManager } from '../engine/memory-manager';
import { virtualFileSystem } from '../engine/virtual-fs';

// System call numbers (Linux x86_64)
export enum SyscallNumber {
    // File operations
    READ = 0,
    WRITE = 1,
    OPEN = 2,
    CLOSE = 3,
    STAT = 4,
    FSTAT = 5,
    LSEEK = 8,
    
    // Memory operations
    MMAP = 9,
    MUNMAP = 11,
    BRK = 12,
    
    // Process operations
    EXIT = 60,
    FORK = 57,
    EXECVE = 59,
    WAIT4 = 61,
    GETPID = 39,
    
    // I/O operations
    IOCTL = 16,
    READV = 19,
    WRITEV = 20,
    
    // Time operations
    GETTIMEOFDAY = 96,
    TIME = 201,
    
    // System information
    UNAME = 63,
    SYSINFO = 99,
}

export interface SyscallContext {
    rax: number;  // Syscall number / return value
    rdi: number;  // Arg 1
    rsi: number;  // Arg 2
    rdx: number;  // Arg 3
    r10: number;  // Arg 4
    r8: number;   // Arg 5
    r9: number;   // Arg 6
    memory: Uint8Array;
}

export class SyscallDispatcher {
    private openFiles: Map<number, FileDescriptor> = new Map();
    private nextFd: number = 3; // 0=stdin, 1=stdout, 2=stderr
    
    constructor() {
        // Initialize standard file descriptors
        this.openFiles.set(0, { fd: 0, path: '/dev/stdin', flags: 0, position: 0 });
        this.openFiles.set(1, { fd: 1, path: '/dev/stdout', flags: 1, position: 0 });
        this.openFiles.set(2, { fd: 2, path: '/dev/stderr', flags: 1, position: 0 });
    }
    
    /**
     * Dispatch system call
     */
    dispatch(context: SyscallContext): number {
        const syscallNum = context.rax;
        
        try {
            switch (syscallNum) {
                case SyscallNumber.READ:
                    return this.sys_read(context);
                case SyscallNumber.WRITE:
                    return this.sys_write(context);
                case SyscallNumber.OPEN:
                    return this.sys_open(context);
                case SyscallNumber.CLOSE:
                    return this.sys_close(context);
                case SyscallNumber.STAT:
                    return this.sys_stat(context);
                case SyscallNumber.FSTAT:
                    return this.sys_fstat(context);
                case SyscallNumber.LSEEK:
                    return this.sys_lseek(context);
                case SyscallNumber.MMAP:
                    return this.sys_mmap(context);
                case SyscallNumber.MUNMAP:
                    return this.sys_munmap(context);
                case SyscallNumber.BRK:
                    return this.sys_brk(context);
                case SyscallNumber.EXIT:
                    return this.sys_exit(context);
                case SyscallNumber.GETPID:
                    return this.sys_getpid(context);
                case SyscallNumber.GETTIMEOFDAY:
                    return this.sys_gettimeofday(context);
                case SyscallNumber.TIME:
                    return this.sys_time(context);
                default:
                    console.warn(`[Syscall] Unimplemented syscall: ${syscallNum}`);
                    return -38; // ENOSYS
            }
        } catch (error) {
            console.error(`[Syscall] Error in syscall ${syscallNum}:`, error);
            return -14; // EFAULT
        }
    }
    
    /**
     * sys_read - read from file descriptor
     */
    private sys_read(context: SyscallContext): number {
        const fd = context.rdi;
        const buf = context.rsi;
        const count = context.rdx;
        
        const file = this.openFiles.get(fd);
        if (!file) return -9; // EBADF
        
        // Special handling for stdin
        if (fd === 0) {
            // Return empty read for now
            return 0;
        }
        
        try {
            const data = virtualFileSystem.read(file.path, file.position, count);
            
            // Copy to user buffer
            for (let i = 0; i < data.length; i++) {
                context.memory[buf + i] = data[i];
            }
            
            file.position += data.length;
            return data.length;
        } catch (error) {
            return -2; // ENOENT
        }
    }
    
    /**
     * sys_write - write to file descriptor
     */
    private sys_write(context: SyscallContext): number {
        const fd = context.rdi;
        const buf = context.rsi;
        const count = context.rdx;
        
        const file = this.openFiles.get(fd);
        if (!file) return -9; // EBADF
        
        // Get data from user buffer
        const data = new Uint8Array(count);
        for (let i = 0; i < count; i++) {
            data[i] = context.memory[buf + i];
        }
        
        // Special handling for stdout/stderr
        if (fd === 1 || fd === 2) {
            const text = new TextDecoder().decode(data);
            console.log(`[stdout] ${text}`);
            return count;
        }
        
        try {
            virtualFileSystem.write(file.path, data, file.position);
            file.position += count;
            return count;
        } catch (error) {
            return -28; // ENOSPC
        }
    }
    
    /**
     * sys_open - open file
     */
    private sys_open(context: SyscallContext): number {
        const pathname = context.rdi;
        const flags = context.rsi;
        const mode = context.rdx;
        
        // Read pathname string from memory
        let path = '';
        let offset = pathname;
        while (context.memory[offset] !== 0 && offset < pathname + 4096) {
            path += String.fromCharCode(context.memory[offset]);
            offset++;
        }
        
        try {
            // Check if file exists
            const exists = virtualFileSystem.exists(path);
            
            // Handle O_CREAT
            if (!exists && (flags & 0x40)) {
                virtualFileSystem.createFile(path, new Uint8Array(0));
            } else if (!exists) {
                return -2; // ENOENT
            }
            
            const fd = this.nextFd++;
            this.openFiles.set(fd, {
                fd,
                path,
                flags,
                position: 0,
            });
            
            return fd;
        } catch (error) {
            return -2; // ENOENT
        }
    }
    
    /**
     * sys_close - close file descriptor
     */
    private sys_close(context: SyscallContext): number {
        const fd = context.rdi;
        
        if (!this.openFiles.has(fd)) {
            return -9; // EBADF
        }
        
        this.openFiles.delete(fd);
        return 0;
    }
    
    /**
     * sys_stat - get file status
     */
    private sys_stat(context: SyscallContext): number {
        const pathname = context.rdi;
        const statbuf = context.rsi;
        
        // Read pathname
        let path = '';
        let offset = pathname;
        while (context.memory[offset] !== 0 && offset < pathname + 4096) {
            path += String.fromCharCode(context.memory[offset]);
            offset++;
        }
        
        try {
            const stat = virtualFileSystem.stat(path);
            
            // Write stat structure to memory
            const view = new DataView(context.memory.buffer, statbuf);
            view.setBigUint64(0, BigInt(stat.dev), true);     // st_dev
            view.setBigUint64(8, BigInt(stat.ino), true);     // st_ino
            view.setBigUint64(16, BigInt(stat.mode), true);   // st_mode
            view.setBigUint64(24, BigInt(stat.nlink), true);  // st_nlink
            view.setBigUint64(32, BigInt(stat.size), true);   // st_size
            
            return 0;
        } catch (error) {
            return -2; // ENOENT
        }
    }
    
    /**
     * sys_fstat - get file status by fd
     */
    private sys_fstat(context: SyscallContext): number {
        const fd = context.rdi;
        const statbuf = context.rsi;
        
        const file = this.openFiles.get(fd);
        if (!file) return -9; // EBADF
        
        try {
            const stat = virtualFileSystem.stat(file.path);
            
            // Write stat structure
            const view = new DataView(context.memory.buffer, statbuf);
            view.setBigUint64(0, BigInt(stat.dev), true);
            view.setBigUint64(8, BigInt(stat.ino), true);
            view.setBigUint64(16, BigInt(stat.mode), true);
            view.setBigUint64(24, BigInt(stat.nlink), true);
            view.setBigUint64(32, BigInt(stat.size), true);
            
            return 0;
        } catch (error) {
            return -2;
        }
    }
    
    /**
     * sys_lseek - reposition file offset
     */
    private sys_lseek(context: SyscallContext): number {
        const fd = context.rdi;
        const offset = context.rsi;
        const whence = context.rdx;
        
        const file = this.openFiles.get(fd);
        if (!file) return -9; // EBADF
        
        try {
            const stat = virtualFileSystem.stat(file.path);
            
            switch (whence) {
                case 0: // SEEK_SET
                    file.position = offset;
                    break;
                case 1: // SEEK_CUR
                    file.position += offset;
                    break;
                case 2: // SEEK_END
                    file.position = stat.size + offset;
                    break;
                default:
                    return -22; // EINVAL
            }
            
            return file.position;
        } catch (error) {
            return -2;
        }
    }
    
    /**
     * sys_mmap - map memory
     */
    private sys_mmap(context: SyscallContext): number {
        const addr = context.rdi;
        const length = context.rsi;
        const prot = context.rdx;
        const flags = context.r10;
        const fd = context.r8;
        const offset = context.r9;
        
        try {
            // Allocate memory region
            const address = virtualMemoryManager.allocate(length);
            
            // If mapping a file, read its contents
            if (fd !== -1) {
                const file = this.openFiles.get(fd);
                if (file) {
                    const data = virtualFileSystem.read(file.path, offset, length);
                    virtualMemoryManager.write(address, data);
                }
            }
            
            return address;
        } catch (error) {
            return -12; // ENOMEM
        }
    }
    
    /**
     * sys_munmap - unmap memory
     */
    private sys_munmap(context: SyscallContext): number {
        const addr = context.rdi;
        const length = context.rsi;
        
        try {
            virtualMemoryManager.free(addr, length);
            return 0;
        } catch (error) {
            return -22; // EINVAL
        }
    }
    
    /**
     * sys_brk - change data segment size
     */
    private sys_brk(context: SyscallContext): number {
        const addr = context.rdi;
        
        // Simple implementation: return current break
        // In reality, would expand heap
        return virtualMemoryManager.getHeapEnd();
    }
    
    /**
     * sys_exit - exit process
     */
    private sys_exit(context: SyscallContext): number {
        const status = context.rdi;
        console.log(`[Syscall] Process exiting with code ${status}`);
        throw new ProcessExitException(status);
    }
    
    /**
     * sys_getpid - get process ID
     */
    private sys_getpid(context: SyscallContext): number {
        return 1000; // Return fixed PID for now
    }
    
    /**
     * sys_gettimeofday - get time of day
     */
    private sys_gettimeofday(context: SyscallContext): number {
        const tv = context.rdi;
        const tz = context.rsi;
        
        const now = Date.now();
        const seconds = Math.floor(now / 1000);
        const microseconds = (now % 1000) * 1000;
        
        if (tv !== 0) {
            const view = new DataView(context.memory.buffer, tv);
            view.setBigInt64(0, BigInt(seconds), true);
            view.setBigInt64(8, BigInt(microseconds), true);
        }
        
        return 0;
    }
    
    /**
     * sys_time - get time in seconds
     */
    private sys_time(context: SyscallContext): number {
        const tloc = context.rdi;
        const seconds = Math.floor(Date.now() / 1000);
        
        if (tloc !== 0) {
            const view = new DataView(context.memory.buffer, tloc);
            view.setBigInt64(0, BigInt(seconds), true);
        }
        
        return seconds;
    }
}

interface FileDescriptor {
    fd: number;
    path: string;
    flags: number;
    position: number;
}

export class ProcessExitException extends Error {
    constructor(public exitCode: number) {
        super(`Process exited with code ${exitCode}`);
    }
}

// Export singleton
export const syscallDispatcher = new SyscallDispatcher();
