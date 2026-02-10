/**
 * Runtime Manager - Complete Implementation
 * 
 * Manages binary execution using PerfectRuntime
 * Handles lifecycle: initialize → load → execute → stop
 * Provides status updates and error handling
 */

import { FileType, BinaryAnalyzer } from './analyzers/binary-analyzer';
import { puterClient } from '../storage/hiberfile';
import { perfectRuntime, type ExecutionResult } from '../integration/perfect-runtime';

export interface RuntimeConfig {
    memory: number; // MB
    vfsMounts: string[];
    env: Record<string, string>;
}

export interface RuntimeStatus {
    state: 'idle' | 'initializing' | 'loading' | 'running' | 'paused' | 'stopped' | 'error';
    message: string;
    detail?: string;
    progress?: number; // 0-100
}

export interface RuntimeStatistics {
    instructionsExecuted: number;
    executionTime: number;
    memoryUsed: number;
    fps?: number;
    cyclesPerSecond?: number;
}

/**
 * Runtime Manager - Singleton
 */
export class RuntimeManager {
    private static instance: RuntimeManager;
    private canvas: HTMLCanvasElement | null = null;
    private isInitialized: boolean = false;
    private isRunning: boolean = false;
    private currentBinary: ArrayBuffer | null = null;
    private currentType: FileType | null = null;
    private executionResult: ExecutionResult | null = null;
    private statusCallback: ((status: RuntimeStatus) => void) | null = null;
    private animationFrameId: number | null = null;
    
    private constructor() {}

    /**
     * Get singleton instance
     */
    static getInstance(): RuntimeManager {
        if (!RuntimeManager.instance) {
            RuntimeManager.instance = new RuntimeManager();
        }
        return RuntimeManager.instance;
    }

    /**
     * Initialize runtime with canvas for rendering
     */
    async initialize(canvas: HTMLCanvasElement): Promise<void> {
        if (this.isInitialized) {
            console.log('[RuntimeManager] Already initialized');
            return;
        }
        
        try {
            this.updateStatus({ state: 'initializing', message: 'Initializing runtime...' });
            
            this.canvas = canvas;
            
            // Initialize PerfectRuntime
            await perfectRuntime.initialize(canvas);
            
            this.isInitialized = true;
            this.updateStatus({ state: 'idle', message: 'Runtime ready' });
            
            console.log('[RuntimeManager] Initialization complete');
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.updateStatus({ state: 'error', message: 'Initialization failed', detail: errorMsg });
            throw error;
        }
    }

    /**
     * Prepare runtime - analyze file and create config
     */
    async prepareRuntime(filePath: string): Promise<{ type: FileType, config: RuntimeConfig }> {
        this.updateStatus({ state: 'loading', message: 'Analyzing file...', progress: 10 });
        
        // Read first 4KB for header analysis
        const headerChunk = await puterClient.readChunk(filePath, 0, 4096);
        let type = await BinaryAnalyzer.detectType(headerChunk);

        // Heuristic: If ZIP, check file extension or internals to see if it's APK
        if (type === FileType.ZIP) {
            if (filePath.toLowerCase().endsWith('.apk')) {
                type = FileType.APK;
            }
        }
        
        // Fallback: ISO -> PE_EXE logic (auto-boot Windows)
        if (filePath.toLowerCase().endsWith('.iso')) {
            type = FileType.PE_EXE; // Treat as x86 bootable
        }

        console.log(`[RuntimeManager] Detected file type: ${type}`);

        return {
             type,
             config: this.generateConfig(type, filePath)
        };
    }

    /**
     * Generate runtime configuration based on file type
     */
    private generateConfig(type: FileType, filePath: string): RuntimeConfig {
        switch (type) {
            case FileType.PE_EXE:
                return {
                    memory: 512,
                    vfsMounts: [filePath],
                    env: { 'PATH': 'C:\\Windows' }
                };
            case FileType.APK:
                return {
                    memory: 1024,
                    vfsMounts: [filePath],
                    env: { 'ANDROID_ROOT': '/system' }
                };
            default:
                 // Fallback for unknown types (treat as generic x86)
                 return {
                    memory: 256,
                    vfsMounts: [filePath],
                    env: {}
                 };
        }
    }

    /**
     * Load binary file
     */
    async loadBinary(filePath: string): Promise<void> {
        try {
            this.updateStatus({ state: 'loading', message: 'Loading binary...', progress: 30 });
            
            // Read entire file
            const blob = await puterClient.readFile(filePath);
            this.currentBinary = await blob.arrayBuffer();
            
            // Detect type
            const headerChunk = this.currentBinary.slice(0, 4096);
            this.currentType = await BinaryAnalyzer.detectType(headerChunk);
            
            // Handle APK extension override
            if (this.currentType === FileType.ZIP && filePath.toLowerCase().endsWith('.apk')) {
                this.currentType = FileType.APK;
            }
            
            this.updateStatus({ state: 'loading', message: 'Binary loaded', progress: 50 });
            
            console.log(`[RuntimeManager] Loaded ${this.currentBinary.byteLength} bytes (${this.currentType})`);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.updateStatus({ state: 'error', message: 'Failed to load binary', detail: errorMsg });
            throw error;
        }
    }

