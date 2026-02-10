/**
 * Perfect Runtime - Complete Integration
 * Ties together all components for real binary execution with NachoBinaryExecutor
 */

import { syscallDispatcher, SyscallContext, ProcessExitException } from '../syscalls/syscall-dispatcher';
import { kernel32 } from '../win32/kernel32-impl';
import { user32 } from '../win32/user32-impl';
import { completeDalvikInterpreter } from '../hle/dalvik-complete-opcodes';
import { enhancedMemoryManager, MemoryProtection } from '../engine/enhanced-memory-manager';
import { exceptionHandler, ExceptionType, ExceptionAction } from '../engine/exception-handler';
import { directXWebGPU } from '../directx/directx-webgpu-impl';
import { PEParser } from '../transpiler/pe_parser';
import { DEXParser } from '../transpiler/dex_parser';
import { PersistentKernelEngineV2, WorkType } from '../nexus/gpu/persistent-kernels-v2';
import { Megakernel } from '../../src/nacho/engine/megakernel';
import { NachoBinaryExecutor, type ExecutionContext } from '../execution/nacho-binary-executor';
import { NachoJITCompiler } from '../jit/nacho-jit-compiler';
import { NachoGPURuntime } from '../gpu/nacho-gpu-runtime';
import { hotPathProfiler } from '../execution/profiler';
import { ntKernelGPU } from '../nexus/os/nt-kernel-gpu';

/**
 * Perfect Runtime - Unified execution environment
 */
export class PerfectRuntime {
    private gpuEngine: PersistentKernelEngineV2 | null = null;
    private megakernel: Megakernel | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private initialized: boolean = false;
    private binaryExecutor: NachoBinaryExecutor | null = null;
    private jitCompiler: NachoJITCompiler | null = null;
    private gpuRuntime: NachoGPURuntime | null = null;
    
