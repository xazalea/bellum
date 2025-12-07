a<<<<<<< Current (Your changes)
=======
export type PipelineType = 'GRAPHICS' | 'PHYSICS' | 'AI' | 'AUDIO';

export class GPUManager {
    private device: GPUDevice | null = null;
    private pipelines: Map<PipelineType, GPUComputePipeline | GPURenderPipeline> = new Map();
    private commandQueue: GPUCommandEncoder[] = [];
    
    async initialize() {
        if (typeof navigator === 'undefined' || !navigator.gpu) throw new Error('WebGPU Not Supported');
        
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (!adapter) throw new Error('No GPU Adapter Found');
        
        // Check limits before requesting
        const supportedMaxStorage = (adapter as any).limits?.maxStorageBufferBindingSize || 128 * 1024 * 1024;
        const requestedMaxStorage = Math.min(2 * 1024 * 1024 * 1024, supportedMaxStorage);

        this.device = await adapter.requestDevice({
            requiredFeatures: ['shader-f16', 'bgra8unorm-storage'], // Advanced features
            requiredLimits: {
                maxComputeWorkgroupSizeX: 256,
                maxStorageBufferBindingSize: requestedMaxStorage
            }
        });

        await this.createPipelines();
        console.log('GPUManager: WebGPU Engine Online (RTX-Level Mode)');
    }

    getDevice(): GPUDevice | null {
        return this.device;
    }

    private async createPipelines() {
        if (!this.device) return;

        // 1. Physics Pipeline (Compute)
        // Simulates thousands of rigid bodies in parallel
        const physicsShader = `
            @group(0) @binding(0) var<storage, read_write> positions: array<vec4<f32>>;
            @group(0) @binding(1) var<storage, read_write> velocities: array<vec4<f32>>;
            
            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let idx = global_id.x;
                // Basic Euler Integration
                positions[idx] += velocities[idx] * 0.016;
                
                // Floor Collision
                if (positions[idx].y < 0.0) {
                    positions[idx].y = 0.0;
                    velocities[idx].y *= -0.5;
                }
            }
        `;
        
        this.pipelines.set('PHYSICS', this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({ code: physicsShader }),
                entryPoint: 'main'
            }
        }));

        // 2. AI Pipeline (Compute) - MatMul Kernel
        // Placeholder for huge matrix multiplication
        const aiShader = `
            @group(0) @binding(0) var<storage, read> matrixA: array<f32>;
            @group(0) @binding(1) var<storage, read_write> result: array<f32>;
            
            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                // Mock MatMul
                let idx = global_id.x;
                result[idx] = matrixA[idx] * 2.0;
            }
        `;

        this.pipelines.set('AI', this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({ code: aiShader }),
                entryPoint: 'main'
            }
        }));
    }

    submitCommand(encoder: GPUCommandEncoder) {
        this.commandQueue.push(encoder);
    }

    dispatch(pipelineType: PipelineType, workgroups: number) {
        if (!this.device) return;
        // Mock dispatch for the hypervisor loop
        // In a real scenario, this would encode compute passes
    }

    flush() {
        if (!this.device || this.commandQueue.length === 0) return;
        this.device.queue.submit(this.commandQueue.map(e => e.finish()));
        this.commandQueue = [];
    }
}

export const gpuManager = new GPUManager();
>>>>>>> Incoming (Background Agent changes)
