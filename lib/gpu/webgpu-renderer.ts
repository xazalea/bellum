/**
 * Production-grade triple-buffered WebGPU renderer.
 * Cloudflare Pages / Edge Runtime compatible — zero Node.js built-ins.
 */

export interface RendererConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface DrawCommand {
  type: 'draw' | 'drawIndexed' | 'dispatch';
  pipeline?: GPURenderPipeline | GPUComputePipeline;
  vertexBuffer?: GPUBuffer;
  indexBuffer?: GPUBuffer;
  bindGroups?: GPUBindGroup[];
  vertexCount?: number;
  indexCount?: number;
  instanceCount?: number;
  workgroupX?: number;
  workgroupY?: number;
  workgroupZ?: number;
}

// Sizes for triple-buffer layout
const VERTEX_BUFFER_SIZE = 16 * 1024 * 1024;   // 16 MB per slot
const UNIFORM_BUFFER_SIZE = 256 * 1024;          // 256 KB per slot
const FRAME_TIME_RING_SIZE = 30;
const RESOLUTION_SCALE_MIN = 0.5;
const RESOLUTION_SCALE_MAX = 1.0;
const FRAME_TIME_HIGH_THRESHOLD_MS = 22;         // drop resolution above this avg
const FRAME_TIME_LOW_THRESHOLD_MS = 14;          // raise resolution below this avg
const RESOLUTION_SCALE_DOWN_STEP = 0.125;
const RESOLUTION_SCALE_UP_STEP = 0.0625;

interface TripleBuffer {
  vertex: GPUBuffer;
  uniform: GPUBuffer;
  framebuffer: GPUBuffer;
}

export class WebGPURenderer {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private config: RendererConfig | null = null;

  // Triple buffering
  private tripleBuffers: TripleBuffer[] = [];
  private writeIdx = 0;
  private frameCount = 0;

  // Frame pacer
  private frameTimes: number[] = [];
  private resolutionScale = RESOLUTION_SCALE_MAX;
  private offscreenTexture: GPUTexture | null = null;
  private offscreenView: GPUTextureView | null = null;

  // Depth attachment
  private depthTexture: GPUTexture | null = null;
  private depthView: GPUTextureView | null = null;

  // Caches
  private bindGroupCache: Map<string, GPUBindGroup> = new Map();
  private pipelineCache: Map<string, GPURenderPipeline | GPUComputePipeline> = new Map();

  // Shared WASM memory (set externally before calling submitFramebuffer)
  wasmMemory: WebAssembly.Memory | null = null;

  // Post-process compute pipeline (optional — set externally)
  postProcessPipeline: GPUComputePipeline | null = null;
  postProcessBindGroup: GPUBindGroup | null = null;

  // Stats
  private drawCallCount = 0;
  private drawnSinceLastQuery = 0;
  private lastFrameTime = 0;
  private frameStartTime = 0;

  // ---------------------------------------------------------------------------
  // initialize
  // ---------------------------------------------------------------------------