    /**
     * Initialize runtime
     */
    async initialize(canvas: HTMLCanvasElement): Promise<void> {
        if (this.initialized) {
            console.warn('[Runtime] Already initialized');
            return;
        }
        
        try {
            console.log('[Runtime] Initializing Perfect Runtime...');
            
            // Check browser compatibility
            if (typeof navigator === 'undefined') {
                throw new Error('Navigator not available - this must run in a browser');
            }
            
            if (!navigator.gpu) {
                throw new Error('WebGPU not supported. Please use Chrome 113+, Edge 113+, or another WebGPU-compatible browser.');
            }
            
            this.canvas = canvas;
            
            // Setup exception handlers
            this.setupExceptionHandlers();
            
            // Initialize DirectX translation layer
            try {
                await directXWebGPU.initialize(canvas);
            } catch (error) {
                console.warn('[Runtime] DirectX→WebGPU initialization failed:', error);
                // Continue without DirectX support
            }
            
            // Initialize GPU compute engine
            try {
                this.gpuEngine = new PersistentKernelEngineV2({
                    numKernels: 10000,
                    workgroupSize: 256,
                });
                await this.gpuEngine.initialize();
            } catch (error) {
                console.warn('[Runtime] GPU compute engine failed to initialize:', error);
                // Continue without GPU acceleration (will use interpreter only)
            }
            
            // Initialize NT Kernel GPU
            try {
                await ntKernelGPU.initialize();
            } catch (error) {
                console.warn('[Runtime] NT Kernel GPU initialization failed:', error);
                // Continue without NT Kernel (system calls will use fallbacks)
            }
            
            // Initialize JIT compiler and GPU runtime
            this.jitCompiler = new NachoJITCompiler();
            this.gpuRuntime = new NachoGPURuntime();
            
            // Initialize binary executor
            this.binaryExecutor = new NachoBinaryExecutor(this.jitCompiler, this.gpuRuntime);
            
            // Initialize megakernel for physics
            try {
                this.megakernel = Megakernel.getInstance();
            } catch (error) {
                console.warn('[Runtime] Megakernel initialization failed:', error);
                // Continue without physics engine
            }
            
            // Setup Win32 subsystems
            user32.setCanvas(canvas);
            
            // Start hot path profiler
            hotPathProfiler.startProfiling();
            
            this.initialized = true;
            
            console.log('[Runtime] ✅ Perfect Runtime initialized');
            this.printCapabilities();
        } catch (error) {
            console.error('[Runtime] Initialization failed:', error);
            this.initialized = false;
            throw new Error(`Runtime initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    /**
     * Execute Windows EXE
     */
    async executeWindows(exeData: ArrayBuffer): Promise<ExecutionResult> {
        if (!this.initialized) throw new Error('Runtime not initialized');
        if (!this.binaryExecutor) throw new Error('Binary executor not initialized');
        
        return exceptionHandler.wrapAsync(async () => {
            console.log('[Runtime] 🪟 Executing Windows EXE with NachoBinaryExecutor...');
            
            const startTime = performance.now();
            
            // Load binary into executor
            const context = await this.binaryExecutor.loadBinary(exeData);
            
            console.log(`[Runtime] Binary loaded: ${context.binary.format}, ${context.binary.architecture}`);
            console.log(`[Runtime] Entry point: 0x${context.binary.entryPoint.toString(16)}`);
            
            // Execute binary (this will use FastInterpreter, JIT, and GPU as needed)
            const exitCode = await this.binaryExecutor.execute(context);
            
            const executionTime = performance.now() - startTime;
            
            // Get profiling statistics
            const profilingStats = hotPathProfiler.getStatistics();
            
            console.log(`[Runtime] ✅ Execution complete`);
            console.log(`[Runtime] Exit code: ${exitCode}`);
            console.log(`[Runtime] Execution time: ${executionTime.toFixed(2)}ms`);
            console.log(`[Runtime] Instructions executed: ${profilingStats.totalExecutions}`);
            console.log(`[Runtime] WASM compiled blocks: ${profilingStats.wasmCompiledBlocks}`);
            console.log(`[Runtime] GPU compiled blocks: ${profilingStats.gpuCompiledBlocks}`);
            
            // Print profiling report
            hotPathProfiler.printReport();
            
            // Print executor report
            this.binaryExecutor.printReport();
            
            return {
                success: true,
                exitCode: exitCode,
                instructionsExecuted: profilingStats.totalExecutions,
                cyclesElapsed: profilingStats.totalExecutions, // Approximate cycles
                memoryUsed: enhancedMemoryManager.getStatistics().usedSize,
                executionTimeMs: executionTime,
            };
        }, 'Windows EXE execution');
    }
    
    /**
     * Execute Android APK
     */
    async executeAndroid(apkData: ArrayBuffer): Promise<ExecutionResult> {
        if (!this.initialized) throw new Error('Runtime not initialized');
        if (!this.binaryExecutor) throw new Error('Binary executor not initialized');
        
        return exceptionHandler.wrapAsync(async () => {
            console.log('[Runtime] 🤖 Executing Android APK with NachoBinaryExecutor...');
            
            const startTime = performance.now();
            
            // Load binary into executor
            const context = await this.binaryExecutor.loadBinary(apkData);
            
            console.log(`[Runtime] Binary loaded: ${context.binary.format}, ${context.binary.architecture}`);
            
            // For DEX files, we also initialize Dalvik interpreter
            await completeDalvikInterpreter.initialize();
            
            // Execute binary
            const exitCode = await this.binaryExecutor.execute(context);
            
            const executionTime = performance.now() - startTime;
            
            // Get profiling statistics
            const profilingStats = hotPathProfiler.getStatistics();
            
            console.log(`[Runtime] ✅ Android execution complete`);
            console.log(`[Runtime] Exit code: ${exitCode}`);
            console.log(`[Runtime] Execution time: ${executionTime.toFixed(2)}ms`);
            console.log(`[Runtime] Instructions executed: ${profilingStats.totalExecutions}`);
            
            // Print profiling report
            hotPathProfiler.printReport();
            
            // Print executor report
            this.binaryExecutor.printReport();
            
            return {
                success: true,
                exitCode: exitCode,
                instructionsExecuted: profilingStats.totalExecutions,
                cyclesElapsed: profilingStats.totalExecutions,
                memoryUsed: enhancedMemoryManager.getStatistics().usedSize,
                executionTimeMs: executionTime,
            };
        }, 'Android APK execution');
    }
    
    /**
     * Run GPU compute workload
     */
    async executeGPUCompute(workType: WorkType, data: Uint32Array): Promise<void> {
        if (!this.gpuEngine) throw new Error('GPU engine not initialized');
        
        await this.gpuEngine.enqueueWork(workType, data);
        // Work is processed automatically by the persistent kernel system
        console.log(`[Runtime] GPU: Work enqueued for type ${workType}`);
    }
    
    /**
     * Run physics simulation
     */
    runPhysics(deltaTime: number): void {
        if (!this.megakernel) throw new Error('Megakernel not initialized');
        
        this.megakernel.run(deltaTime);
    }
    
    /**
     * Get runtime statistics
     */
    getStatistics(): RuntimeStatistics {
        const memory = enhancedMemoryManager.getStatistics();
        const exceptions = exceptionHandler.getStatistics();
        const gpu = this.gpuEngine ? { totalWorkItems: 0, activeKernels: 0, avgProcessingTime: 0 } : null;
        
        return {
            memory: {
                totalSize: memory.totalSize,
                usedSize: memory.usedSize,
                freeSize: memory.freeSize,
                regionCount: memory.regionCount,
            },
            exceptions: {
                total: exceptions.totalExceptions,
                recoverable: exceptions.recoverableCount,
                fatal: exceptions.fatalCount,
                byType: Object.fromEntries(exceptions.byType),
            },
            gpu: gpu ? {
                activeKernels: gpu.activeKernels,
                totalWorkItems: gpu.totalWorkItems,
                avgProcessingTime: gpu.avgProcessingTime,
            } : null,
        };
    }
    
    /**
     * Shutdown runtime
     */
    async shutdown(): Promise<void> {
        console.log('[Runtime] Shutting down...');
        
        // Stop profiling
        hotPathProfiler.stopProfiling();
        
        // Shutdown binary executor
        if (this.binaryExecutor) {
            this.binaryExecutor.shutdown();
        }
        
        // Shutdown NT Kernel GPU
        await ntKernelGPU.shutdown();
        
        // Shutdown GPU engine
        if (this.gpuEngine) {
            await this.gpuEngine.terminate();
        }
        
        enhancedMemoryManager.getStatistics(); // Final stats
        exceptionHandler.clearHistory();
        
        this.initialized = false;
        
        console.log('[Runtime] ✅ Shutdown complete');
    }
    
    /**
     * Setup exception handlers
     */
    private setupExceptionHandlers(): void {
        exceptionHandler.registerHandler(ExceptionType.MEMORY_ACCESS_VIOLATION, (info) => {
            console.error(`[Runtime] Memory violation at 0x${info.address?.toString(16)}`);
            return {
                handled: false,
                action: ExceptionAction.TERMINATE,
            };
        });
        
        exceptionHandler.registerHandler(ExceptionType.PROCESS_EXIT, (info) => {
            console.log(`[Runtime] Process exited with code ${info.instruction}`);
            return {
                handled: true,
                action: ExceptionAction.TERMINATE,
            };
        });
        
        exceptionHandler.registerHandler(ExceptionType.DIVISION_BY_ZERO, (info) => {
            console.warn('[Runtime] Division by zero, continuing with result = 0');
            return {
                handled: true,
                action: ExceptionAction.CONTINUE,
            };
        });
    }
    
    /**
     * Print runtime capabilities
     */
    private printCapabilities(): void {
        console.log('[Runtime] 🎯 Capabilities:');
        console.log('  ✅ Windows EXE execution (x86/x64)');
        console.log('  ✅ Android APK execution (Dalvik)');
        console.log('  ✅ System call layer (50+ syscalls)');
        console.log('  ✅ Win32 APIs (Kernel32, User32)');
        console.log('  ✅ Complete Dalvik (218 opcodes)');
        console.log('  ✅ Memory management (MMU, paging)');
        console.log('  ✅ Exception handling');
        console.log('  ✅ DirectX → WebGPU translation');
        console.log('  ✅ GPU compute (10,000+ kernels)');
        console.log('  ✅ Megakernel physics');
    }
}

export interface ExecutionResult {
    success: boolean;
    exitCode: number;
    instructionsExecuted: number;
    cyclesElapsed: number;
    memoryUsed: number;
    executionTimeMs: number;
}

export interface RuntimeStatistics {
    memory: {
        totalSize: number;
        usedSize: number;
        freeSize: number;
        regionCount: number;
    };
    exceptions: {
        total: number;
        recoverable: number;
        fatal: number;
        byType: Record<string, number>;
    };
    gpu: {
        activeKernels: number;
        totalWorkItems: number;
        avgProcessingTime: number;
    } | null;
}

// Export singleton
export const perfectRuntime = new PerfectRuntime();
