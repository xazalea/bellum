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
    
    private constructor(sizeMB: number = 4096) {
        // Check for COOP/COEP
        const isIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
        if (!isIsolated) {
            console.warn('UnifiedMemory: Cross-Origin Isolation not active. SharedArrayBuffer will fail. Falling back to ArrayBuffer (No Threading).');
            this.heap = new ArrayBuffer(sizeMB * 1024 * 1024) as any; // Fallback cast
        } else {
            this.heap = new SharedArrayBuffer(sizeMB * 1024 * 1024);
        }
        
        this.view = new DataView(this.heap);
        this.u8 = new Uint8Array(this.heap);
        this.f32 = new Float32Array(this.heap);
        
        console.log(`UnifiedMemory: Allocated ${sizeMB}MB Unified Heap`);
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
        return new Uint32Array(this.heap, fbStart, width * height);
    }
}

export const memoryManager = UnifiedMemory.getInstance();
