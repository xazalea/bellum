/**
 * Custom Memory Management for Guest Execution
 * 
 * Features:
 * - Slab allocator for fast allocation/deallocation
 * - Wasm threads support for multi-threaded guest code
 * - Memory-mapped I/O regions
 * - Dirty region tracking
 */

export interface SlabConfig {
    slabSize: number;
    minObjectSize: number;
    maxObjectSize: number;
    numSlabs: number;
}

export interface Slab {
    id: number;
    baseAddress: number;
    size: number;
    objectSize: number;
    freeList: number[];
    allocated: Set<number>;
    memory: Uint8Array;
}

export interface MemoryRegion {
    name: string;
    base: number;
    size: number;
    permissions: 'r' | 'rw' | 'rwx';
    type: 'ram' | 'rom' | 'io' | 'stack' | 'heap';
    dirty: boolean;
    dirtyPages: Set<number>;
}

export interface ThreadContext {
    id: number;
    status: 'idle' | 'running' | 'blocked' | 'finished';
    stackPointer: number;
    basePointer: number;
    programCounter: number;
    localMemory: Uint8Array;
    sharedMemory: SharedArrayBuffer;
    messageQueue: ThreadMessage[];
}

export interface ThreadMessage {
    from: number;
    type: 'spawn' | 'sync' | 'lock' | 'unlock' | 'terminate';
    data: any;
}

export class SlabAllocator {
    private slabs: Map<number, Slab> = new Map();
    private regions: Map<string, MemoryRegion> = new Map();
    private baseAddress: number = 0x10000;
    private totalAllocated: number = 0;
    private pageSize: number = 4096;
    
    private config: SlabConfig = {
        slabSize: 64 * 1024,
        minObjectSize: 8,
        maxObjectSize: 4096,
        numSlabs: 32
    };
    
    constructor() {
        this.initSlabs();
    }
    
    private initSlabs(): void {
        let slabId = 0;
        
        for (let size = this.config.minObjectSize; size <= this.config.maxObjectSize; size *= 2) {
            const slab: Slab = {
                id: slabId++,
                baseAddress: this.baseAddress,
                size: this.config.slabSize,
                objectSize: size,
                freeList: [],
                allocated: new Set(),
                memory: new Uint8Array(this.config.slabSize)
            };
            
            const numObjects = Math.floor(this.config.slabSize / size);
            for (let i = 0; i < numObjects; i++) {
                slab.freeList.push(i * size);
            }
            
            this.slabs.set(size, slab);
            this.regions.set(`slab_${size}`, {
                name: `slab_${size}`,
                base: this.baseAddress,
                size: this.config.slabSize,
                permissions: 'rw',
                type: 'heap',
                dirty: false,
                dirtyPages: new Set()
            });
            
            this.baseAddress += this.config.slabSize;
        }
        
        this.totalAllocated = this.baseAddress - 0x10000;
        console.log(`[SlabAllocator] Initialized ${this.slabs.size} slabs, ${this.totalAllocated} bytes`);
    }
    
    allocate(size: number): number {
        const slabSize = this.findSlabSize(size);
        const slab = this.slabs.get(slabSize);
        
        if (!slab || slab.freeList.length === 0) {
            // Fallback to bump allocation
            return this.bumpAllocate(size);
        }
        
        const offset = slab.freeList.pop()!;
        const address = slab.baseAddress + offset;
        slab.allocated.add(offset);
        
        // Mark region as dirty
        const region = this.regions.get(`slab_${slabSize}`);
        if (region) {
            region.dirty = true;
            region.dirtyPages.add(Math.floor(offset / this.pageSize));
        }
        
        return address;
    }
    
    free(address: number): boolean {
        for (const [size, slab] of this.slabs) {
            if (address >= slab.baseAddress && address < slab.baseAddress + slab.size) {
                const offset = address - slab.baseAddress;
                if (slab.allocated.has(offset)) {
                    slab.allocated.delete(offset);
                    slab.freeList.push(offset);
                    return true;
                }
            }
        }
        return false;
    }
    
    private findSlabSize(size: number): number {
        let slabSize = this.config.minObjectSize;
        while (slabSize < size && slabSize <= this.config.maxObjectSize) {
            slabSize *= 2;
        }
        return slabSize;
    }
    
    private bumpAllocate(size: number): number {
        const alignedSize = (size + 15) & ~15;
        const address = this.baseAddress;
        this.baseAddress += alignedSize;
        this.totalAllocated += alignedSize;
        return address;
    }
    
