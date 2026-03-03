/**
 * Challenger Runtime API (Experimental)
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

import { challengerRuntime, ChallengerRuntime, ChallengerConfig, ChallengerStatus, OSType } from '../nexus/challenger-runtime';
import { challengerJIT, ChallengerJITCompiler } from '../jit/challenger-jit-compiler';
import { challengerGPU, ChallengerGPURuntime } from '../gpu/challenger-gpu-runtime';
import { ChallengerBinaryExecutor, createBinaryExecutor } from '../execution/challenger-binary-executor';

/**
 * Main Challenger class for production use
 */
export class Challenger {
    private runtime: ChallengerRuntime;
    private jitCompiler: ChallengerJITCompiler;
    private gpuRuntime: ChallengerGPURuntime;
    private binaryExecutor: ChallengerBinaryExecutor | null = null;
    
    private isInitialized: boolean = false;

    constructor(config?: Partial<ChallengerConfig>) {
        this.runtime = config ? new ChallengerRuntime(config) : challengerRuntime;
        this.jitCompiler = challengerJIT;
        this.gpuRuntime = challengerGPU;
    }

    /**
     * Initialize Challenger runtime
     */
    async initialize(canvas: HTMLCanvasElement, container: HTMLElement): Promise<void> {
        if (this.isInitialized) {
            throw new Error('Challenger already initialized');
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
    getStatus(): ChallengerStatus {
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
     * Shutdown Challenger runtime
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
            throw new Error('Challenger not initialized. Call initialize() first.');
        }
    }
}

/**
 * Create a new Challenger instance
 */
export function createChallenger(config?: Partial<ChallengerConfig>): Challenger {
    return new Challenger(config);
}

/**
 * Quick start function for production use
 */
export async function startChallenger(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    osType: OSType = 'windows'
): Promise<Challenger> {
    const challenger = createChallenger();
    await challenger.initialize(canvas, container);
    await challenger.boot(osType);
    return challenger;
}

// Export all types
export {
    ChallengerRuntime,
    type ChallengerConfig,
    type ChallengerStatus,
    type OSType,
    ChallengerJITCompiler,
    ChallengerGPURuntime,
    ChallengerBinaryExecutor
};

// Export singleton for convenience
export const challenger = new Challenger();

// Export default
export default Challenger;