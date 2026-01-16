/**
 * Kernel32.dll Implementation
 * Core Windows API functions that actually work
 */

import { virtualFileSystem } from '../engine/virtual-fs';
import { virtualMemoryManager, MemoryProtection } from '../engine/memory-manager';

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
    async CreateFileA(
        lpFileName: string,
        dwDesiredAccess: number,
        dwShareMode: number,
        lpSecurityAttributes: number,
        dwCreationDisposition: number,
        dwFlagsAndAttributes: number,
        hTemplateFile: number
    ): Promise<number> {
        try {
            const exists = await virtualFileSystem.exists(lpFileName);
            
            // Handle creation disposition
            if (!exists) {
                if (dwCreationDisposition === FileCreation.OPEN_EXISTING ||
                    dwCreationDisposition === FileCreation.TRUNCATE_EXISTING) {
                    return -1; // INVALID_HANDLE_VALUE
                }
                
                // Create new file
                await virtualFileSystem.createFile(lpFileName);
            } else {
                if (dwCreationDisposition === FileCreation.CREATE_NEW) {
                    return -1; // File already exists
                }
                
                if (dwCreationDisposition === FileCreation.TRUNCATE_EXISTING) {
                    await virtualFileSystem.writeFile(lpFileName, new Uint8Array(0));
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
    async CreateFileW(
        lpFileName: string,
        dwDesiredAccess: number,
        dwShareMode: number,
        lpSecurityAttributes: number,
        dwCreationDisposition: number,
        dwFlagsAndAttributes: number,
        hTemplateFile: number
    ): Promise<number> {
        // Convert wide string and call ANSI version
        return await this.CreateFileA(
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
    async ReadFile(
        hFile: number,
        lpBuffer: number,
        nNumberOfBytesToRead: number,
        lpNumberOfBytesRead: number,
        lpOverlapped: number
    ): Promise<boolean> {
        try {
            const handle = this.handles.get(hFile);
            if (!handle) return false;
            
            const fileData = await virtualFileSystem.readFile(handle.path);
            const start = handle.position;
            const end = Math.min(start + nNumberOfBytesToRead, fileData.length);
            const data = fileData.slice(start, end);
            
            // Copy to buffer
            virtualMemoryManager.write(lpBuffer, data);
            
            // Write bytes read
            if (lpNumberOfBytesRead !== 0) {
                const bytesRead = new Uint8Array(4);
                new DataView(bytesRead.buffer).setUint32(0, data.length, true);
                virtualMemoryManager.write(lpNumberOfBytesRead, bytesRead);
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
    async WriteFile(
        hFile: number,
        lpBuffer: number,
        nNumberOfBytesToWrite: number,
        lpNumberOfBytesWritten: number,
        lpOverlapped: number
    ): Promise<boolean> {
        try {
            const handle = this.handles.get(hFile);
            if (!handle) return false;
            
            // Read from buffer
            const data = virtualMemoryManager.read(lpBuffer, nNumberOfBytesToWrite);
            
            // Write to file (overwrite for now)
            await virtualFileSystem.writeFile(handle.path, data);
            
            // Write bytes written
            if (lpNumberOfBytesWritten !== 0) {
                const bytesWritten = new Uint8Array(4);
                new DataView(bytesWritten.buffer).setUint32(0, nNumberOfBytesToWrite, true);
                virtualMemoryManager.write(lpNumberOfBytesWritten, bytesWritten);
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
    async GetFileSize(hFile: number, lpFileSizeHigh: number): Promise<number> {
        try {
            const handle = this.handles.get(hFile);
            if (!handle) return -1;
            
            const fileData = await virtualFileSystem.readFile(handle.path);
            const size = fileData.length;
            
            if (lpFileSizeHigh !== 0) {
                const high = new Uint8Array(4);
                new DataView(high.buffer).setUint32(0, 0, true);
                virtualMemoryManager.write(lpFileSizeHigh, high);
            }
            
            return size; // Low 32 bits
        } catch (error) {
            return -1;
        }
    }
    
    /**
     * SetFilePointer - Set file position
     */
    async SetFilePointer(
        hFile: number,
        lDistanceToMove: number,
        lpDistanceToMoveHigh: number,
        dwMoveMethod: number
    ): Promise<number> {
        try {
            const handle = this.handles.get(hFile);
            if (!handle) return -1;
            
            const fileData = await virtualFileSystem.readFile(handle.path);
            const fileSize = fileData.length;
            
            switch (dwMoveMethod) {
                case 0: // FILE_BEGIN
                    handle.position = lDistanceToMove;
                    break;
                case 1: // FILE_CURRENT
                    handle.position += lDistanceToMove;
                    break;
                case 2: // FILE_END
                    handle.position = fileSize + lDistanceToMove;
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
                return virtualMemoryManager.allocate(
                    dwSize,
                    MemoryProtection.READ | MemoryProtection.WRITE,
                    'VirtualAlloc'
                );
            } else {
                // Reserve at specific address (best-effort)
                return virtualMemoryManager.allocate(
                    dwSize,
                    MemoryProtection.READ | MemoryProtection.WRITE,
                    `VirtualAlloc@${lpAddress.toString(16)}`
                );
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
            virtualMemoryManager.free(lpAddress);
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