    /**
     * Execute loaded binary
     */
    async execute(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Runtime not initialized');
        }
        
        if (!this.currentBinary || !this.currentType) {
            throw new Error('No binary loaded');
        }
        
        try {
            this.updateStatus({ state: 'loading', message: 'Starting execution...', progress: 70 });
            this.isRunning = true;
            
            // Execute based on type
            if (this.currentType === FileType.PE_EXE) {
                this.updateStatus({ state: 'running', message: 'Running Windows EXE...' });
                this.executionResult = await perfectRuntime.executeWindows(this.currentBinary);
            } else if (this.currentType === FileType.APK) {
                this.updateStatus({ state: 'running', message: 'Running Android APK...' });
                this.executionResult = await perfectRuntime.executeAndroid(this.currentBinary);
            } else {
                throw new Error(`Unsupported file type: ${this.currentType}`);
            }
            
            // Start render loop (for real-time updates)
            this.startRenderLoop();
            
            this.updateStatus({ state: 'running', message: 'Execution complete', progress: 100 });
            
            console.log('[RuntimeManager] Execution finished:', this.executionResult);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.updateStatus({ state: 'error', message: 'Execution failed', detail: errorMsg });
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Launch - convenience method that loads and executes
     */
    async launch(container: HTMLElement, type: FileType, filePath: string, config: RuntimeConfig): Promise<void> {
        try {
            // Create canvas if not exists
            if (!this.canvas) {
                const canvas = document.createElement('canvas');
                canvas.width = container.clientWidth || 800;
                canvas.height = container.clientHeight || 600;
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                container.appendChild(canvas);
                await this.initialize(canvas);
            } else if (!this.isInitialized) {
                await this.initialize(this.canvas);
            }
            
            // Load binary
            await this.loadBinary(filePath);
            
            // Execute
            await this.execute();
        } catch (error) {
            console.error('[RuntimeManager] Launch failed:', error);
            throw error;
        }
    }

    /**
     * Pause execution
     */
    pause(): void {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.stopRenderLoop();
        this.updateStatus({ state: 'paused', message: 'Execution paused' });
        
        console.log('[RuntimeManager] Paused');
    }

    /**
     * Resume execution
     */
    resume(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startRenderLoop();
        this.updateStatus({ state: 'running', message: 'Execution resumed' });
        
        console.log('[RuntimeManager] Resumed');
    }

    /**
     * Stop execution
     */
    stop(): void {
        this.isRunning = false;
        this.stopRenderLoop();
        this.currentBinary = null;
        this.currentType = null;
        this.executionResult = null;
        this.updateStatus({ state: 'stopped', message: 'Execution stopped' });
        
        console.log('[RuntimeManager] Stopped');
    }

    /**
     * Get execution status
     */
    getStatus(): RuntimeStatus {
        if (!this.isInitialized) {
            return { state: 'idle', message: 'Not initialized' };
        }
        if (this.isRunning) {
            return { state: 'running', message: 'Executing' };
        }
        return { state: 'idle', message: 'Ready' };
    }

    /**
     * Get execution statistics
     */
    getStatistics(): RuntimeStatistics {
        if (!this.executionResult) {
            return {
                instructionsExecuted: 0,
                executionTime: 0,
                memoryUsed: 0,
            };
        }
        
        const runtimeStats = perfectRuntime.getStatistics();
        
        return {
            instructionsExecuted: this.executionResult.instructionsExecuted,
            executionTime: this.executionResult.executionTimeMs,
            memoryUsed: runtimeStats.memory.usedSize,
            cyclesPerSecond: this.executionResult.cyclesElapsed / (this.executionResult.executionTimeMs / 1000),
        };
    }

    /**
     * Set status callback for UI updates
     */
    setStatusCallback(callback: (status: RuntimeStatus) => void): void {
        this.statusCallback = callback;
    }

    /**
     * Update status and notify callback
     */
    private updateStatus(status: RuntimeStatus): void {
        if (this.statusCallback) {
            this.statusCallback(status);
        }
    }

    /**
     * Start render loop for real-time updates
     */
    private startRenderLoop(): void {
        if (this.animationFrameId !== null) return;
        
        const loop = () => {
            if (!this.isRunning) return;
            
            // Run physics/update cycle
            try {
                perfectRuntime.runPhysics(1/60); // 60 FPS
            } catch (error) {
                console.error('[RuntimeManager] Render loop error:', error);
            }
            
            this.animationFrameId = requestAnimationFrame(loop);
        };
        
        this.animationFrameId = requestAnimationFrame(loop);
    }

    /**
     * Stop render loop
     */
    private stopRenderLoop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Shutdown runtime completely
     */
    async shutdown(): Promise<void> {
        this.stop();
        
        if (this.isInitialized) {
            await perfectRuntime.shutdown();
            this.isInitialized = false;
        }
        
        this.canvas = null;
        
        console.log('[RuntimeManager] Shutdown complete');
    }

    /**
     * Get active loader (for backwards compatibility)
     */
    getActiveLoader(): any {
        return {
            onStatusUpdate: (callback: (status: string, detail?: string) => void) => {
                this.setStatusCallback((status) => callback(status.message, status.detail));
            }
        };
    }
}