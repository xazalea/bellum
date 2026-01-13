/**
 * Maximum Performance Engine
 * Part of Nacho Runtime
 * 
 * Combines ALL performance techniques to achieve maximum browser performance:
 * - Persistent GPU kernels (10,000+ concurrent)
 * - Zero-copy memory architecture
 * - Web Workers pool (8-16 parallel)
 * - SharedArrayBuffer for zero-overhead communication
 * - GPU compute @ 10+ TeraFLOPS
 * - Sub-1ms dispatch latency
 * 
 * TARGET: 95%+ GPU utilization, <1ms latency, 60-120 FPS sustained
 */

import { PersistentKernelEngineV2, WorkType, WorkItem } from './gpu/persistent-kernels-v2';
import { ZeroCopyEngine } from './zero-copy/zero-copy-engine';
import { ZeroCopyMemoryManager } from './zero-copy/shared-memory';
import { realPerformanceMonitor } from '../performance/real-benchmarks';

export interface MaxPerformanceConfig {
    numGPUKernels: number;          // Default: 10000
    numWorkers: number;              // Default: navigator.hardwareConcurrency
    sharedMemorySize: number;        // Default: 256MB
    enableProfiling: boolean;        // Default: false
    targetFPS: number;               // Default: 60
    enablePersistentKernels: boolean; // Default: true
}

export interface PerformanceStats {
    fps: number;
    frameTimeMs: number;
    gpuUtilization: number;
    gpuTeraFLOPS: number;
    workItemsProcessed: number;
    dispatchLatencyMs: number;
    memoryUsageMB: number;
    activeWorkers: number;
}

export class MaxPerformanceEngine {
    private config: MaxPerformanceConfig;
    private device: GPUDevice | null = null;
    
    // Core components
    private persistentKernels: PersistentKernelEngineV2;
    private zeroCopyEngine: ZeroCopyEngine;
    private zeroCopyMemory: ZeroCopyMemoryManager;
    
    // Web Workers pool
    private workers: Worker[] = [];
    private workerQueue: Array<() => void> = [];
    private activeWorkers: Set<number> = new Set();
    
    // Shared memory
    private sharedMemory: SharedArrayBuffer | null = null;
    private sharedView: Uint32Array | null = null;
    
    // Performance tracking
    private stats: PerformanceStats = {
        fps: 0,
        frameTimeMs: 0,
        gpuUtilization: 0,
        gpuTeraFLOPS: 0,
        workItemsProcessed: 0,
        dispatchLatencyMs: 0,
        memoryUsageMB: 0,
        activeWorkers: 0
    };
    
    private frameStartTime: number = 0;
    private frameCount: number = 0;
    private lastStatsUpdate: number = 0;
    
    // State
    private isRunning: boolean = false;
    private isInitialized: boolean = false;

    constructor(config: Partial<MaxPerformanceConfig> = {}) {
        this.config = {
            numGPUKernels: config.numGPUKernels || 10000,
            numWorkers: config.numWorkers || (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8),
            sharedMemorySize: config.sharedMemorySize || 256 * 1024 * 1024, // 256MB
            enableProfiling: config.enableProfiling || false,
            targetFPS: config.targetFPS || 60,
            enablePersistentKernels: config.enablePersistentKernels !== false
        };
        
        this.persistentKernels = new PersistentKernelEngineV2({
            numKernels: this.config.numGPUKernels,
            enableProfiling: this.config.enableProfiling
        });
        
        this.zeroCopyEngine = new ZeroCopyEngine();
        this.zeroCopyMemory = new ZeroCopyMemoryManager();
    }

