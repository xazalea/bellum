/**
 * GPU Renderer - WebGPU-accelerated display rendering
 * Handles both Android SurfaceFlinger and Windows GDI/DirectX output
 */

import { FrameScheduler, FrameMetrics } from './frame-scheduler';

export interface GPUResources {
  device: GPUDevice;
  context: GPUCanvasContext;
  renderPipeline: GPURenderPipeline;
  computePipelines: Map<string, GPUComputePipeline>;
  buffers: Map<string, GPUBuffer>;
  textures: Map<string, GPUTexture>;
}

export interface RenderOptions {
  width: number;
  height: number;
  pixelFormat: 'rgba8unorm' | 'bgra8unorm' | 'rgba16float';
  enableMSAA?: boolean;
  sampleCount?: 1 | 4;
}

export interface TextureOptions {
  width: number;
  height: number;
  format: GPUTextureFormat;
  usage: GPUTextureUsageFlags;
  label?: string;
}

/**
 * WebGPU-accelerated renderer for emulation display
 */
export class GPURenderer {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private adapter: GPUAdapter | null = null;
  
  private renderPipeline: GPURenderPipeline | null = null;
  private computePipelines: Map<string, GPUComputePipeline> = new Map();
  private buffers: Map<string, GPUBuffer> = new Map();
  private textures: Map<string, GPUTexture> = new Map();
  private textureViews: Map<string, GPUTextureView> = new Map();
  
  private options: RenderOptions;
  private scheduler: FrameScheduler;
  private initialized: boolean = false;
  private frameCount: number = 0;
  
  // Frame buffer for double buffering
  private currentTexture: GPUTexture | null = null;
  private previousTexture: GPUTexture | null = null;
  
  // Depth buffer
  private depthTexture: GPUTexture | null = null;
  
  // Uniform buffer for transforms
  private uniformBuffer: GPUBuffer | null = null;
  
  // Bind group for rendering
  private bindGroup: GPUBindGroup | null = null;

  constructor(options: Partial<RenderOptions> = {}) {
    this.options = {
      width: options.width || 800,
      height: options.height || 600,
      pixelFormat: options.pixelFormat || 'rgba8unorm',
      enableMSAA: options.enableMSAA ?? false,
      sampleCount: options.sampleCount || 1,
    };
    
    this.scheduler = new FrameScheduler({
      targetFPS: 60,
      adaptiveQuality: true,
      onMetrics: this.handleMetrics.bind(this),
    });
  }

