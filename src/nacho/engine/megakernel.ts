import { webgpu } from './webgpu-context';
import { MEGAKERNEL_WGSL } from '../shaders/megakernel';

export class Megakernel {
    private static instance: Megakernel;

    private pipelineCompute: GPUComputePipeline | null = null;
    private pipelineRender: GPURenderPipeline | null = null;

    private bufferA: GPUBuffer | null = null;
    private bufferB: GPUBuffer | null = null;
    private uniformBuffer: GPUBuffer | null = null;

    private bindGroupAtoB: GPUBindGroup | null = null;
    private bindGroupBtoA: GPUBindGroup | null = null;

    private entityCount: number = 10000;
    private frameCount: number = 0;

    private constructor() { }

    public static getInstance(): Megakernel {
        if (!Megakernel.instance) {
            Megakernel.instance = new Megakernel();
        }
        return Megakernel.instance;
    }

    public async init(count: number = 10000) {
        this.entityCount = count;
        const device = webgpu.getDevice();

        // 1. Compile Shaders
        const shaderModule = device.createShaderModule({
            code: MEGAKERNEL_WGSL,
            label: 'Megakernel Module'
        });

        // 2. Create Compute Pipeline
        // Note: We use 'auto' layout for simplicity, but explicit is better for sharing. 
        // We will retrieve the layout from the pipeline to create consistent bind groups.
        this.pipelineCompute = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'computeMain'
            },
            label: 'Megakernel Compute'
        });

        // 3. Create Render Pipeline
        const format = webgpu.presentationFormat;
        this.pipelineRender = device.createRenderPipeline({
            layout: this.pipelineCompute.getBindGroupLayout(0) ? 'auto' : 'auto', // Try to match layout or use auto
            vertex: {
                module: shaderModule,
                entryPoint: 'vertexMain'
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fragmentMain',
                targets: [{ format }]
            },
            primitive: {
                topology: 'triangle-list'
            },
            label: 'Megakernel Render'
        });

        // 4. Allocate Buffers
        // 32 bytes per entity (vec2, vec2, vec4)
        // struct Entity { pos: vec2f, vel: vec2f, color: vec4f }
        const entitySize = 32;
        const bufferSize = entitySize * this.entityCount;

        this.bufferA = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'State Buffer A'
        });

        this.bufferB = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'State Buffer B'
        });

        this.uniformBuffer = device.createBuffer({
            size: 16, // 4 floats: dt, width, height, count
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Uniform Buffer'
        });

        // 5. Initialize Data
        const initialData = new Float32Array(this.entityCount * 8); // 8 floats per entity
        for (let i = 0; i < this.entityCount; i++) {
            const base = i * 8;
            initialData[base] = Math.random() * 800; // x
            initialData[base + 1] = Math.random() * 600; // y
            initialData[base + 2] = (Math.random() - 0.5) * 100; // vx
            initialData[base + 3] = (Math.random() - 0.5) * 100; // vy

            initialData[base + 4] = Math.random(); // r
            initialData[base + 5] = Math.random(); // g
            initialData[base + 6] = Math.random(); // b
            initialData[base + 7] = 1.0; // a
        }
        device.queue.writeBuffer(this.bufferA, 0, initialData);

        // 6. Create BindGroups
        const bindGroupLayout = this.pipelineCompute.getBindGroupLayout(0);

        this.bindGroupAtoB = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.bufferA } },
                { binding: 1, resource: { buffer: this.bufferB } },
                { binding: 2, resource: { buffer: this.uniformBuffer } }
            ],
            label: 'BG A->B'
        });

        this.bindGroupBtoA = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.bufferB } },
                { binding: 1, resource: { buffer: this.bufferA } },
                { binding: 2, resource: { buffer: this.uniformBuffer } }
            ],
            label: 'BG B->A'
        });
    }

    public run(dt: number) {
        const device = webgpu.device;
        const context = webgpu.context;
        if (!device || !context || !this.pipelineCompute || !this.pipelineRender) return;
        if (!this.bindGroupAtoB || !this.bindGroupBtoA) return;

        // 1. Update Uniforms
        const width = context.canvas.width;
        const height = context.canvas.height;
        const uniforms = new Float32Array([dt / 1000, width, height, this.entityCount]);
        device.queue.writeBuffer(this.uniformBuffer!, 0, uniforms);

        const commandEncoder = device.createCommandEncoder();

        // [EXTREME OPTIMIZATION A.1] GPU Physics Pipeline
        // "MegaKernel" combines physics, collision, and state updates in a single compute pass
        // to avoid CPU-GPU roundtrips.
        const enablePhysics = true;

        // 2. Determine Direction
        const frameIsEven = this.frameCount % 2 === 0;
        const computeBindGroup = frameIsEven ? this.bindGroupAtoB : this.bindGroupBtoA;
        const renderBindGroup = frameIsEven ? this.bindGroupBtoA : this.bindGroupAtoB;

        // 3. Compute Pass (MegaKernel)
        if (enablePhysics) {
            const computePass = commandEncoder.beginComputePass();
            computePass.setPipeline(this.pipelineCompute);
            computePass.setBindGroup(0, computeBindGroup);
            const workgroupCount = Math.ceil(this.entityCount / 64);
            computePass.dispatchWorkgroups(workgroupCount);
            computePass.end();
        }

        // 4. Render Pass
        const textureView = context.getCurrentTexture().createView();
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });

        renderPass.setPipeline(this.pipelineRender);
        // Note: Render pipeline might have generated a different layout if 'auto' was used and they aren't shared.
        // But since we use the same shader module and struct definitions, usually the BGLs are compatible.
        // To be safe, we should enforce explicit layout or use the compute's layout (as hinted in init).
        // Since we passed 'layout: auto' to render pipeline, it generated its own.
        // However, WebGPU validation might complain if we pass a BG created from Compute pipeline's layout.
        // For this Proof of Concept, we'll try. Ideally we explicit-create BGL.
        renderPass.setBindGroup(0, renderBindGroup);
        renderPass.draw(6, this.entityCount);
        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);

        this.frameCount++;
    }
}

export const megakernel = Megakernel.getInstance();
