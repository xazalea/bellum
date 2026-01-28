/**
 * Nacho Runtime API (Experimental)
 * 
 * ⚠️ WARNING: This is an experimental/aspirational implementation.
 * Most features are stubs and do not provide actual JIT compilation,
 * GPU compute, or binary execution capabilities.
 * 
 * For actual functionality, use:
 * - v86 emulator for x86/Windows emulation
 * - WebGPU for GPU benchmarking only
 * - Standard browser APIs for everything else
 */

import { nachoRuntime, NachoRuntime, NachoConfig, NachoStatus, OSType } from '../nexus/nacho-runtime';
import { nachoJIT, NachoJITCompiler } from '../jit/nacho-jit-compiler';
import { nachoGPU, NachoGPURuntime } from '../gpu/nacho-gpu-runtime';
import { NachoBinaryExecutor, createBinaryExecutor } from '../execution/nacho-binary-executor';

/**
 * Main Nacho class for production use
 */
export class Nacho {
    private runtime: NachoRuntime;
    private jitCompiler: NachoJITCompiler;
    private gpuRuntime: NachoGPURuntime;
    private binaryExecutor: NachoBinaryExecutor | null = null;
    
    private isInitialized: boolean = false;

    constructor(config?: Partial<NachoConfig>) {
        this.runtime = config ? new NachoRuntime(config) : nachoRuntime;
        this.jitCompiler = nachoJIT;
        this.gpuRuntime = nachoGPU;
    }

    /**
     * Initialize Nacho runtime
     */
    async initialize(canvas: HTMLCanvasElement, container: HTMLElement): Promise<void> {
        if (this.isInitialized) {
            throw new Error('Nacho already initialized');
        }

        // Initialize all components
        await Promise.all([
            this.jitCompiler.initialize(),
            this.gpuRuntime.initialize(),
            this.runtime.initialize(canvas, container)
        ]);

        // Create binary executor
        this.binaryExecutor = createBinaryExecutor(this.jitCompiler, this.gpuRuntime);

        this.isInitialized = true;
    }

    /**
     * Boot operating system
     */
    async boot(osType: OSType = 'windows'): Promise<void> {
        this.ensureInitialized();
        await this.runtime.boot(osType);
    }

    /**
     * Execute binary file (EXE/APK)
     */
    async executeBinary(binaryData: ArrayBuffer): Promise<number> {
        this.ensureInitialized();
        
        if (!this.binaryExecutor) {
            throw new Error('Binary executor not available');
        }

        const context = await this.binaryExecutor.loadBinary(binaryData);
        return await this.binaryExecutor.execute(context);
    }

    /**
     * Launch application
     */
    async launchApp(appId: string): Promise<void> {
        this.ensureInitialized();
        await this.runtime.launchApp(appId);
    }

    /**
     * Get current status
     */
    getStatus(): NachoStatus {
        return this.runtime.getStatus();
    }

    /**
     * Get JIT compiler statistics
     */
    getJITStats() {
        return this.jitCompiler.getStats();
    }

    /**
     * Get GPU statistics
     */
    getGPUStats() {
        return this.gpuRuntime.getStats();
    }

    /**
     * Print comprehensive performance report
     */
    printReport(): void {
        this.runtime.printReport();
        
        if (this.binaryExecutor) {
            this.binaryExecutor.printReport();
        }
    }

    /**
     * Shutdown Nacho runtime
     */
    async shutdown(): Promise<void> {
        await this.runtime.shutdown();
        this.jitCompiler.shutdown();
        this.gpuRuntime.shutdown();
        
        if (this.binaryExecutor) {
            this.binaryExecutor.shutdown();
        }

        this.isInitialized = false;
    }

    /**
     * Ensure runtime is initialized
     */
    private ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new Error('Nacho not initialized. Call initialize() first.');
        }
    }
}

/**
 * Create a new Nacho instance
 */
export function createNacho(config?: Partial<NachoConfig>): Nacho {
    return new Nacho(config);
}

/**
 * Quick start function for production use
 */
export async function startNacho(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    osType: OSType = 'windows'
): Promise<Nacho> {
    const nacho = createNacho();
    await nacho.initialize(canvas, container);
    await nacho.boot(osType);
    return nacho;
}

// Export all types
export {
    NachoRuntime,
    type NachoConfig,
    type NachoStatus,
    type OSType,
    NachoJITCompiler,
    NachoGPURuntime,
    NachoBinaryExecutor
};

// Export singleton for convenience
export const nacho = new Nacho();

// Export default
export default Nacho;