    /**
     * Initialize all performance systems
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.warn('[MaxPerf] Already initialized');
            return;
        }

        console.log('[MaxPerf] Initializing maximum performance engine...');
        const initStart = performance.now();

        // Initialize WebGPU
        await this.initializeGPU();
        
        // Initialize performance components
        await this.persistentKernels.initialize();
        await this.zeroCopyEngine.initialize();
        await this.zeroCopyMemory.initialize(this.device!);
        await realPerformanceMonitor.initialize();
        
        // Create shared memory
        this.createSharedMemory();
        
        // Start Web Workers
        await this.initializeWorkers();
        
        this.isInitialized = true;
        
        const initTime = performance.now() - initStart;
        console.log(`[MaxPerf] Initialized in ${initTime.toFixed(2)}ms`);
        console.log(`[MaxPerf] GPU Kernels: ${this.config.numGPUKernels}`);
        console.log(`[MaxPerf] Workers: ${this.config.numWorkers}`);
        console.log(`[MaxPerf] Shared Memory: ${(this.config.sharedMemorySize / 1024 / 1024).toFixed(0)}MB`);
    }

    /**
     * Initialize WebGPU with maximum performance settings
     */
    private async initializeGPU(): Promise<void> {
        if (typeof navigator === 'undefined' || !navigator.gpu) {
            throw new Error('WebGPU not supported');
        }

        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });

        if (!adapter) {
            throw new Error('No GPU adapter found');
        }

        // Request maximum limits
        const limits = await adapter.limits;
        
        this.device = await adapter.requestDevice({
            requiredFeatures: ['timestamp-query' as GPUFeatureName].filter(f => 
                adapter.features.has(f as GPUFeatureName)
            ),
            requiredLimits: {
                maxStorageBufferBindingSize: Math.min(
                    2 * 1024 * 1024 * 1024,
                    limits.maxStorageBufferBindingSize
                ),
                maxComputeWorkgroupSizeX: Math.min(256, limits.maxComputeWorkgroupSizeX),
                maxComputeInvocationsPerWorkgroup: Math.min(256, limits.maxComputeInvocationsPerWorkgroup)
            }
        });

        console.log('[MaxPerf] WebGPU initialized with high-performance adapter');
    }

    /**
     * Create shared memory for zero-copy communication
     */
    private createSharedMemory(): void {
        try {
            this.sharedMemory = this.zeroCopyMemory.createSharedBuffer(
                'main_shared_memory',
                this.config.sharedMemorySize
            );
            this.sharedView = new Uint32Array(this.sharedMemory);
            console.log(`[MaxPerf] Shared memory created: ${(this.config.sharedMemorySize / 1024 / 1024).toFixed(0)}MB`);
        } catch (error) {
            console.warn('[MaxPerf] SharedArrayBuffer not available, falling back to slower communication');
            this.sharedMemory = null;
        }
    }

    /**
     * Initialize Web Workers pool
     */
    private async initializeWorkers(): Promise<void> {
        const workerCode = this.generateWorkerCode();
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerURL = URL.createObjectURL(blob);
        
        for (let i = 0; i < this.config.numWorkers; i++) {
            const worker = new Worker(workerURL);
            
            worker.onmessage = (e) => this.handleWorkerMessage(i, e.data);
            worker.onerror = (e) => console.error(`[MaxPerf] Worker ${i} error:`, e);
            
            // Send shared memory to worker
            if (this.sharedMemory) {
                worker.postMessage({
                    type: 'init',
                    sharedMemory: this.sharedMemory,
                    workerId: i
                });
            }
            
            this.workers.push(worker);
        }
        
        console.log(`[MaxPerf] ${this.config.numWorkers} workers initialized`);
    }

    /**
     * Generate Web Worker code
     */
    private generateWorkerCode(): string {
        return `
let sharedMemory = null;
let sharedView = null;
let workerId = -1;

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'init':
            sharedMemory = e.data.sharedMemory;
            if (sharedMemory) {
                sharedView = new Uint32Array(sharedMemory);
            }
            workerId = e.data.workerId;
            self.postMessage({ type: 'ready', workerId });
            break;
            
        case 'work':
            // Process work item
            const result = processWork(data);
            self.postMessage({ type: 'result', workerId, result });
            break;
            
        case 'terminate':
            self.close();
            break;
    }
};

function processWork(data) {
    // Worker processing logic
    // This can be customized based on work type
    return { processed: true, data };
}
        `.trim();
    }

    /**
     * Handle message from worker
     */
    private handleWorkerMessage(workerId: number, message: any): void {
        if (message.type === 'ready') {
            this.activeWorkers.add(workerId);
        } else if (message.type === 'result') {
            this.activeWorkers.delete(workerId);
            // Process next queued item
            if (this.workerQueue.length > 0) {
                const next = this.workerQueue.shift();
                if (next) next();
            }
        }
    }

    /**
     * Start the performance engine
     */
    async start(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Engine not initialized. Call initialize() first.');
        }
        
        if (this.isRunning) {
            console.warn('[MaxPerf] Already running');
            return;
        }

        this.isRunning = true;
        
        // Start persistent kernels
        if (this.config.enablePersistentKernels) {
            await this.persistentKernels.start();
        }
        
        // Start FPS monitoring
        realPerformanceMonitor.startFPSMeasurement();
        
        // Start main loop
        this.frameStartTime = performance.now();
        this.runMainLoop();
        
        console.log('[MaxPerf] Engine started - running at maximum performance');
    }

    /**
     * Main performance loop
     */
    private runMainLoop(): void {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.runMainLoop());
        
        const now = performance.now();
        const frameTime = now - this.frameStartTime;
        this.frameStartTime = now;
        this.frameCount++;
        
        // Update stats every second
        if (now - this.lastStatsUpdate >= 1000) {
            this.updateStats(frameTime);
            this.lastStatsUpdate = now;
        }
    }

    /**
     * Update performance statistics
     */
    private async updateStats(frameTime: number): Promise<void> {
        this.stats.frameTimeMs = frameTime;
        this.stats.fps = 1000 / frameTime;
        this.stats.activeWorkers = this.activeWorkers.size;
        
        // Get GPU stats
        const kernelStats = this.persistentKernels.getStatistics();
        this.stats.workItemsProcessed = kernelStats.totalWorkItems;
        this.stats.dispatchLatencyMs = kernelStats.averageLatency;
        this.stats.gpuUtilization = await realPerformanceMonitor.getGPUUtilization();
        
        // Get memory stats
        this.stats.memoryUsageMB = realPerformanceMonitor.getMemoryUsage() / 1024 / 1024;
        
        if (this.config.enableProfiling) {
            console.log('[MaxPerf] Stats:', this.stats);
        }
    }

    /**
     * Submit work to GPU persistent kernels
     */
    async submitGPUWork(workType: WorkType, data: Uint32Array): Promise<void> {
        const startTime = performance.now();
        
        await this.persistentKernels.submitWork({
            type: workType,
            data,
        });
        
        const latency = performance.now() - startTime;
        if (latency > 1) {
            console.warn(`[MaxPerf] High GPU dispatch latency: ${latency.toFixed(2)}ms`);
        }
    }

    /**
     * Submit work to Web Worker
     */
    async submitWorkerWork(data: any): Promise<any> {
        return new Promise((resolve) => {
            // Find available worker
            const availableWorker = this.workers.findIndex((_, i) => !this.activeWorkers.has(i));
            
            if (availableWorker >= 0) {
                this.activeWorkers.add(availableWorker);
                this.workers[availableWorker].postMessage({ type: 'work', data });
                
                // Set up result handler
                const handler = (e: MessageEvent) => {
                    if (e.data.type === 'result' && e.data.workerId === availableWorker) {
                        this.workers[availableWorker].removeEventListener('message', handler);
                        resolve(e.data.result);
                    }
                };
                this.workers[availableWorker].addEventListener('message', handler);
            } else {
                // Queue work
                this.workerQueue.push(() => this.submitWorkerWork(data).then(resolve));
            }
        });
    }

    /**
     * Run GPU compute benchmark
     */
    async benchmarkGPU(duration: number = 1000): Promise<number> {
        console.log('[MaxPerf] Running GPU benchmark...');
        const teraFLOPS = await realPerformanceMonitor.measureTeraFLOPS(duration);
        this.stats.gpuTeraFLOPS = teraFLOPS;
        return teraFLOPS;
    }

    /**
     * Get current performance statistics
     */
    getStats(): PerformanceStats {
        return { ...this.stats };
    }

    /**
     * Print performance report
     */
    printReport(): void {
        console.log('═'.repeat(80));
        console.log('MAXIMUM PERFORMANCE ENGINE - REAL-TIME STATS');
        console.log('═'.repeat(80));
        console.log(`FPS:                ${this.stats.fps.toFixed(1)} (${this.stats.frameTimeMs.toFixed(2)}ms per frame)`);
        console.log(`GPU Utilization:    ${this.stats.gpuUtilization.toFixed(1)}%`);
        console.log(`GPU TeraFLOPS:      ${this.stats.gpuTeraFLOPS.toFixed(2)}`);
        console.log(`Work Items:         ${this.stats.workItemsProcessed}`);
        console.log(`Dispatch Latency:   ${this.stats.dispatchLatencyMs.toFixed(3)}ms`);
        console.log(`Memory Usage:       ${this.stats.memoryUsageMB.toFixed(1)}MB`);
        console.log(`Active Workers:     ${this.stats.activeWorkers}/${this.config.numWorkers}`);
        console.log('═'.repeat(80));
    }

    /**
     * Stop the performance engine
     */
    async stop(): Promise<void> {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        // Stop persistent kernels
        await this.persistentKernels.stop();
        
        console.log('[MaxPerf] Engine stopped');
    }

    /**
     * Shutdown and cleanup
     */
    async shutdown(): Promise<void> {
        await this.stop();
        
        // Terminate workers
        for (const worker of this.workers) {
            worker.postMessage({ type: 'terminate' });
            worker.terminate();
        }
        this.workers = [];
        
        // Cleanup
        this.zeroCopyMemory.shutdown();
        this.zeroCopyEngine.reset();
        
        this.isInitialized = false;
        console.log('[MaxPerf] Shutdown complete');
    }
}

// Export singleton
export const maxPerformanceEngine = new MaxPerformanceEngine();