  async initialize(config: RendererConfig): Promise<void> {
    if (!navigator.gpu) throw new Error('WebGPU not supported in this environment');

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    if (!adapter) throw new Error('Failed to acquire GPUAdapter');

    this.device = await adapter.requestDevice({
      requiredFeatures: [],
      requiredLimits: {},
    });

    this.config = config;

    const canvasContext = config.canvas.getContext('webgpu');
    if (!canvasContext) throw new Error('Failed to get WebGPU canvas context');
    this.context = canvasContext;

    const preferredFormat = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: preferredFormat as GPUTextureFormat,
      alphaMode: 'premultiplied',
    });

    this.createTripleBuffers();
    this.createOffscreenTexture();
    this.createDepthTexture();

    this.device.lost.then(info => {
      console.error(`WebGPU device lost: ${info.message} (reason: ${info.reason})`);
    });
  }

  // ---------------------------------------------------------------------------
  // createTripleBuffers
  // ---------------------------------------------------------------------------

  private createTripleBuffers(): void {
    if (!this.device || !this.config) return;
    const { width, height } = this.config;
    const framebufferSize = width * height * 4; // RGBA8

    for (let i = 0; i < 3; i++) {
      const vertex = this.device.createBuffer({
        label: `vertex-buf-${i}`,
        size: VERTEX_BUFFER_SIZE,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      const uniform = this.device.createBuffer({
        label: `uniform-buf-${i}`,
        size: UNIFORM_BUFFER_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const framebuffer = this.device.createBuffer({
        label: `framebuffer-buf-${i}`,
        size: Math.max(framebufferSize, 4), // minimum 4 bytes
        usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
      });
      this.tripleBuffers.push({ vertex, uniform, framebuffer });
    }
  }

  // ---------------------------------------------------------------------------
  // createOffscreenTexture
  // ---------------------------------------------------------------------------

  private createOffscreenTexture(): void {
    if (!this.device || !this.config) return;
    const scaledW = Math.max(1, Math.floor(this.config.width * this.resolutionScale));
    const scaledH = Math.max(1, Math.floor(this.config.height * this.resolutionScale));

    this.offscreenTexture?.destroy();
    this.offscreenTexture = this.device.createTexture({
      label: 'offscreen-color',
      size: { width: scaledW, height: scaledH, depthOrArrayLayers: 1 },
      format: 'bgra8unorm',
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
    });
    this.offscreenView = this.offscreenTexture.createView();
  }

  // ---------------------------------------------------------------------------
  // createDepthTexture
  // ---------------------------------------------------------------------------

  private createDepthTexture(): void {
    if (!this.device || !this.config) return;
    const scaledW = Math.max(1, Math.floor(this.config.width * this.resolutionScale));
    const scaledH = Math.max(1, Math.floor(this.config.height * this.resolutionScale));

    this.depthTexture?.destroy();
    this.depthTexture = this.device.createTexture({
      label: 'depth-stencil',
      size: { width: scaledW, height: scaledH, depthOrArrayLayers: 1 },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.depthView = this.depthTexture.createView();
  }

  // ---------------------------------------------------------------------------
  // beginFrame
  // ---------------------------------------------------------------------------

  beginFrame(): GPUCommandEncoder | null {
    if (!this.device) return null;
    this.writeIdx = this.frameCount % 3;
    this.frameStartTime = performance.now();
    this.drawnSinceLastQuery = 0;
    return this.device.createCommandEncoder({ label: `frame-encoder-${this.frameCount}` });
  }

  // ---------------------------------------------------------------------------
  // renderPass — opaque + blended sub-passes
  // ---------------------------------------------------------------------------

  renderPass(encoder: GPUCommandEncoder, commands: DrawCommand[]): void {
    if (!this.offscreenView || !this.depthView) return;

    // Split into render commands vs compute dispatches
    const renderCmds = commands.filter(c => c.type === 'draw' || c.type === 'drawIndexed');
    const computeCmds = commands.filter(c => c.type === 'dispatch');

    // --- Opaque render pass (depth test enabled) ---
    if (renderCmds.length > 0) {
      const passDesc: GPURenderPassDescriptor = {
        label: 'opaque-pass',
        colorAttachments: [
          {
            view: this.offscreenView,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        depthStencilAttachment: {
          view: this.depthView,
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      };

      const pass = encoder.beginRenderPass(passDesc);

      for (const cmd of renderCmds) {
        if (cmd.pipeline) {
          pass.setPipeline(cmd.pipeline as GPURenderPipeline);
        }
        if (cmd.bindGroups) {
          cmd.bindGroups.forEach((bg, idx) => pass.setBindGroup(idx, bg));
        }
        if (cmd.vertexBuffer) {
          pass.setVertexBuffer(0, cmd.vertexBuffer);
        }

        if (cmd.type === 'drawIndexed' && cmd.indexBuffer) {
          pass.setIndexBuffer(cmd.indexBuffer, 'uint16');
          pass.drawIndexed(
            cmd.indexCount ?? 0,
            cmd.instanceCount ?? 1,
          );
        } else if (cmd.type === 'draw') {
          pass.draw(cmd.vertexCount ?? 0, cmd.instanceCount ?? 1);
        }
        this.drawnSinceLastQuery++;
      }

      pass.end();
    }

    // --- Compute dispatches ---
    if (computeCmds.length > 0) {
      const computePass = encoder.beginComputePass({ label: 'compute-pass' });
      for (const cmd of computeCmds) {
        if (cmd.pipeline) {
          computePass.setPipeline(cmd.pipeline as GPUComputePipeline);
        }
        if (cmd.bindGroups) {
          cmd.bindGroups.forEach((bg, idx) => computePass.setBindGroup(idx, bg));
        }
        computePass.dispatchWorkgroups(
          cmd.workgroupX ?? 1,
          cmd.workgroupY ?? 1,
          cmd.workgroupZ ?? 1,
        );
      }
      computePass.end();
    }
  }

  // ---------------------------------------------------------------------------
  // postProcess — bloom/tonemapping compute placeholder
  // ---------------------------------------------------------------------------

  postProcess(encoder: GPUCommandEncoder): void {
    if (!this.device) return;
    if (!this.postProcessPipeline || !this.postProcessBindGroup || !this.offscreenView) return;

    const scaledW = Math.max(1, Math.floor((this.config?.width ?? 1) * this.resolutionScale));
    const scaledH = Math.max(1, Math.floor((this.config?.height ?? 1) * this.resolutionScale));

    const pass = encoder.beginComputePass({ label: 'post-process-pass' });
    pass.setPipeline(this.postProcessPipeline);
    pass.setBindGroup(0, this.postProcessBindGroup);
    // 8×8 workgroup tiles
    pass.dispatchWorkgroups(
      Math.ceil(scaledW / 8),
      Math.ceil(scaledH / 8),
      1,
    );
    pass.end();
  }

  // ---------------------------------------------------------------------------
  // endFrame
  // ---------------------------------------------------------------------------

  endFrame(encoder: GPUCommandEncoder): void {
    if (!this.device || !this.context) return;

    // Blit offscreen → swap chain
    if (this.offscreenTexture) {
      const swapTexture = this.context.getCurrentTexture();
      encoder.copyTextureToTexture(
        { texture: this.offscreenTexture },
        { texture: swapTexture },
        {
          width: Math.min(
            this.offscreenTexture.width,
            swapTexture.width,
          ),
          height: Math.min(
            this.offscreenTexture.height,
            swapTexture.height,
          ),
          depthOrArrayLayers: 1,
        },
      );
    }

    this.device.queue.submit([encoder.finish()]);

    const now = performance.now();
    const frameTime = now - this.frameStartTime;
    this.lastFrameTime = frameTime;
    this.drawCallCount += this.drawnSinceLastQuery;
    this.updateFramePacer(frameTime);
    this.frameCount++;
  }

  // ---------------------------------------------------------------------------
  // submitFramebuffer — upload WASM linear framebuffer to GPU buffer
  // ---------------------------------------------------------------------------

  submitFramebuffer(ptr: number, width: number, height: number): void {
    if (!this.device || !this.wasmMemory) return;
    const buf = this.tripleBuffers[this.writeIdx];
    if (!buf) return;

    const byteLength = width * height * 4;
    this.device.queue.writeBuffer(
      buf.framebuffer,
      0,
      this.wasmMemory.buffer,
      ptr,
      byteLength,
    );
  }

  // ---------------------------------------------------------------------------
  // updateFramePacer
  // ---------------------------------------------------------------------------

  private updateFramePacer(frameTime: number): void {
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > FRAME_TIME_RING_SIZE) {
      this.frameTimes.shift();
    }
    if (this.frameTimes.length < 5) return; // not enough data yet

    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    let newScale = this.resolutionScale;

    if (avg > FRAME_TIME_HIGH_THRESHOLD_MS) {
      newScale = Math.max(RESOLUTION_SCALE_MIN, newScale - RESOLUTION_SCALE_DOWN_STEP);
    } else if (avg < FRAME_TIME_LOW_THRESHOLD_MS) {
      newScale = Math.min(RESOLUTION_SCALE_MAX, newScale + RESOLUTION_SCALE_UP_STEP);
    }

    if (newScale !== this.resolutionScale) {
      this.resolutionScale = newScale;
      this.createOffscreenTexture();
      this.createDepthTexture();
    }
  }

  // ---------------------------------------------------------------------------
  // getCachedBindGroup
  // ---------------------------------------------------------------------------

  getCachedBindGroup(key: string, descriptor: GPUBindGroupDescriptor): GPUBindGroup {
    const cached = this.bindGroupCache.get(key);
    if (cached) return cached;
    if (!this.device) throw new Error('WebGPURenderer not initialized');
    const bg = this.device.createBindGroup(descriptor);
    this.bindGroupCache.set(key, bg);
    return bg;
  }

  // ---------------------------------------------------------------------------
  // getOrCreatePipeline
  // ---------------------------------------------------------------------------

  async getOrCreatePipeline(
    key: string,
    descriptor: GPURenderPipelineDescriptor,
  ): Promise<GPURenderPipeline> {
    const cached = this.pipelineCache.get(key);
    if (cached) return cached as GPURenderPipeline;
    if (!this.device) throw new Error('WebGPURenderer not initialized');
    const pipeline = await this.device.createRenderPipelineAsync(descriptor);
    this.pipelineCache.set(key, pipeline);
    return pipeline;
  }

  // ---------------------------------------------------------------------------
  // getStats
  // ---------------------------------------------------------------------------

  getStats(): {
    fps: number;
    onePercentLow: number;
    drawCalls: number;
    resolutionScale: number;
  } {
    const times = this.frameTimes;
    const avg = times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 16.67;
    const fps = 1000 / avg;

    // 1% low: sort ascending, take bottom 1%
    const sorted = times.slice().sort((a, b) => a - b);
    const p99idx = Math.max(0, Math.floor(sorted.length * 0.99) - 1);
    const p99frameTime = sorted[p99idx] ?? avg;
    const onePercentLow = 1000 / p99frameTime;

    const drawCalls = this.drawnSinceLastQuery;

    return { fps, onePercentLow, drawCalls, resolutionScale: this.resolutionScale };
  }

  // ---------------------------------------------------------------------------
  // resize
  // ---------------------------------------------------------------------------

  resize(width: number, height: number): void {
    if (!this.config) return;
    this.config.width = width;
    this.config.height = height;

    // Destroy and recreate framebuffer buffers for new size
    for (const buf of this.tripleBuffers) {
      buf.framebuffer.destroy();
    }
    if (this.device) {
      for (let i = 0; i < 3; i++) {
        const framebufferSize = Math.max(width * height * 4, 4);
        this.tripleBuffers[i].framebuffer = this.device.createBuffer({
          label: `framebuffer-buf-${i}`,
          size: framebufferSize,
          usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
        });
      }
    }

    this.createOffscreenTexture();
    this.createDepthTexture();
    this.bindGroupCache.clear();
  }

  // ---------------------------------------------------------------------------
  // destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    for (const buf of this.tripleBuffers) {
      buf.vertex.destroy();
      buf.uniform.destroy();
      buf.framebuffer.destroy();
    }
    this.tripleBuffers = [];
    this.offscreenTexture?.destroy();
    this.depthTexture?.destroy();
    this.bindGroupCache.clear();
    this.pipelineCache.clear();
    this.context?.unconfigure();
    this.device?.destroy();
    this.device = null;
    this.context = null;
    this.config = null;
  }
}

export const webGPURenderer = new WebGPURenderer();
