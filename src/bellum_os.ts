/**
 * BellumOS - Unified Operating System Entry Point
 * Orchestrates Android, Windows, and Distributed Runtimes
 * Integrates all 500 implementation items
 */

import { AndroidSystem } from './engine/android/system';
import { WindowsKernel } from './engine/windows/kernel';
import { WindowManager } from './engine/windows/gdi';
import { DistributedWindows } from './engine/windows/distributed_runtime';
import { webgpu } from './nacho/engine/webgpu-context';
import { vfs } from './engine/fs/virtual_fs';
import { p2pNode } from './nacho/net/p2p_node';
import { CreativeHacks } from './engine/hacks/runtime_hacks';
import { GpuMemoryManager } from './engine/hacks/gpu_memory';

export class BellumOS {
    public android: AndroidSystem;
    public windows: WindowsKernel;
    public win32WindowManager: WindowManager;
    public distributedWindows: DistributedWindows;
    public creativeHacks: CreativeHacks;
    public gpuMemory: GpuMemoryManager;

    private static instance: BellumOS;

    private constructor() {
        // Initialize Subsystems
        this.android = new AndroidSystem();
        this.windows = new WindowsKernel();
        this.win32WindowManager = new WindowManager();
        this.distributedWindows = new DistributedWindows(this.win32WindowManager);
        this.creativeHacks = new CreativeHacks();
        this.gpuMemory = new GpuMemoryManager();
    }

    public static getInstance(): BellumOS {
        if (!BellumOS.instance) {
            BellumOS.instance = new BellumOS();
        }
        return BellumOS.instance;
    }

    /**
     * Boot the entire OS
     */
    async boot(canvas: HTMLCanvasElement) {
        console.log("BellumOS: Boot sequence initiated...");

        // 1. Initialize Hardware (WebGPU, FS, Network)
        await webgpu.initialize(canvas);
        await vfs.initialize();
        // P2P initializes on import (via constructor)

        console.log("BellumOS: Hardware initialized.");
        console.log("BellumOS: Ready to launch Apps (APK/EXE).");

        // Example: Auto-mount SDCard if available
        // vfs.mountSDCard();
    }

    /**
     * Run an application (auto-detect type)
     */
    async run(file: File) {
        if (file.name.endsWith('.apk')) {
            console.log("BellumOS: Detected Android APK");
            await this.android.boot(file);
        } else if (file.name.endsWith('.exe')) {
            console.log("BellumOS: Detected Windows Executable");
            const buffer = await file.arrayBuffer();
            await this.windows.loadPE(buffer);
        } else {
            console.warn("BellumOS: Unknown file type");
        }
    }
}

// Export global instance
export const os = BellumOS.getInstance();
