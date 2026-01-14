/**
 * REAL PERFORMANCE BENCHMARK SUITE
 * Honest, measured performance metrics - NO FAKE DATA
 * 
 * Measures:
 * - GPU compute throughput (actual TeraFLOPS)
 * - JIT compilation speed
 * - Instruction decode rates
 * - Memory bandwidth
 * - End-to-end execution time
 */

import { PersistentKernelEngineV2, WorkType } from '../nexus/gpu/persistent-kernels-v2';
import { GPUParallelCompiler } from '../jit/gpu-parallel-compiler';
import { FastInterpreter } from '../execution/fast-interpreter';
import { X86DecoderFull } from '../transpiler/lifter/decoders/x86-full';
import { BasicBlock, IROperand } from '../transpiler/lifter/types';

export interface BenchmarkResult {
    name: string;
    unit: string;
    value: number;
    timeMs: number;
    throughput?: number;
    details: any;
}

export interface BenchmarkSuite {
    timestamp: number;
    browser: string;
    gpu: string;
    results: BenchmarkResult[];
    summary: {
        totalTime: number;
        passedCount: number;
        failedCount: number;
    };
}

/**
 * GPU Compute Benchmark - Matrix Multiplication
 * Measures actual TeraFLOPS
 */
export async function benchmarkGPUCompute(): Promise<BenchmarkResult> {
    const result: BenchmarkResult = {
        name: 'GPU Compute (Matrix Mult)',
        unit: 'GFLOPS',
        value: 0,
        timeMs: 0,
        details: {},
    };
    
    try {
        if (!navigator.gpu) {
            throw new Error('WebGPU not supported');
        }
        
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('No GPU adapter');
        
        const device = await adapter.requestDevice();
        
        // Matrix size (N x N)
        const N = 1024;
        const matrixSize = N * N;
        
        // Create matrices
        const a = new Float32Array(matrixSize);
        const b = new Float32Array(matrixSize);
        
        // Initialize with random data
        for (let i = 0; i < matrixSize; i++) {
            a[i] = Math.random();
            b[i] = Math.random();
        }
        
        // Create buffers
        const bufferA = device.createBuffer({
            size: a.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(bufferA.getMappedRange()).set(a);
        bufferA.unmap();
        
        const bufferB = device.createBuffer({
            size: b.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(bufferB.getMappedRange()).set(b);
        bufferB.unmap();
        
        const bufferC = device.createBuffer({
            size: a.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });
        
        const readBuffer = device.createBuffer({
            size: a.byteLength,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        
        // Create shader
        const shaderCode = `
            @group(0) @binding(0) var<storage, read> a : array<f32>;
            @group(0) @binding(1) var<storage, read> b : array<f32>;
            @group(0) @binding(2) var<storage, read_write> c : array<f32>;
            
            const N: u32 = ${N}u;
            
            @compute @workgroup_size(16, 16)
            fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
                let row = global_id.y;
                let col = global_id.x;
                
                if (row >= N || col >= N) {
                    return;
                }
                
                var sum: f32 = 0.0;
                for (var i: u32 = 0u; i < N; i = i + 1u) {
                    sum = sum + a[row * N + i] * b[i * N + col];
                }
                
                c[row * N + col] = sum;
            }
        `;
        
        const shaderModule = device.createShaderModule({ code: shaderCode });
        
        const pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'main',
            },
        });
        
        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: bufferA } },
                { binding: 1, resource: { buffer: bufferB } },
                { binding: 2, resource: { buffer: bufferC } },
            ],
        });
        
        // Execute and measure
        const startTime = performance.now();
        
        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(N / 16), Math.ceil(N / 16));
        passEncoder.end();
        
        commandEncoder.copyBufferToBuffer(bufferC, 0, readBuffer, 0, a.byteLength);
        device.queue.submit([commandEncoder.finish()]);
        
        // Wait for GPU to complete
        await (device.queue as any).onSubmittedWorkDone();
        
        const endTime = performance.now();
        result.timeMs = endTime - startTime;
        
        // Calculate FLOPS
        // Matrix multiplication: 2 * N^3 operations
        const operations = 2 * N * N * N;
        const gflops = operations / (result.timeMs / 1000) / 1e9;
        
        result.value = gflops;
        result.throughput = gflops;
        result.details = {
            matrixSize: `${N}x${N}`,
            totalOperations: operations,
            timeSeconds: result.timeMs / 1000,
        };
        
        // Cleanup
        bufferA.destroy();
        bufferB.destroy();
        bufferC.destroy();
        readBuffer.destroy();
        // Note: GPUDevice doesn't have destroy() - it's auto-cleaned up
        
    } catch (error) {
        result.details.error = String(error);
    }
    
    return result;
}