    read(address: number, size: number): Uint8Array {
        const result = new Uint8Array(size);
        
        for (const slab of this.slabs.values()) {
            if (address >= slab.baseAddress && address < slab.baseAddress + slab.size) {
                const offset = address - slab.baseAddress;
                result.set(slab.memory.subarray(offset, offset + size));
                return result;
            }
        }
        
        return result;
    }
    
    write(address: number, data: Uint8Array): void {
        for (const slab of this.slabs.values()) {
            if (address >= slab.baseAddress && address < slab.baseAddress + slab.size) {
                const offset = address - slab.baseAddress;
                slab.memory.set(data, offset);
                
                const region = this.regions.get(`slab_${slab.objectSize}`);
                if (region) {
                    region.dirty = true;
                    region.dirtyPages.add(Math.floor(offset / this.pageSize));
                }
                return;
            }
        }
    }
    
    getDirtyRegions(): MemoryRegion[] {
        return Array.from(this.regions.values()).filter(r => r.dirty);
    }
    
    clearDirtyFlags(): void {
        for (const region of this.regions.values()) {
            region.dirty = false;
            region.dirtyPages.clear();
        }
    }
    
    getStats(): { totalAllocated: number; numSlabs: number; utilization: number } {
        let usedObjects = 0;
        let totalObjects = 0;
        
        for (const slab of this.slabs.values()) {
            usedObjects += slab.allocated.size;
            totalObjects += Math.floor(slab.size / slab.objectSize);
        }
        
        return {
            totalAllocated: this.totalAllocated,
            numSlabs: this.slabs.size,
            utilization: totalObjects > 0 ? usedObjects / totalObjects : 0
        };
    }
}

export class WasmThreadManager {
    private threads: Map<number, ThreadContext> = new Map();
    private nextThreadId: number = 1;
    private sharedMemory: SharedArrayBuffer;
    private sharedView: Int32Array;
    private maxThreads: number = navigator.hardwareConcurrency || 4;
    
    constructor(sharedMemorySize: number = 16 * 1024 * 1024) {
        this.sharedMemory = new SharedArrayBuffer(sharedMemorySize);
        this.sharedView = new Int32Array(this.sharedMemory);
        this.initMainThread();
    }
    
    private initMainThread(): void {
        const mainThread: ThreadContext = {
            id: 0,
            status: 'running',
            stackPointer: this.sharedMemory.byteLength - 1024,
            basePointer: this.sharedMemory.byteLength - 1024,
            programCounter: 0,
            localMemory: new Uint8Array(1024),
            sharedMemory: this.sharedMemory,
            messageQueue: []
        };
        
        this.threads.set(0, mainThread);
    }
    
    spawnThread(entryPoint: number, stackSize: number = 65536): number {
        if (this.threads.size >= this.maxThreads) {
            console.warn('[ThreadManager] Max threads reached');
            return -1;
        }
        
        const threadId = this.nextThreadId++;
        const stackBase = this.findFreeStackRegion(stackSize);
        
        const thread: ThreadContext = {
            id: threadId,
            status: 'idle',
            stackPointer: stackBase + stackSize - 16,
            basePointer: stackBase + stackSize - 16,
            programCounter: entryPoint,
            localMemory: new Uint8Array(stackSize),
            sharedMemory: this.sharedMemory,
            messageQueue: []
        };
        
        this.threads.set(threadId, thread);
        
        // Send spawn message
        this.sendMessage(0, threadId, 'spawn', { entryPoint, stackBase, stackSize });
        
        console.log(`[ThreadManager] Spawned thread ${threadId} at 0x${entryPoint.toString(16)}`);
        return threadId;
    }
    
    private findFreeStackRegion(size: number): number {
        let address = 0x1000;
        
        for (const thread of this.threads.values()) {
            const threadStackBase = thread.basePointer - thread.localMemory.length + 16;
            if (address + size > threadStackBase && address < threadStackBase + thread.localMemory.length) {
                address = threadStackBase + thread.localMemory.length + 0x1000;
            }
        }
        
        return address;
    }
    
    terminateThread(threadId: number): void {
        const thread = this.threads.get(threadId);
        if (thread) {
            thread.status = 'finished';
            this.threads.delete(threadId);
            console.log(`[ThreadManager] Terminated thread ${threadId}`);
        }
    }
    
    sendMessage(from: number, to: number, type: ThreadMessage['type'], data: any): void {
        const targetThread = this.threads.get(to);
        if (targetThread) {
            targetThread.messageQueue.push({ from, type, data });
        }
    }
    
    receiveMessage(threadId: number): ThreadMessage | undefined {
        const thread = this.threads.get(threadId);
        if (thread && thread.messageQueue.length > 0) {
            return thread.messageQueue.shift();
        }
        return undefined;
    }
    
