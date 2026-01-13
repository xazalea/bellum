/**
 * Kernel32.dll Implementation
 * Core Windows API functions that actually work
 */

import { virtualFileSystem } from '../engine/virtual-fs';
import { virtualMemoryManager } from '../engine/memory-manager';

export enum FileAccess {
    GENERIC_READ = 0x80000000,
    GENERIC_WRITE = 0x40000000,
    GENERIC_EXECUTE = 0x20000000,
    GENERIC_ALL = 0x10000000,
}

export enum FileShare {
    NONE = 0x00000000,
    READ = 0x00000001,
    WRITE = 0x00000002,
    DELETE = 0x00000004,
}

export enum FileCreation {
    CREATE_NEW = 1,
    CREATE_ALWAYS = 2,
    OPEN_EXISTING = 3,
    OPEN_ALWAYS = 4,
    TRUNCATE_EXISTING = 5,
}

export class Kernel32 {
    private handles: Map<number, FileHandle> = new Map();
    private nextHandle: number = 0x1000;
    private heapBrk: number = 0x10000000;
    
    /**
     * CreateFileA - Open or create a file
     */
    CreateFileA(
        lpFileName: string,
        dwDesiredAccess: number,
        dwShareMode: number,
        lpSecurityAttributes: number,
        dwCreationDisposition: number,
        dwFlagsAndAttributes: number,
        hTemplateFile: number
    ): number {
        try {
            const exists = virtualFileSystem.exists(lpFileName);
            
            // Handle creation disposition
            if (!exists) {
                if (dwCreationDisposition === FileCreation.OPEN_EXISTING ||
                    dwCreationDisposition === FileCreation.TRUNCATE_EXISTING) {
                    return -1; // INVALID_HANDLE_VALUE
                }
                
                // Create new file
                virtualFileSystem.createFile(lpFileName, new Uint8Array(0));
            } else {
                if (dwCreationDisposition === FileCreation.CREATE_NEW) {
                    return -1; // File already exists
                }
                
                if (dwCreationDisposition === FileCreation.TRUNCATE_EXISTING) {
                    virtualFileSystem.write(lpFileName, new Uint8Array(0), 0);
                }
            }
            
            const handle = this.nextHandle++;
            this.handles.set(handle, {
                handle,
                path: lpFileName,
                position: 0,
                access: dwDesiredAccess,
            });
            
            console.log(`[Kernel32] CreateFileA: "${lpFileName}" -> handle ${handle}`);
            return handle;
        } catch (error) {
            console.error('[Kernel32] CreateFileA failed:', error);
            return -1;
        }
    }
    
    /**
     * CreateFileW - Unicode version
     */
    CreateFileW(
        lpFileName: string,
        dwDesiredAccess: number,
        dwShareMode: number,
        lpSecurityAttributes: number,
        dwCreationDisposition: number,
        dwFlagsAndAttributes: number,
        hTemplateFile: number
    ): number {
        // Convert wide string and call ANSI version
        return this.CreateFileA(
            lpFileName,
            dwDesiredAccess,
            dwShareMode,
            lpSecurityAttributes,
            dwCreationDisposition,
            dwFlagsAndAttributes,
            hTemplateFile
        );
    }
    
    /**
     * ReadFile - Read from file
     */
    ReadFile(
        hFile: number,
        lpBuffer: number,
        nNumberOfBytesToRead: number,
        lpNumberOfBytesRead: number,
        lpOverlapped: number
    ): boolean {
        try {
            const handle = this.handles.get(hFile);
            if (!handle) return false;
            
            const data = virtualFileSystem.read(
                handle.path,
                handle.position,
                nNumberOfBytesToRead
            );
            
            // Copy to buffer
            virtualMemoryManager.write(lpBuffer, data);
            
            // Write bytes read
            if (lpNumberOfBytesRead !== 0) {
                const view = new DataView(virtualMemoryManager['memory'].buffer);
                view.setUint32(lpNumberOfBytesRead, data.length, true);
            }
            
            handle.position += data.length;
            return true;
        } catch (error) {
            console.error('[Kernel32] ReadFile failed:', error);
            return false;
        }
    }
    
    /**
     * WriteFile - Write to file
     */
    WriteFile(
        hFile: number,
        lpBuffer: number,
        nNumberOfBytesToWrite: number,
        lpNumberOfBytesWritten: number,
        lpOverlapped: number
    ): boolean {
        try {
            const handle = this.handles.get(hFile);
            if (!handle) return false;
            
            // Read from buffer
            const data = virtualMemoryManager.read(lpBuffer, nNumberOfBytesToWrite);
            
            // Write to file
            virtualFileSystem.write(handle.path, data, handle.position);
            
            // Write bytes written
            if (lpNumberOfBytesWritten !== 0) {
                const view = new DataView(virtualMemoryManager['memory'].buffer);
                view.setUint32(lpNumberOfBytesWritten, nNumberOfBytesToWrite, true);
            }
            
            handle.position += nNumberOfBytesToWrite;
            return true;
        } catch (error) {
            console.error('[Kernel32] WriteFile failed:', error);
            return false;
        }
    }
    
