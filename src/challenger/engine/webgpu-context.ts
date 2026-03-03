export class WebGPUContext {
    private static instance: WebGPUContext;
    public device: GPUDevice | null = null;
    public adapter: GPUAdapter | null = null;
    public context: GPUCanvasContext | null = null;
    public presentationFormat: GPUTextureFormat = 'bgra8unorm';

    private constructor() { }

    public static getInstance(): WebGPUContext {
        if (!WebGPUContext.instance) {
            WebGPUContext.instance = new WebGPUContext();
        }
        return WebGPUContext.instance;
    }

    public async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
        if (!navigator.gpu) {
            console.error('WebGPU is not supported in this browser.');
            return false;
        }

        try {
            this.adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance'
            });

            if (!this.adapter) {
                console.error('Failed to request WebGPU adapter.');
                return false;
            }

            this.device = await this.adapter.requestDevice({
                requiredFeatures: [],
                requiredLimits: {
                    maxComputeWorkgroupStorageSize: 32768,
                    maxStorageBufferBindingSize: 268435456 // 256MB
                }
            });

            this.context = canvas.getContext('webgpu');

            if (!this.context) {
                console.error('Failed to get WebGPU context.');
                return false;
            }

            this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

            this.context.configure({
                device: this.device,
                format: this.presentationFormat,
                alphaMode: 'premultiplied'
            });

            this.device.lost.then((info) => {
                console.error(`WebGPU device lost: ${info.message}`);
                // TODO: Handle device restoration
            });

            console.log('WebGPU Initialized Successfully: ', this.adapter.info);
            return true;
        } catch (error) {
            console.error('WebGPU Initialization failed:', error);
            return false;
        }
    }

    public getDevice(): GPUDevice {
        if (!this.device) throw new Error("WebGPU Device not initialized");
        return this.device;
    }
}

export const webgpu = WebGPUContext.getInstance();