    acquireLock(threadId: number, lockAddress: number): boolean {
        const lockIndex = lockAddress / 4;
        const oldValue = Atomics.compareExchange(
            this.sharedView,
            lockIndex,
            0,
            threadId
        );
        return oldValue === 0;
    }
    
    releaseLock(threadId: number, lockAddress: number): void {
        const lockIndex = lockAddress / 4;
        Atomics.compareExchange(
            this.sharedView,
            lockIndex,
            threadId,
            0
        );
    }
    
    wait(threadId: number, address: number, expectedValue: number, timeout: number = 0): 'ok' | 'timed-out' | 'not-equal' {
        const index = address / 4;
        const result = Atomics.wait(
            this.sharedView,
            index,
            expectedValue,
            timeout
        );
        return result as 'ok' | 'timed-out' | 'not-equal';
    }
    
    notify(address: number, count: number = 1): number {
        const index = address / 4;
        return Atomics.notify(this.sharedView, index, count);
    }
    
    getThreadStatus(threadId: number): ThreadContext['status'] | undefined {
        return this.threads.get(threadId)?.status;
    }
    
    getActiveThreads(): number[] {
        return Array.from(this.threads.keys())
            .filter(id => this.threads.get(id)?.status === 'running');
    }
    
    getSharedMemory(): SharedArrayBuffer {
        return this.sharedMemory;
    }
}

export class GPUMegakernelDispatcher {
    private device: GPUDevice | null = null;
    private pipelines: Map<string, GPUComputePipeline> = new Map();
    private bindGroups: Map<string, GPUBindGroup> = new Map();
    private buffers: Map<string, GPUBuffer> = new Map();
    private bufferSizes: Map<string, number> = new Map();
    private textures: Map<string, GPUTexture> = new Map();
    private commandQueue: GPUCommandBuffer[] = [];
    private initialized: boolean = false;
    
    async initialize(): Promise<boolean> {
        if (!navigator.gpu) {
            console.warn('[GPU] WebGPU not available');
            return false;
        }
        
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                console.warn('[GPU] No GPU adapter available');
                return false;
            }
            
            this.device = await adapter.requestDevice({
                requiredFeatures: [],
                requiredLimits: {
                    maxStorageBufferBindingSize: 1024 * 1024 * 1024,
                    maxComputeWorkgroupStorageSize: 32768,
                }
            });
            