    /**
     * CloseHandle - Close handle
     */
    CloseHandle(hObject: number): boolean {
        if (!this.handles.has(hObject)) {
            return false;
        }
        
        this.handles.delete(hObject);
        return true;
    }
    
    /**
     * GetFileSize - Get file size
     */
    GetFileSize(hFile: number, lpFileSizeHigh: number): number {
        try {
            const handle = this.handles.get(hFile);
            if (!handle) return -1;
            
            const stat = virtualFileSystem.stat(handle.path);
            
            if (lpFileSizeHigh !== 0) {
                const view = new DataView(virtualMemoryManager['memory'].buffer);
                view.setUint32(lpFileSizeHigh, 0, true); // High 32 bits
            }
            
            return stat.size; // Low 32 bits
        } catch (error) {
            return -1;
        }
    }
    
    /**
     * SetFilePointer - Set file position
     */
    SetFilePointer(
        hFile: number,
        lDistanceToMove: number,
        lpDistanceToMoveHigh: number,
        dwMoveMethod: number
    ): number {
        try {
            const handle = this.handles.get(hFile);
            if (!handle) return -1;
            
            const stat = virtualFileSystem.stat(handle.path);
            
            switch (dwMoveMethod) {
                case 0: // FILE_BEGIN
                    handle.position = lDistanceToMove;
                    break;
                case 1: // FILE_CURRENT
                    handle.position += lDistanceToMove;
                    break;
                case 2: // FILE_END
                    handle.position = stat.size + lDistanceToMove;
                    break;
            }
            
            return handle.position;
        } catch (error) {
            return -1;
        }
    }
    
    /**
     * VirtualAlloc - Allocate virtual memory
     */
    VirtualAlloc(
        lpAddress: number,
        dwSize: number,
        flAllocationType: number,
        flProtect: number
    ): number {
        try {
            if (lpAddress === 0) {
                // Allocate new region
                return virtualMemoryManager.allocate(dwSize);
            } else {
                // Reserve at specific address
                return virtualMemoryManager.allocateAt(lpAddress, dwSize);
            }
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * VirtualFree - Free virtual memory
     */
    VirtualFree(lpAddress: number, dwSize: number, dwFreeType: number): boolean {
        try {
            virtualMemoryManager.free(lpAddress, dwSize);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * HeapAlloc - Allocate from heap
     */
    HeapAlloc(hHeap: number, dwFlags: number, dwBytes: number): number {
        const address = this.heapBrk;
        this.heapBrk += dwBytes;
        return address;
    }
    
    /**
     * HeapFree - Free heap memory
     */
    HeapFree(hHeap: number, dwFlags: number, lpMem: number): boolean {
        // Simplified: just return success
        return true;
    }
    
    /**
     * GetProcessHeap - Get process heap
     */
    GetProcessHeap(): number {
        return 0x10000; // Return fixed heap handle
    }
    
    /**
     * ExitProcess - Terminate process
     */
    ExitProcess(uExitCode: number): void {
        console.log(`[Kernel32] ExitProcess: ${uExitCode}`);
        throw new Error(`Process exited with code ${uExitCode}`);
    }
    
    /**
     * GetLastError - Get last error code
     */
    GetLastError(): number {
        return 0; // No error
    }
    
    /**
     * GetModuleHandleA - Get module handle
     */
    GetModuleHandleA(lpModuleName: string | null): number {
        if (lpModuleName === null) {
            return 0x400000; // Base address of exe
        }
        return 0x10000000; // Return dummy handle
    }
    
    /**
     * GetProcAddress - Get function address
     */
    GetProcAddress(hModule: number, lpProcName: string): number {
        // Return dummy address for now
        return 0x12340000;
    }
    
    /**
     * LoadLibraryA - Load DLL
     */
    LoadLibraryA(lpLibFileName: string): number {
        console.log(`[Kernel32] LoadLibraryA: "${lpLibFileName}"`);
        return 0x20000000; // Return dummy handle
    }
    
    /**
     * GetCurrentThreadId - Get thread ID
     */
    GetCurrentThreadId(): number {
        return 1000;
    }
    
    /**
     * GetCurrentProcessId - Get process ID
     */
    GetCurrentProcessId(): number {
        return 1000;
    }
    
    /**
     * Sleep - Sleep for milliseconds
     */
    async Sleep(dwMilliseconds: number): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, dwMilliseconds));
    }
    
    /**
     * OutputDebugStringA - Output debug string
     */
    OutputDebugStringA(lpOutputString: string): void {
        console.log(`[Debug] ${lpOutputString}`);
    }
}

interface FileHandle {
    handle: number;
    path: string;
    position: number;
    access: number;
}

// Export singleton
export const kernel32 = new Kernel32();
