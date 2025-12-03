/**
 * Unified Memory Manager
 * Implements Zero-Copy Shared Memory Architecture for CPU, GPU, and I/O Workers.
 */

export class UnifiedMemory {
    private static instance: UnifiedMemory;
    private heap: SharedArrayBuffer;
    private view: DataView;
    private u8: Uint8Array;
    private f32: Float32Array;
    
    // Memory Layout
    // 0x00000000 - 0x00FFFFFF: Reserved / Kernel Space (16MB)
    // 0x01000000 - 0x0FFFFFFF: CPU Stack / Registers (240MB)
    // 0x10000000 - 0x1FFFFFFF: Framebuffer / Textures (256MB)
    // 0x20000000 - 0xFFFFFFFF: Application Heap (~3.5GB)
    
    private constructor(sizeMB: number = 256) { // Reduced default from 4096MB to 256MB to prevent crashes
        // Check for COOP/COEP
        const isIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
        
        try {
            if (!isIsolated) {
                console.warn('UnifiedMemory: Cross-Origin Isolation not active. SharedArrayBuffer will fail. Falling back to ArrayBuffer (No Threading).');
                this.heap = new ArrayBuffer(sizeMB * 1024 * 1024) as any; 
            } else {
                this.heap = new SharedArrayBuffer(sizeMB * 1024 * 1024);
            }
        } catch (e) {
            console.error('UnifiedMemory: Allocation Failed for', sizeMB, 'MB. Trying fallback to 64MB.');
            // Emergency Fallback
            if (!isIsolated) {
                this.heap = new ArrayBuffer(64 * 1024 * 1024) as any;
            } else {
                try {
                    this.heap = new SharedArrayBuffer(64 * 1024 * 1024);
                } catch (e2) {
                    console.error('UnifiedMemory: Critical Allocation Failure (64MB Shared). Fallback to ArrayBuffer.');
                    this.heap = new ArrayBuffer(64 * 1024 * 1024) as any;
                }
            }
        }
        
        this.view = new DataView(this.heap);
        this.u8 = new Uint8Array(this.heap);
        this.f32 = new Float32Array(this.heap);
        
        console.log(`UnifiedMemory: Allocated ${this.heap.byteLength / 1024 / 1024}MB Unified Heap`);
    }

    static getInstance(): UnifiedMemory {
        if (!UnifiedMemory.instance) {
            UnifiedMemory.instance = new UnifiedMemory();
        }
        return UnifiedMemory.instance;
    }

    getBuffer(): SharedArrayBuffer {
        return this.heap;
    }

    // Memory Accessors (Aliased)
    
    readU8(ptr: number): number { return this.u8[ptr]; }
    writeU8(ptr: number, val: number): void { this.u8[ptr] = val; }
    
    readU32(ptr: number): number { return this.view.getUint32(ptr, true); }
    writeU32(ptr: number, val: number): void { this.view.setUint32(ptr, val, true); }
    
    readF32(ptr: number): number { return this.view.getFloat32(ptr, true); }
    writeF32(ptr: number, val: number): void { this.view.setFloat32(ptr, val, true); }

    // Zero-Copy View Creation
    
    getSubView(ptr: number, length: number): Uint8Array {
        return new Uint8Array(this.heap, ptr, length);
    }

    getFramebufferView(width: number, height: number): Uint32Array {
        // Framebuffer starts at 0x10000000
        const fbStart = 0x10000000;
        // Ensure we don't go out of bounds if heap is smaller than standard offset
        if (fbStart + (width * height * 4) > this.heap.byteLength) {
             // Dynamically allocate separate buffer if heap too small (Fallback behavior)
             // In a real kernel, we would remap, but here we just warn and return a detached buffer to avoid crash
             console.warn('UnifiedMemory: Heap too small for fixed framebuffer offset. Returning detached buffer.');
             return new Uint32Array(width * height);
        }
        return new Uint32Array(this.heap, fbStart, width * height);
    }
}

export const memoryManager = UnifiedMemory.getInstance();