  /**
   * Initialize the GPU renderer
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.initialized) return;

    // Check WebGPU support
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported in this browser');
    }

    this.canvas = canvas;

    // Request adapter
    this.adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!this.adapter) {
      throw new Error('No WebGPU adapter found');
    }

    // Request device with required features
    const requiredFeatures: GPUFeatureName[] = [];
    if (this.adapter.features.has('shader-f16')) {
      requiredFeatures.push('shader-f16');
    }
    if (this.adapter.features.has('depth-clip-control')) {
      requiredFeatures.push('depth-clip-control');
    }

    this.device = await this.adapter.requestDevice({
      requiredFeatures,
      requiredLimits: {
        maxTextureDimension1D: this.adapter.limits.maxTextureDimension1D,
        maxTextureDimension2D: this.adapter.limits.maxTextureDimension2D,
        maxTextureDimension3D: this.adapter.limits.maxTextureDimension3D,
        maxBindGroups: this.adapter.limits.maxBindGroups,
      },
    });

    // Set up error handling
    this.device.lost.then((info) => {
      console.error('[GPURenderer] Device lost:', info.message);
      this.initialized = false;
    });

    // Get context
    this.context = canvas.getContext('webgpu');
    if (!this.context) {
      throw new Error('Failed to get WebGPU context');
    }

    // Configure context
    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format,
      alphaMode: 'premultiplied',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });

    // Update options with actual format
    this.options.pixelFormat = format === 'bgra8unorm' ? 'bgra8unorm' : 'rgba8unorm';

    // Create render pipeline
    await this.createRenderPipeline();

    // Create depth texture
    this.createDepthTexture();

    // Create uniform buffer
    this.createUniformBuffer();

    this.initialized = true;
    console.log(`[GPURenderer] Initialized: ${this.options.width}x${this.options.height} (${format})`);
  }

  /**
   * Create the main render pipeline
   */
  private async createRenderPipeline(): Promise<void> {
    if (!this.device) return;

    // Shader module
    const shaderModule = this.device.createShaderModule({
      label: 'display-renderer',
      code: `
        struct Uniforms {
          resolution: vec2<f32>,
          time: f32,
          _padding: f32,
        }

        @group(0) @binding(0) var<uniform> uniforms: Uniforms;
        @group(0) @binding(1) var displayTexture: texture_2d<f32>;
        @group(0) @binding(2) var displaySampler: sampler;

        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) texCoord: vec2<f32>,
        }

        @vertex
        fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
          var output: VertexOutput;
          
          // Full-screen quad
          let positions = array<vec2<f32>, 6>(
            vec2<f32>(-1.0, -1.0),
            vec2<f32>(1.0, -1.0),
            vec2<f32>(-1.0, 1.0),
            vec2<f32>(-1.0, 1.0),
            vec2<f32>(1.0, -1.0),
            vec2<f32>(1.0, 1.0)
          );
          
          let texCoords = array<vec2<f32>, 6>(
            vec2<f32>(0.0, 1.0),
            vec2<f32>(1.0, 1.0),
            vec2<f32>(0.0, 0.0),
            vec2<f32>(0.0, 0.0),
            vec2<f32>(1.0, 1.0),
            vec2<f32>(1.0, 0.0)
          );
          
          output.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
          output.texCoord = texCoords[vertexIndex];
          
          return output;
        }

        @fragment
        fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
          let color = textureSample(displayTexture, displaySampler, input.texCoord);
          return color;
        }
      `,
    });

    // Sampler
    const sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    // Store sampler in a bind group layout
    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'display-bind-group-layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float' },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' },
        },
      ],
    });

    // Create pipeline layout
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'display-pipeline-layout',
      bindGroupLayouts: [bindGroupLayout],
    });

    // Create render pipeline
    this.renderPipeline = this.device.createRenderPipeline({
      label: 'display-render-pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: this.options.pixelFormat as GPUTextureFormat,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none',
      },
      multisample: {
        count: this.options.sampleCount,
      },
    });

    // Create sampler buffer for bind group
    const samplerBuffer = this.device.createBindGroup({
      label: 'display-sampler-bind-group',
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer! },
        },
        {
          binding: 1,
          resource: this.createDefaultTextureView(),
        },
        {
          binding: 2,
          resource: sampler,
        },
      ],
    });

    this.bindGroup = samplerBuffer;
  }

  /**
   * Create depth texture
   */
  private createDepthTexture(): void {
    if (!this.device) return;

    this.depthTexture = this.device.createTexture({
      label: 'depth-texture',
      size: { width: this.options.width, height: this.options.height },
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  /**
   * Create uniform buffer
   */
  private createUniformBuffer(): void {
    if (!this.device) return;

    this.uniformBuffer = this.device.createBuffer({
      label: 'uniform-buffer',
      size: 16, // vec2 + float + padding
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Initialize uniforms
    this.updateUniforms(0);
  }

  /**
   * Update uniform buffer
   */
  private updateUniforms(time: number): void {
    if (!this.device || !this.uniformBuffer) return;

    const data = new Float32Array([
      this.options.width,
      this.options.height,
      time,
      0, // padding
    ]);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }

  /**
   * Create default texture view
   */
  private createDefaultTextureView(): GPUTextureView {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    const texture = this.device.createTexture({
      label: 'default-texture',
      size: { width: 1, height: 1 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    // Write white pixel
    this.device.queue.writeTexture(
      { texture },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4 },
      [1, 1]
    );

    return texture.createView();
  }

  /**
   * Create a texture from buffer data
   */
  createTextureFromBuffer(
    data: ArrayBuffer,
    width: number,
    height: number,
    format: GPUTextureFormat = 'rgba8unorm'
  ): GPUTexture | null {
    if (!this.device) return null;

    const texture = this.device.createTexture({
      label: `texture-${width}x${height}`,
      size: { width, height },
      format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Write data to texture
    const bytesPerPixel = format.includes('16') ? 8 : 4;
    this.device.queue.writeTexture(
      { texture },
      new Uint8Array(data),
      { bytesPerRow: width * bytesPerPixel },
      [width, height]
    );

    return texture;
  }

  /**
   * Create a compute pipeline
   */
  createComputePipeline(name: string, code: string, entryPoint: string = 'main'): GPUComputePipeline | null {
    if (!this.device) return null;

    const shaderModule = this.device.createShaderModule({ code });
    
    const pipeline = this.device.createComputePipeline({
      label: `compute-${name}`,
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint,
      },
    });

    this.computePipelines.set(name, pipeline);
    return pipeline;
  }

  /**
   * Create a buffer
   */
  createBuffer(name: string, size: number, usage: GPUBufferUsageFlags): GPUBuffer | null {
    if (!this.device) return null;

    const buffer = this.device.createBuffer({
      label: `buffer-${name}`,
      size,
      usage,
    });

    this.buffers.set(name, buffer);
    return buffer;
  }

  /**
   * Render a frame
   */
  async renderFrame(texture: GPUTexture | null = null): Promise<void> {
    if (!this.device || !this.context || !this.renderPipeline) {
      return;
    }

    const commandEncoder = this.device.createCommandEncoder();

    // Get current texture from context
    const currentTexture = this.context.getCurrentTexture();
    const textureView = currentTexture.createView();

    // Begin render pass
    const renderPass = commandEncoder.beginRenderPass({
      label: 'display-render-pass',
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: this.depthTexture
        ? {
            view: this.depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
            stencilClearValue: 0,
            stencilLoadOp: 'clear',
            stencilStoreOp: 'store',
          }
        : undefined,
    });

    // Set pipeline and draw
    renderPass.setPipeline(this.renderPipeline);
    
    if (this.bindGroup) {
      renderPass.setBindGroup(0, this.bindGroup);
    }

    renderPass.draw(6); // Full-screen quad
    renderPass.end();

    // Submit command buffer
    this.device.queue.submit([commandEncoder.finish()]);
    
    this.frameCount++;
  }

  /**
   * Present the current frame
   */
  present(): void {
    // WebGPU presents automatically after renderPass.end()
  }

  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;

    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    // Recreate depth texture
    this.createDepthTexture();

    // Update uniforms
    this.updateUniforms(performance.now() / 1000);
  }

  /**
   * Handle metrics from frame scheduler
   */
  private handleMetrics(metrics: FrameMetrics): void {
    // Could be used for adaptive rendering
  }

  /**
   * Start the render loop
   */
  startRenderLoop(renderCallback: () => Promise<GPUTexture | null> | GPUTexture | null): () => void {
    const unsubscribe = this.scheduler.onFrame(async () => {
      const texture = await renderCallback();
      await this.renderFrame(texture);
    });

    this.scheduler.start();
    return unsubscribe;
  }

  /**
   * Stop the render loop
   */
  stopRenderLoop(): void {
    this.scheduler.stop();
  }

  /**
   * Get current frame count
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Get current metrics
   */
  getMetrics(): FrameMetrics {
    return this.scheduler.getMetrics();
  }

  /**
   * Get the GPU device
   */
  getDevice(): GPUDevice | null {
    return this.device;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.scheduler.stop();

    // Destroy textures
    for (const texture of this.textures.values()) {
      texture.destroy();
    }
    this.textures.clear();

    // Destroy buffers
    for (const buffer of this.buffers.values()) {
      buffer.destroy();
    }
    this.buffers.clear();

    // Destroy depth texture
    if (this.depthTexture) {
      this.depthTexture.destroy();
      this.depthTexture = null;
    }

    // Destroy uniform buffer
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
      this.uniformBuffer = null;
    }

    this.initialized = false;
  }
}

/**
 * Create a GPU renderer
 */
export function createGPURenderer(
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  options?: Partial<RenderOptions>
): GPURenderer {
  const renderer = new GPURenderer(options);
  // Note: initialize() must be called separately as it's async
  return renderer;
}