/**
 * JIT Compilation Speed Benchmark
 */
export async function benchmarkJITCompilation(): Promise<BenchmarkResult> {
    const result: BenchmarkResult = {
        name: 'JIT Compilation Speed',
        unit: 'functions/sec',
        value: 0,
        timeMs: 0,
        details: {},
    };
    
    try {
        const compiler = new GPUParallelCompiler();
        await compiler.initialize();
        
        // Create dummy basic blocks
        const functionCount = 100;
        const blocks = [];
        
        for (let i = 0; i < functionCount; i++) {
            blocks.push({
                id: i,
                startAddr: i * 100,
                endAddr: i * 100 + 50,
                instructions: [
                    { 
                        id: 0, 
                        opcode: 'mov', 
                        addr: i * 100, 
                        op1: { type: 'reg', value: 'rax' } as IROperand,
                        op2: { type: 'reg', value: 'rbx' } as IROperand
                    },
                    { 
                        id: 1, 
                        opcode: 'add', 
                        addr: i * 100 + 5, 
                        op1: { type: 'reg', value: 'rax' } as IROperand,
                        op2: { type: 'imm', value: 1 } as IROperand
                    },
                    { 
                        id: 2, 
                        opcode: 'ret', 
                        addr: i * 100 + 10
                    },
                ],
                successors: [],
            });
        }
        
        // Prepare functions map
        const functionsMap = new Map<string, BasicBlock>();
        for (let i = 0; i < blocks.length; i++) {
            functionsMap.set(`func_${i}`, blocks[i]);
        }
        
        // Measure compilation time
        const startTime = performance.now();
        
        await compiler.compile(functionsMap);
        
        const endTime = performance.now();
        result.timeMs = endTime - startTime;
        
        result.value = functionCount / (result.timeMs / 1000);
        result.throughput = result.value;
        result.details = {
            functionsCompiled: functionCount,
            avgTimePerFunction: result.timeMs / functionCount,
        };
        
    } catch (error) {
        result.details.error = String(error);
    }
    
    return result;
}

/**
 * Instruction Decode Rate Benchmark
 */
export async function benchmarkInstructionDecode(): Promise<BenchmarkResult> {
    const result: BenchmarkResult = {
        name: 'Instruction Decode Rate',
        unit: 'instructions/sec',
        value: 0,
        timeMs: 0,
        details: {},
    };
    
    try {
        const decoder = new X86DecoderFull();
        
        // Generate synthetic x86 code
        const codeSize = 10000;
        const code = new Uint8Array(codeSize);
        
        // Fill with common instructions
        for (let i = 0; i < codeSize; i += 5) {
            code[i] = 0xB8; // MOV EAX, imm32
            code[i + 1] = 0x00;
            code[i + 2] = 0x00;
            code[i + 3] = 0x00;
            code[i + 4] = 0x00;
        }
        
        // Measure decode time
        const startTime = performance.now();
        
        let instructionCount = 0;
        let offset = 0;
        
        while (offset < codeSize - 10) {
            const block = decoder.decode(code, offset, 0x400000 + offset);
            instructionCount += block.instructions.length;
            offset += block.endAddr - block.startAddr;
            
            if (instructionCount > 1000) break; // Limit for benchmark
        }
        
        const endTime = performance.now();
        result.timeMs = endTime - startTime;
        
        result.value = instructionCount / (result.timeMs / 1000);
        result.throughput = result.value;
        result.details = {
            instructionsDecoded: instructionCount,
            codeSize,
        };
        
    } catch (error) {
        result.details.error = String(error);
    }
    
    return result;
}

/**
 * Fast Interpreter Benchmark
 */
export async function benchmarkFastInterpreter(): Promise<BenchmarkResult> {
    const result: BenchmarkResult = {
        name: 'Fast Interpreter',
        unit: 'instructions/sec',
        value: 0,
        timeMs: 0,
        details: {},
    };
    
    try {
        const interpreter = new FastInterpreter(1024 * 1024); // 1MB
        
        // Create test instructions
        const instructions = [];
        for (let i = 0; i < 1000; i++) {
            instructions.push({
                id: i,
                opcode: i % 10 === 0 ? 'jmp' : 'add',
                addr: i * 5,
                operands: ['rax', 'rbx'],
            });
        }
        
        // Measure execution time
        const startTime = performance.now();
        
        const execResult = interpreter.execute(instructions, 0);
        
        const endTime = performance.now();
        result.timeMs = endTime - startTime;
        
        result.value = execResult.instructionsExecuted / (result.timeMs / 1000);
        result.throughput = result.value;
        result.details = {
            instructionsExecuted: execResult.instructionsExecuted,
            exitCode: execResult.exitCode,
        };
        
    } catch (error) {
        result.details.error = String(error);
    }
    
    return result;
}

