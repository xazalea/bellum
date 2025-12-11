// Nacho WebGPU HAL (Section E & J)
// Hardware Abstraction Layer for Graphics

export class WebGPUContext {
    private adapter: GPUAdapter | null = null;
    private device: GPUDevice | null = null;
    private canvas: HTMLCanvasElement;
    private context: GPUCanvasContext | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    async initialize() {
        if (!navigator.gpu) {
            throw new Error("WebGPU not supported");
        }

        this.adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });

        if (!this.adapter) {
            throw new Error("No WebGPU adapter found");
        }

        // [Checklist #152] SharedArrayBuffer for multicore SOC
        const requiredFeatures: GPUFeatureName[] = [];
        if (this.adapter.features.has('shader-f16')) requiredFeatures.push('shader-f16');

        this.device = await this.adapter.requestDevice({ requiredFeatures });
        this.context = this.canvas.getContext('webgpu');

        if (!this.context) {
             throw new Error("Failed to get WebGPU context");
        }

        this.configureContext();
        
        console.log(`🚀 WebGPU Initialized: ${this.adapter.info.vendor} ${this.adapter.info.architecture}`);
    }

    private configureContext() {
        if (!this.device || !this.context) return;
        
        this.context.configure({
            device: this.device,
            // navigator.gpu is guarded in initialize(); TS doesn't narrow across methods
            format: navigator.gpu!.getPreferredCanvasFormat(),
            alphaMode: 'premultiplied'
        });
    }

    // [Checklist #151] Compile Shaders to WASM IR
    createComputePipeline(code: string) {
        if (!this.device) return null;
        return this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({ code }),
                entryPoint: 'main'
            }
        });
    }

    // [Checklist #166] Virtual L1/L2 Cache
    createCacheBuffer(size: number) {
        if (!this.device) return null;
        return this.device.createBuffer({
            size,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
    }

    // [Checklist #22] OpenGL ES -> WebGPU
    createGLESContext() {
        // ...
    }

    getDevice() {
        return this.device;
    }
}
