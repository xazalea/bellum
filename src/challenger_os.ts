/**
 * ChallengerOS - Unified Operating System Entry Point
 * Orchestrates Android, Windows, and Distributed Runtimes
 * Integrates all 500 implementation items
 */

import { AndroidSystem } from './engine/android/system';
// import { WindowsKernel } from './engine/windows/kernel'; // Replaced by new Runtime
import { WindowsRuntime } from '@/lib/challenger/windows/runtime';
import { WindowManager } from './engine/windows/gdi';
import { DistributedWindows } from './engine/windows/distributed_runtime';
import { webgpu } from './challenger/engine/webgpu-context';
import { vfs } from './engine/fs/virtual_fs';
import { p2pNode } from './challenger/net/p2p_node';
import { CreativeHacks } from './engine/hacks/runtime_hacks';
import { GpuMemoryManager } from './engine/hacks/gpu_memory';

// New Subsystems
import { GpuPhysics } from './engine/physics/gpu_physics';
import { TieredWasmJit } from './engine/wasm/tiered_jit';
import { WasmMemoryManager } from './engine/wasm/memory_allocator';
import { BinaryECS } from './engine/ecs/binary_ecs';
import { ChunkGenerator } from './engine/world/chunk_generator';
import { DistributedCompute } from './engine/net/distributed_compute';
import { PETestGenerator } from '@/lib/challenger/windows/test-gen';
import { fabricCompute } from '@/lib/fabric/compute'; // Initializing Compute Service


export class ChallengerOS {
    public android: AndroidSystem;
    public windows: WindowsRuntime;
    public win32WindowManager: WindowManager;
    public distributedWindows: DistributedWindows;
    public creativeHacks: CreativeHacks;
    public gpuMemory: GpuMemoryManager;

    // Advanced Subsystems
    public physics: GpuPhysics;
    public wasmJit: TieredWasmJit;
    public wasmMemory: WasmMemoryManager;
    public ecs: BinaryECS;
    public worldGen: ChunkGenerator;
    public distributedCompute: DistributedCompute;

    private static instance: ChallengerOS;

    private constructor() {
        // Initialize Core Subsystems
        this.android = new AndroidSystem();
        // Adapter for WebGPU Context difference
        this.windows = new WindowsRuntime(webgpu as any);
        this.win32WindowManager = new WindowManager();
        this.distributedWindows = new DistributedWindows(this.win32WindowManager);
        this.creativeHacks = new CreativeHacks();
        this.gpuMemory = new GpuMemoryManager();

        // Initialize Advanced Subsystems
        this.physics = new GpuPhysics();
        this.wasmJit = new TieredWasmJit();
        this.wasmMemory = new WasmMemoryManager();
        this.ecs = new BinaryECS(100000); // 100k Entities
        this.worldGen = new ChunkGenerator();
        this.distributedCompute = new DistributedCompute();
    }

    public static getInstance(): ChallengerOS {
        if (!ChallengerOS.instance) {
            ChallengerOS.instance = new ChallengerOS();
        }
        return ChallengerOS.instance;
    }

    /**
     * Boot the entire OS
     */
    async boot(canvas: HTMLCanvasElement) {
        console.log("ChallengerOS: Boot sequence initiated...");

        // 1. Initialize Hardware (WebGPU, FS, Network)
        const gpuSuccess = await webgpu.initialize(canvas);
        if (!gpuSuccess) console.warn("ChallengerOS: WebGPU failed, falling back to CPU");

        await vfs.initialize();
        // P2P initializes on import (via constructor)
        // Ensure Compute Service is active
        const compute = fabricCompute;
        console.log("ChallengerOS: Fabrik Compute Service initialized.");

        console.log("ChallengerOS: Hardware initialized.");
        console.log("ChallengerOS: Ready to launch Apps (APK/EXE).");

        // Boot Windows Runtime
        await this.windows.boot();
        
        // Set canvas for rendering
        this.android.setCanvas(canvas);
        this.windows.setCanvas(canvas);

        // Example: Auto-mount SDCard if available
        // vfs.mountSDCard();
    }

    /**
     * Run an application (auto-detect type)
     */
    async run(file: File) {
        if (file.name === 'test.exe') {
            console.log("ChallengerOS: Running Internal Test Binary");
            const buffer = PETestGenerator.generateHelloWorld();
            await this.windows.loadPE(buffer);
            return;
        }

        if (file.name.endsWith('.apk')) {
            console.log("ChallengerOS: Detected Android APK");
            await this.android.boot(file);
        } else if (file.name.endsWith('.exe')) {
            console.log("ChallengerOS: Detected Windows Executable");
            const buffer = await file.arrayBuffer();
            await this.windows.loadPE(buffer);
        } else {
            console.warn("ChallengerOS: Unknown file type");
        }
    }
}

export function getChallengerOS(): ChallengerOS | null {
    if (typeof window === 'undefined') return null;
    return ChallengerOS.getInstance();
}

// Export a stable handle for client code; null during SSR/prerender.
export const os: ChallengerOS | null = getChallengerOS();
