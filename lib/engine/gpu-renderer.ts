/**
 * GPU Renderer - WebGPU-accelerated display rendering with WebGL2 fallback
 * Handles both Android SurfaceFlinger and Windows GDI/DirectX output
 */

import { FrameScheduler, FrameMetrics } from './frame-scheduler';

// WebGL2 fallback types
interface WebGL2Resources {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  textures: Map<string, WebGLTexture>;
  buffers: Map<string, WebGLBuffer>;
}

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

/**
 * WebGL2 Fallback Renderer
 * Used when WebGPU is not available
 */
export class WebGL2FallbackRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private textures: Map<string, WebGLTexture> = new Map();
  private buffers: Map<string, WebGLBuffer> = new Map();
  
  private options: RenderOptions;
  private scheduler: FrameScheduler;
  private initialized: boolean = false;
  private frameCount: number = 0;
  private currentTexture: WebGLTexture | null = null;

  constructor(options: Partial<RenderOptions> = {}) {
    this.options = {
      width: options.width || 800,
      height: options.height || 600,
      pixelFormat: 'rgba8unorm',
      enableMSAA: options.enableMSAA ?? false,
      sampleCount: 1,
    };
    
    this.scheduler = new FrameScheduler({
      targetFPS: 60,
      adaptiveQuality: true,
      onMetrics: this.handleMetrics.bind(this),
    });
  }

  /**
   * Initialize the WebGL2 renderer
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.initialized) return;

    this.canvas = canvas;

    // Get WebGL2 context
    this.gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: this.options.enableMSAA,
      preserveDrawingBuffer: true,
    });

    if (!this.gl) {
      throw new Error('WebGL2 not supported in this browser');
    }

    // Create shader program
    this.program = this.createShaderProgram();
    if (!this.program) {
      throw new Error('Failed to create shader program');
    }

    // Create VAO for full-screen quad
    this.vao = this.createQuadVAO();

    // Enable necessary features
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.initialized = true;
    console.log(`[WebGL2Fallback] Initialized: ${this.options.width}x${this.options.height}`);
  }

  /**
   * Create shader program
   */
  private createShaderProgram(): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, `
      #version 300 es
      in vec2 a_position;
      in vec2 a_texCoord;
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `);

    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, `
      #version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      uniform sampler2D u_texture;
      out vec4 fragColor;
      
      void main() {
        fragColor = texture(u_texture, v_texCoord);
      }
    `);

    if (!vertexShader || !fragmentShader) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('[WebGL2Fallback] Program link error:', this.gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  /**
   * Create a shader
   */
  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('[WebGL2Fallback] Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Create VAO for full-screen quad
   */
  private createQuadVAO(): WebGLVertexArrayObject | null {
    if (!this.gl || !this.program) return null;

    const vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(vao);

    // Position buffer
    const positions = new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1
    ]);

    const posBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, posBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const posLoc = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0);

    // TexCoord buffer
    const texCoords = new Float32Array([
      0, 1,  1, 1,  0, 0,
      0, 0,  1, 1,  1, 0
    ]);

    const texBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);

    const texLoc = this.gl.getAttribLocation(this.program, 'a_texCoord');
    this.gl.enableVertexAttribArray(texLoc);
    this.gl.vertexAttribPointer(texLoc, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindVertexArray(null);

    return vao;
  }

  /**
   * Create a texture from buffer data
   */
  createTextureFromBuffer(
    data: ArrayBuffer,
    width: number,
    height: number,
    format: number = 0x1908 // GL_RGBA
  ): WebGLTexture | null {
    if (!this.gl) return null;

    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      width,
      height,
      0,
      format,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array(data)
    );

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.textures.set(`texture-${Date.now()}`, texture);
    return texture;
  }

  /**
   * Render a frame
   */
  async renderFrame(texture: WebGLTexture | null = null): Promise<void> {
    if (!this.gl || !this.program || !this.vao) return;

    const gl = this.gl;

    // Clear
    gl.viewport(0, 0, this.options.width, this.options.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use program
    gl.useProgram(this.program);

    // Bind VAO
    gl.bindVertexArray(this.vao);

    // Bind texture if provided
    if (texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      const texLoc = gl.getUniformLocation(this.program, 'u_texture');
      gl.uniform1i(texLoc, 0);
    }

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Unbind
    gl.bindVertexArray(null);

    this.frameCount++;
  }

  /**
   * Handle metrics from frame scheduler
   */
  private handleMetrics(metrics: FrameMetrics): void {
    // Could be used for adaptive rendering
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
  }

  /**
   * Start the render loop
   */
  startRenderLoop(renderCallback: () => Promise<WebGLTexture | null> | WebGLTexture | null): () => void {
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

    // Delete textures
    for (const texture of this.textures.values()) {
      this.gl?.deleteTexture(texture);
    }
    this.textures.clear();

    // Delete buffers
    for (const buffer of this.buffers.values()) {
      this.gl?.deleteBuffer(buffer);
    }
    this.buffers.clear();

    // Delete program
    if (this.program) {
      this.gl?.deleteProgram(this.program);
      this.program = null;
    }

    // Delete VAO
    if (this.vao) {
      this.gl?.deleteVertexArray(this.vao);
      this.vao = null;
    }

    this.initialized = false;
  }
}

/**
 * Create the best available renderer (WebGPU or WebGL2 fallback)
 */
export async function createBestRenderer(
  canvas: HTMLCanvasElement,
  options?: Partial<RenderOptions>
): Promise<GPURenderer | WebGL2FallbackRenderer> {
  // Try WebGPU first
  if (navigator.gpu) {
    try {
      const renderer = new GPURenderer(options);
      await renderer.initialize(canvas);
      return renderer;
    } catch (error) {
      console.warn('[Renderer] WebGPU initialization failed, falling back to WebGL2:', error);
    }
  }

  // Fall back to WebGL2
  const renderer = new WebGL2FallbackRenderer(options);
  await renderer.initialize(canvas);
  return renderer;
}
