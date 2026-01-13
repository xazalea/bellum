/**
 * Hot Path Profiler
 * Part of Project BELLUM NEXUS
 * 
 * Tracks execution frequency of code blocks to determine optimization tier:
 * - Cold (<100 executions): Interpret
 * - Warm (100-1000 executions): JIT to WASM
 * - Hot (>1000 executions): GPU compute shader
 * - Critical (>10000 executions): Persistent GPU kernel
 * 
 * This is the key to achieving supercomputer performance - only optimize what matters
 */

export enum ExecutionTier {
    COLD = 'cold',           // <100 executions - interpret
    WARM = 'warm',           // 100-1000 - JIT to WASM
    HOT = 'hot',             // 1000-10000 - GPU compute
    CRITICAL = 'critical',   // >10000 - persistent kernel
}

export interface BasicBlockProfile {
    address: number;
    executionCount: number;
    totalTime: number;           // Total time spent in microseconds
    averageTime: number;         // Average time per execution
    tier: ExecutionTier;
    lastExecutionTime: number;   // Timestamp of last execution
    wasmCompiled: boolean;       // Has this been JIT compiled to WASM?
    gpuCompiled: boolean;        // Has this been compiled to GPU shader?
}

export interface FunctionProfile {
    entryPoint: number;
    name: string;
    executionCount: number;
    totalTime: number;
    blocks: Map<number, BasicBlockProfile>;
    tier: ExecutionTier;
    compilationTime?: number;    // Time to compile (if compiled)
}

export interface ProfilingStatistics {
    totalBlocks: number;
    coldBlocks: number;
    warmBlocks: number;
    hotBlocks: number;
    criticalBlocks: number;
    totalExecutions: number;
    totalTime: number;
    wasmCompiledBlocks: number;
    gpuCompiledBlocks: number;
}

/**
 * Hot Path Profiler
 * Tracks code execution to guide optimization decisions
 */
export class HotPathProfiler {
    private functions: Map<number, FunctionProfile> = new Map();
    private blocks: Map<number, BasicBlockProfile> = new Map();
    
    // Thresholds
    private readonly COLD_THRESHOLD = 100;
    private readonly WARM_THRESHOLD = 1000;
    private readonly HOT_THRESHOLD = 10000;
    
    // Profiling state
    private isProfiling: boolean = false;
    private startTime: number = 0;

    /**
     * Start profiling
     */
    startProfiling(): void {
        this.isProfiling = true;
        this.startTime = performance.now();
        console.log('[Profiler] Started profiling');
    }

    /**
     * Stop profiling
     */
    stopProfiling(): void {
        this.isProfiling = false;
        console.log('[Profiler] Stopped profiling');
    }

    /**
     * Record basic block execution
     */
    recordBlockExecution(address: number, executionTime: number): void {
        if (!this.isProfiling) return;

        let profile = this.blocks.get(address);

        if (!profile) {
            profile = {
                address,
                executionCount: 0,
                totalTime: 0,
                averageTime: 0,
                tier: ExecutionTier.COLD,
                lastExecutionTime: performance.now(),
                wasmCompiled: false,
                gpuCompiled: false,
            };
            this.blocks.set(address, profile);
        }

        profile.executionCount++;
        profile.totalTime += executionTime;
        profile.averageTime = profile.totalTime / profile.executionCount;
        profile.lastExecutionTime = performance.now();

        // Update tier based on execution count
        profile.tier = this.determineTier(profile.executionCount);
    }

    /**
     * Record function execution
     */
    recordFunctionExecution(entryPoint: number, name: string, executionTime: number): void {
        if (!this.isProfiling) return;

        let profile = this.functions.get(entryPoint);

        if (!profile) {
            profile = {
                entryPoint,
                name,
                executionCount: 0,
                totalTime: 0,
                blocks: new Map(),
                tier: ExecutionTier.COLD,
            };
            this.functions.set(entryPoint, profile);
        }

        profile.executionCount++;
        profile.totalTime += executionTime;
        profile.tier = this.determineTier(profile.executionCount);
    }