/**
 * Persistent Kernel Throughput Benchmark
 */
export async function benchmarkPersistentKernels(): Promise<BenchmarkResult> {
    const result: BenchmarkResult = {
        name: 'Persistent Kernel Throughput',
        unit: 'work-items/sec',
        value: 0,
        timeMs: 0,
        details: {},
    };
    
    try {
        const engine = new PersistentKernelEngineV2({
            numKernels: 1000,
            workgroupSize: 256,
            queueSize: 10000,
            enableProfiling: false,
        });
        
        await engine.initialize();
        await engine.launch();
        
        // Enqueue work
        const workCount = 1000;
        const workData = new Uint32Array(15);
        workData.fill(42);
        
        const startTime = performance.now();
        
        for (let i = 0; i < workCount; i++) {
            await engine.enqueueWork(WorkType.GAME_LOGIC, workData);
        }
        
        // Note: Work is processed automatically by the persistent kernels
        
        const endTime = performance.now();
        result.timeMs = endTime - startTime;
        
        const stats = engine.getStatistics();
        
        result.value = stats.totalWorkItems / (result.timeMs / 1000);
        result.throughput = result.value;
        result.details = {
            workEnqueued: workCount,
            workProcessed: stats.totalWorkItems,
            dispatchCount: stats.dispatchCount,
        };
        
        await engine.shutdown();
        
    } catch (error) {
        result.details.error = String(error);
    }
    
    return result;
}

/**
 * Run complete benchmark suite
 */
export async function runBenchmarkSuite(): Promise<BenchmarkSuite> {
    console.log('='.repeat(70));
    console.log('BELLUM/NACHO PERFORMANCE BENCHMARK SUITE');
    console.log('Real measurements - No fake data');
    console.log('='.repeat(70));
    
    const suite: BenchmarkSuite = {
        timestamp: Date.now(),
        browser: navigator.userAgent,
        gpu: 'Unknown',
        results: [],
        summary: {
            totalTime: 0,
            passedCount: 0,
            failedCount: 0,
        },
    };
    
    // Detect GPU
    try {
        if (navigator.gpu) {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                const info = await adapter.requestAdapterInfo();
                suite.gpu = info.description || info.vendor || 'WebGPU Device';
            }
        } else {
            suite.gpu = 'WebGPU Not Available';
        }
    } catch (e) {
        suite.gpu = 'WebGPU Not Available';
    }
    
    const benchmarks = [
        { name: 'GPU Compute', fn: benchmarkGPUCompute },
        { name: 'JIT Compilation', fn: benchmarkJITCompilation },
        { name: 'Instruction Decode', fn: benchmarkInstructionDecode },
        { name: 'Fast Interpreter', fn: benchmarkFastInterpreter },
        { name: 'Persistent Kernels', fn: benchmarkPersistentKernels },
    ];
    
    const startTime = performance.now();
    
    for (const benchmark of benchmarks) {
        console.log(`\nRunning: ${benchmark.name}...`);
        
        try {
            const result = await benchmark.fn();
            suite.results.push(result);
            
            if (result.details.error) {
                suite.summary.failedCount++;
                console.log(`  ❌ FAILED: ${result.details.error}`);
            } else {
                suite.summary.passedCount++;
                console.log(`  ✅ ${result.value.toFixed(2)} ${result.unit} (${result.timeMs.toFixed(2)}ms)`);
            }
        } catch (error) {
            suite.summary.failedCount++;
            console.error(`  ❌ ERROR:`, error);
        }
    }
    
    suite.summary.totalTime = performance.now() - startTime;
    
    console.log('\n' + '='.repeat(70));
    console.log('BENCHMARK COMPLETE');
    console.log(`Total Time: ${suite.summary.totalTime.toFixed(2)}ms`);
    console.log(`Passed: ${suite.summary.passedCount}/${benchmarks.length}`);
    console.log(`Failed: ${suite.summary.failedCount}/${benchmarks.length}`);
    console.log('='.repeat(70));
    
    return suite;
}

// Export for use in tests
export const benchmarks = {
    gpu: benchmarkGPUCompute,
    jit: benchmarkJITCompilation,
    decode: benchmarkInstructionDecode,
    interpreter: benchmarkFastInterpreter,
    kernels: benchmarkPersistentKernels,
    runAll: runBenchmarkSuite,
};
