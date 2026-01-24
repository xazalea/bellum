export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext | null = null;
  private device: GPUDevice | null = null;
  private format: GPUTextureFormat | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private sampler: GPUSampler | null = null;
  private texture: GPUTexture | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private initialized = false;
  private initializing: Promise<void> | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
      if (!gpu) return;
      const adapter = await gpu.requestAdapter();
      if (!adapter) return;
      const device = await adapter.requestDevice();
      const context = this.canvas.getContext('webgpu');
      if (!context) return;
      const format = gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: 'opaque' });

      const shaderModule = device.createShaderModule({
        code: `
          struct VSOut {
            @builtin(position) position : vec4f,
            @location(0) uv : vec2f,
          };
          @vertex
          fn vsMain(@location(0) pos: vec2f, @location(1) uv: vec2f) -> VSOut {
            var out: VSOut;
            out.position = vec4f(pos, 0.0, 1.0);
            out.uv = uv;
            return out;
          }
          @group(0) @binding(0) var samp: sampler;
          @group(0) @binding(1) var tex: texture_2d<f32>;
          @fragment
          fn fsMain(@location(0) uv: vec2f) -> @location(0) vec4f {
            return textureSample(tex, samp, uv);
          }
        `,
      });

      const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
          module: shaderModule,
          entryPoint: 'vsMain',
          buffers: [
            {
              arrayStride: 16,
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x2' },
                { shaderLocation: 1, offset: 8, format: 'float32x2' },
              ],
            },
          ],
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fsMain',
          targets: [{ format }],
        },
        primitive: { topology: 'triangle-strip' },
      });

      const sampler = (device as any).createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
      });

      this.device = device;
      this.context = context;
      this.format = format;
      this.pipeline = pipeline;
      this.sampler = sampler;
      this.initialized = true;
    })();
    await this.initializing;
  }

  private ensureTexture(width: number, height: number): void {
    if (!this.device || !this.sampler || !this.pipeline) return;
    if (this.texture && this.texture.width === width && this.texture.height === height) return;
    this.texture?.destroy();
    this.texture = this.device.createTexture({
      size: { width, height },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: this.texture.createView() },
      ],
    });
  }

  async render(source: ImageData | HTMLImageElement | HTMLCanvasElement): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.device || !this.context || !this.pipeline || !this.bindGroup || !this.sampler) {
      return false;
    }

    let width = 1;
    let height = 1;
    if (source instanceof ImageData) {
      width = source.width;
      height = source.height;
    } else {
      width = source.width;
      height = source.height;
    }
    this.ensureTexture(width, height);
    if (!this.texture || !this.bindGroup) return false;

    if (source instanceof ImageData) {
      this.device.queue.writeTexture(
        { texture: this.texture },
        source.data,
        { bytesPerRow: source.width * 4 },
        { width: source.width, height: source.height }
      );
    } else {
      const bitmap = await createImageBitmap(source);
      this.device.queue.copyExternalImageToTexture(
        { source: bitmap },
        { texture: this.texture },
        { width, height }
      );
      bitmap.close();
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });

    const vertexData = new Float32Array([
      -1, -1, 0, 1,
      1, -1, 1, 1,
      -1, 1, 0, 0,
      1, 1, 1, 0,
    ]);
    const vertexBuffer = this.device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(vertexBuffer, 0, vertexData);

    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.bindGroup);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.draw(4);
    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
    return true;
  }
}