            this.initialized = true;
            console.log('[GPU] WebGPU initialized successfully');
            return true;
        } catch (error) {
            console.error('[GPU] Failed to initialize:', error);
            return false;
        }
    }
    
    async createComputePipeline(
        name: string,
        shaderCode: string,
        entryPoint: string = 'main'
    ): Promise<boolean> {
        if (!this.device) return false;
        
        try {
            const shaderModule = this.device.createShaderModule({ code: shaderCode });
            
            const pipeline = this.device.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: shaderModule,
                    entryPoint
                }
            });
            
            this.pipelines.set(name, pipeline);
            console.log(`[GPU] Created compute pipeline: ${name}`);
            return true;
        } catch (error) {
            console.error(`[GPU] Failed to create pipeline ${name}:`, error);
            return false;
        }
    }
    
    createBuffer(name: string, size: number, usage: GPUBufferUsageFlags): GPUBuffer | null {
        if (!this.device) return null;
        
        const buffer = this.device.createBuffer({
            size,
            usage: usage | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        
        this.buffers.set(name, buffer);
        this.bufferSizes.set(name, size);
        return buffer;
    }
    
    writeBuffer(name: string, data: ArrayBuffer, offset: number = 0): void {
        const buffer = this.buffers.get(name);
        if (buffer && this.device) {
            this.device.queue.writeBuffer(buffer, offset, data);
        }
    }
    
    createTexture(
        name: string,
        width: number,
        height: number,
        format: GPUTextureFormat = 'rgba8unorm'
    ): GPUTexture | null {
        if (!this.device) return null;
        
        const texture = this.device.createTexture({
            size: { width, height },
            format,
            usage: GPUTextureUsage.STORAGE_BINDING | 
                   GPUTextureUsage.TEXTURE_BINDING |
                   GPUTextureUsage.COPY_SRC |
                   GPUTextureUsage.COPY_DST
        });
        
        this.textures.set(name, texture);
        return texture;
    }
    
    async dispatchMegakernel(
        pipelineName: string,
        workgroups: [number, number, number],
        bindings: { buffer?: string; texture?: string; offset?: number }[]
    ): Promise<void> {
        if (!this.device) return;
        
        const pipeline = this.pipelines.get(pipelineName);
        if (!pipeline) {
            console.error(`[GPU] Pipeline not found: ${pipelineName}`);
            return;
        }
        
        // Create bind group
        const bindGroupEntries: GPUBindGroupEntry[] = bindings.map((binding, index) => {
            if (binding.buffer) {
                const buffer = this.buffers.get(binding.buffer);
                if (buffer) {
                    return {
                        binding: index,
                        resource: { buffer, offset: binding.offset || 0 }
                    };
                }
            }
            if (binding.texture) {
                const texture = this.textures.get(binding.texture);
                if (texture) {
                    return {
                        binding: index,
                        resource: texture.createView()
                    };
                }
            }
            return { binding: index, resource: { buffer: this.buffers.values().next().value! } };
        });
        
        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: bindGroupEntries
        });
        
        // Create command encoder
        const commandEncoder = this.device.createCommandEncoder();
        const computePass = commandEncoder.beginComputePass();
        
        computePass.setPipeline(pipeline);
        computePass.setBindGroup(0, bindGroup);
        computePass.dispatchWorkgroups(...workgroups);
        computePass.end();
        
        this.device.queue.submit([commandEncoder.finish()]);
    }
    
    async readBuffer(name: string): Promise<ArrayBuffer | null> {
        const buffer = this.buffers.get(name);
        const size = this.bufferSizes.get(name);
        if (!buffer || !this.device || !size) return null;
        
        const stagingBuffer = this.device.createBuffer({
            size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(buffer, 0, stagingBuffer, 0, size);
        this.device.queue.submit([commandEncoder.finish()]);
        
        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const data = stagingBuffer.getMappedRange().slice(0);
        stagingBuffer.unmap();
        stagingBuffer.destroy();
        
        return data;
    }
    
    getBuffer(name: string): GPUBuffer | undefined {
        return this.buffers.get(name);
    }
    
    getTexture(name: string): GPUTexture | undefined {
        return this.textures.get(name);
    }
    
    isInitialized(): boolean {
        return this.initialized;
    }
    
    destroy(): void {
        for (const buffer of this.buffers.values()) {
            buffer.destroy();
        }
        // Textures are garbage collected in WebGPU
        this.buffers.clear();
        this.bufferSizes.clear();
        this.textures.clear();
        this.pipelines.clear();
        this.bindGroups.clear();
    }
}

export const slabAllocator = new SlabAllocator();
export const wasmThreadManager = new WasmThreadManager();
export const gpuDispatcher = new GPUMegakernelDispatcher();

export const gpuShaderLibrary = {
    vectorOps: `
struct Vec4 { x: f32, y: f32, z: f32, w: f32 }

@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(64)
fn vec_add(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= arrayLength(&input)) { return; }
    output[idx] = input[idx] + input[idx];
}

@compute @workgroup_size(64)
fn vec_mul(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= arrayLength(&input)) { return; }
    output[idx] = input[idx] * input[idx];
}

@compute @workgroup_size(64)
fn vec_dot(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    // Dot product would use shared memory reduction
    output[idx] = input[idx * 4] * input[idx * 4 + 1];
}
`,
    
    matrixOps: `
@group(0) @binding(0) var<storage, read> A: array<f32>;
@group(0) @binding(1) var<storage, read> B: array<f32>;
@group(0) @binding(2) var<storage, read_write> C: array<f32>;

@compute @workgroup_size(16, 16)
fn matmul(@builtin(global_invocation_id) id: vec3<u32>) {
    let row = id.x;
    let col = id.y;
    let N = 256u; // Matrix dimension
    
    var sum: f32 = 0.0;
    for (var k = 0u; k < N; k = k + 1u) {
        sum = sum + A[row * N + k] * B[k * N + col];
    }
    C[row * N + col] = sum;
}
`,
    
    memoryOps: `
@group(0) @binding(0) var<storage, read> src: array<u32>;
@group(0) @binding(1) var<storage, read_write> dst: array<u32>;

@compute @workgroup_size(64)
fn memcpy(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= arrayLength(&src)) { return; }
    dst[idx] = src[idx];
}

@compute @workgroup_size(64)
fn memset(@builtin(global_invocation_id) id: vec3<u32>, @builtin(num_workgroups) num: vec3<u32>) {
    let idx = id.x;
    let value = 0u; // Would be passed as uniform
    dst[idx] = value;
}
`,
    
    renderOps: `
@group(0) @binding(0) var framebuffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<storage, read> palette: array<vec4<u32>>;

@compute @workgroup_size(8, 8)
fn blit(@builtin(global_invocation_id) id: vec3<u32>) {
    let coord = vec2<i32>(id.xy);
    let color = palette[0]; // Simplified
    textureStore(framebuffer, coord, vec4<f32>(color) / 255.0);
}
`
};