    /**
     * Determine execution tier based on count
     */
    private determineTier(executionCount: number): ExecutionTier {
        if (executionCount >= this.HOT_THRESHOLD) {
            return ExecutionTier.CRITICAL;
        } else if (executionCount >= this.WARM_THRESHOLD) {
            return ExecutionTier.HOT;
        } else if (executionCount >= this.COLD_THRESHOLD) {
            return ExecutionTier.WARM;
        } else {
            return ExecutionTier.COLD;
        }
    }

    /**
     * Get block profile
     */
    getBlockProfile(address: number): BasicBlockProfile | undefined {
        return this.blocks.get(address);
    }

    /**
     * Get function profile
     */
    getFunctionProfile(entryPoint: number): FunctionProfile | undefined {
        return this.functions.get(entryPoint);
    }

    /**
     * Check if block should be JIT compiled to WASM
     */
    shouldCompileToWASM(address: number): boolean {
        const profile = this.blocks.get(address);
        if (!profile) return false;

        return profile.tier === ExecutionTier.WARM &&
               !profile.wasmCompiled;
    }

    /**
     * Check if block should be compiled to GPU
     */
    shouldCompileToGPU(address: number): boolean {
        const profile = this.blocks.get(address);
        if (!profile) return false;

        return (profile.tier === ExecutionTier.HOT || profile.tier === ExecutionTier.CRITICAL) &&
               !profile.gpuCompiled;
    }

    /**
     * Mark block as WASM compiled
     */
    markWASMCompiled(address: number, compilationTime: number): void {
        const profile = this.blocks.get(address);
        if (profile) {
            profile.wasmCompiled = true;
            console.log(`[Profiler] Marked block 0x${address.toString(16)} as WASM compiled (${compilationTime.toFixed(2)}ms)`);
        }
    }

    /**
     * Mark block as GPU compiled
     */
    markGPUCompiled(address: number, compilationTime: number): void {
        const profile = this.blocks.get(address);
        if (profile) {
            profile.gpuCompiled = true;
            console.log(`[Profiler] Marked block 0x${address.toString(16)} as GPU compiled (${compilationTime.toFixed(2)}ms)`);
        }
    }

    /**
     * Get hot blocks (candidates for JIT compilation)
     */
    getHotBlocks(minExecutionCount: number = 100): BasicBlockProfile[] {
        return Array.from(this.blocks.values())
            .filter(block => block.executionCount >= minExecutionCount)
            .sort((a, b) => b.executionCount - a.executionCount);
    }

    /**
     * Get blocks by tier
     */
    getBlocksByTier(tier: ExecutionTier): BasicBlockProfile[] {
        return Array.from(this.blocks.values())
            .filter(block => block.tier === tier);
    }

    /**
     * Get functions by tier
     */
    getFunctionsByTier(tier: ExecutionTier): FunctionProfile[] {
        return Array.from(this.functions.values())
            .filter(func => func.tier === tier);
    }

    /**
     * Get blocks that need WASM compilation
     */
    getBlocksNeedingWASM(): BasicBlockProfile[] {
        return this.getBlocksByTier(ExecutionTier.WARM)
            .filter(block => !block.wasmCompiled);
    }

    /**
     * Get blocks that need GPU compilation
     */
    getBlocksNeedingGPU(): BasicBlockProfile[] {
        return Array.from(this.blocks.values())
            .filter(block =>
                (block.tier === ExecutionTier.HOT || block.tier === ExecutionTier.CRITICAL) &&
                !block.gpuCompiled
            );
    }

    /**
     * Get profiling statistics
     */
    getStatistics(): ProfilingStatistics {
        const blocks = Array.from(this.blocks.values());

        return {
            totalBlocks: blocks.length,
            coldBlocks: blocks.filter(b => b.tier === ExecutionTier.COLD).length,
            warmBlocks: blocks.filter(b => b.tier === ExecutionTier.WARM).length,
            hotBlocks: blocks.filter(b => b.tier === ExecutionTier.HOT).length,
            criticalBlocks: blocks.filter(b => b.tier === ExecutionTier.CRITICAL).length,
            totalExecutions: blocks.reduce((sum, b) => sum + b.executionCount, 0),
            totalTime: blocks.reduce((sum, b) => sum + b.totalTime, 0),
            wasmCompiledBlocks: blocks.filter(b => b.wasmCompiled).length,
            gpuCompiledBlocks: blocks.filter(b => b.gpuCompiled).length,
        };
    }

    /**
     * Print profiling report
     */
    printReport(): void {
        const stats = this.getStatistics();

        console.log('='.repeat(80));
        console.log('HOT PATH PROFILING REPORT');
        console.log('='.repeat(80));
        console.log(`Total Blocks: ${stats.totalBlocks}`);
        console.log(`  Cold (<100): ${stats.coldBlocks} (${(stats.coldBlocks / stats.totalBlocks * 100).toFixed(1)}%)`);
        console.log(`  Warm (100-1000): ${stats.warmBlocks} (${(stats.warmBlocks / stats.totalBlocks * 100).toFixed(1)}%)`);
        console.log(`  Hot (1000-10000): ${stats.hotBlocks} (${(stats.hotBlocks / stats.totalBlocks * 100).toFixed(1)}%)`);
        console.log(`  Critical (>10000): ${stats.criticalBlocks} (${(stats.criticalBlocks / stats.totalBlocks * 100).toFixed(1)}%)`);
        console.log('');
        console.log(`Total Executions: ${stats.totalExecutions.toLocaleString()}`);
        console.log(`Total Time: ${(stats.totalTime / 1000).toFixed(2)}ms`);
        console.log('');
        console.log(`WASM Compiled: ${stats.wasmCompiledBlocks} blocks`);
        console.log(`GPU Compiled: ${stats.gpuCompiledBlocks} blocks`);
        console.log('='.repeat(80));

        // Print top 10 hottest blocks
        const hottest = this.getHotBlocks(0).slice(0, 10);
        if (hottest.length > 0) {
            console.log('');
            console.log('TOP 10 HOTTEST BLOCKS:');
            hottest.forEach((block, i) => {
                console.log(`${i + 1}. 0x${block.address.toString(16).padStart(8, '0')}: ` +
                           `${block.executionCount.toLocaleString()} executions, ` +
                           `${(block.totalTime / 1000).toFixed(2)}ms total, ` +
                           `tier: ${block.tier}`);
            });
            console.log('='.repeat(80));
        }
    }

    /**
     * Reset profiling data
     */
    reset(): void {
        this.functions.clear();
        this.blocks.clear();
        console.log('[Profiler] Reset profiling data');
    }

    /**
     * Export profiling data
     */
    exportData(): {
        functions: FunctionProfile[];
        blocks: BasicBlockProfile[];
        statistics: ProfilingStatistics;
    } {
        return {
            functions: Array.from(this.functions.values()),
            blocks: Array.from(this.blocks.values()),
            statistics: this.getStatistics(),
        };
    }

    /**
     * Import profiling data (for pre-warming from previous session)
     */
    importData(data: {
        functions: FunctionProfile[];
        blocks: BasicBlockProfile[];
    }): void {
        // Import functions
        for (const func of data.functions) {
            this.functions.set(func.entryPoint, func);
        }

        // Import blocks
        for (const block of data.blocks) {
            this.blocks.set(block.address, block);
        }

        console.log(`[Profiler] Imported ${data.functions.length} functions and ${data.blocks.length} blocks`);
    }
}

// Export singleton
export const hotPathProfiler = new HotPathProfiler();
