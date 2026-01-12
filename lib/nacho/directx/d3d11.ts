/**
 * Direct3D 11 Emulation via WebGPU
 * Maps DirectX 11 API to WebGPU for 3D graphics rendering
 */

export class D3D11Device {
  private gpuDevice: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: GPUCanvasContext | null = null;
  private immediateContext: D3D11DeviceContext | null = null;
  private featureLevel: number = 0xB000; // D3D_FEATURE_LEVEL_11_0
  
  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    this.canvas = canvas;
    
    // Check WebGPU support
    if (!navigator.gpu) {
      console.error('[D3D11] WebGPU not supported');
      return false;
    }
    
    try {
      // Request adapter
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });
      
      if (!this.adapter) {
        console.error('[D3D11] Failed to get GPU adapter');
        return false;
      }
      
      // Request device
      this.gpuDevice = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {},
      });
      
      // Get canvas context
      this.context = canvas.getContext('webgpu');
      if (!this.context) {
        console.error('[D3D11] Failed to get WebGPU context');
        return false;
      }
      
      // Configure context
      const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.gpuDevice,
        format: presentationFormat,
        alphaMode: 'premultiplied',
      });
      
      // Create immediate context
      this.immediateContext = new D3D11DeviceContext(this.gpuDevice, this.context);
      
      console.log('[D3D11] Device initialized successfully');
      return true;
      
    } catch (e) {
      console.error('[D3D11] Initialization failed:', e);
      return false;
    }
  }
  
  /**
   * D3D11CreateDevice equivalent
   */
  static async createDevice(canvas: HTMLCanvasElement): Promise<D3D11Device | null> {
    const device = new D3D11Device();
    const success = await device.initialize(canvas);
    return success ? device : null;
  }
  
  /**
   * Get immediate context
   */
  getImmediateContext(): D3D11DeviceContext | null {
    return this.immediateContext;
  }
  
  /**
   * Create buffer
   */
  createBuffer(desc: D3D11BufferDesc, initialData: ArrayBuffer | null): D3D11Buffer | null {
    if (!this.gpuDevice) return null;
    
    let usage: GPUBufferUsageFlags = 0;
    
    // Map D3D11 bind flags to WebGPU usage
    if (desc.bindFlags & 0x1) usage |= GPUBufferUsage.VERTEX; // VERTEX_BUFFER
    if (desc.bindFlags & 0x2) usage |= GPUBufferUsage.INDEX;  // INDEX_BUFFER
    if (desc.bindFlags & 0x4) usage |= GPUBufferUsage.UNIFORM; // CONSTANT_BUFFER
    if (desc.bindFlags & 0x80) usage |= GPUBufferUsage.STORAGE; // UNORDERED_ACCESS
    
    usage |= GPUBufferUsage.COPY_DST; // Allow updates
    
    const buffer = this.gpuDevice.createBuffer({
      size: desc.byteWidth,
      usage,
      mappedAtCreation: initialData !== null,
    });
    
    if (initialData) {
      new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(initialData));
      buffer.unmap();
    }
    
    return new D3D11Buffer(buffer, desc);
  }
  
  /**
   * Create texture 2D
   */
  createTexture2D(desc: D3D11Texture2DDesc, initialData: any): D3D11Texture2D | null {
    if (!this.gpuDevice) return null;
    
    const texture = this.gpuDevice.createTexture({
      size: { width: desc.width, height: desc.height, depthOrArrayLayers: desc.arraySize },
      format: this.dxgiFormatToWebGPU(desc.format),
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST |
             (desc.bindFlags & 0x20 ? GPUTextureUsage.RENDER_ATTACHMENT : 0), // RENDER_TARGET
      mipLevelCount: desc.mipLevels,
      sampleCount: desc.sampleDesc.count,
    });
    
    return new D3D11Texture2D(texture, desc);
  }
  
  /**
   * Create vertex shader
   */
  createVertexShader(bytecode: ArrayBuffer): D3D11VertexShader | null {
    // Vertex shader will be compiled from HLSL → WGSL
    return new D3D11VertexShader(bytecode);
  }
  
  /**
   * Create pixel shader
   */
  createPixelShader(bytecode: ArrayBuffer): D3D11PixelShader | null {
    // Pixel shader will be compiled from HLSL → WGSL
    return new D3D11PixelShader(bytecode);
  }
  
  /**
   * Create input layout
   */
  createInputLayout(
    elements: D3D11InputElementDesc[],
    shaderBytecode: ArrayBuffer
  ): D3D11InputLayout | null {
    return new D3D11InputLayout(elements);
  }
  
  /**
   * Create rasterizer state
   */
  createRasterizerState(desc: D3D11RasterizerDesc): D3D11RasterizerState | null {
    return new D3D11RasterizerState(desc);
  }
  
  /**
   * Create blend state
   */
  createBlendState(desc: D3D11BlendDesc): D3D11BlendState | null {
    return new D3D11BlendState(desc);
  }
  
  /**
   * Create depth stencil state
   */
  createDepthStencilState(desc: D3D11DepthStencilDesc): D3D11DepthStencilState | null {
    return new D3D11DepthStencilState(desc);
  }
  
  /**
   * Map DXGI format to WebGPU format
   */
  private dxgiFormatToWebGPU(format: number): GPUTextureFormat {
    const formatMap: Record<number, GPUTextureFormat> = {
      28: 'rgba8unorm',     // DXGI_FORMAT_R8G8B8A8_UNORM
      87: 'bgra8unorm',     // DXGI_FORMAT_B8G8R8A8_UNORM
      10: 'rgba16float',    // DXGI_FORMAT_R16G16B16A16_FLOAT
      2: 'rgba32float',     // DXGI_FORMAT_R32G32B32A32_FLOAT
      45: 'depth24plus-stencil8', // DXGI_FORMAT_D24_UNORM_S8_UINT
    };
    
    return formatMap[format] || 'rgba8unorm';
  }
}

/**
 * Device Context (Immediate or Deferred)
 */
export class D3D11DeviceContext {
  private device: GPUDevice;
  private canvasContext: GPUCanvasContext;
  private commandEncoder: GPUCommandEncoder | null = null;
  private renderPassEncoder: GPURenderPassEncoder | null = null;
  private currentPipeline: GPURenderPipeline | null = null;
  
  // Bound resources
  private vertexBuffers: (D3D11Buffer | null)[] = new Array(8).fill(null);
  private indexBuffer: D3D11Buffer | null = null;
  private constantBuffers: (D3D11Buffer | null)[] = new Array(14).fill(null);
  private vertexShader: D3D11VertexShader | null = null;
  private pixelShader: D3D11PixelShader | null = null;
  private inputLayout: D3D11InputLayout | null = null;
  
  constructor(device: GPUDevice, canvasContext: GPUCanvasContext) {
    this.device = device;
    this.canvasContext = canvasContext;
  }
  
  /**
   * Begin drawing
   */
  beginFrame() {
    this.commandEncoder = this.device.createCommandEncoder();
  }
  
  /**
   * Begin render pass
   */
  beginRenderPass(renderTargetView: any, depthStencilView: any, clearColor: number[] | null) {
    if (!this.commandEncoder) return;
    
    const renderPassDesc: GPURenderPassDescriptor = {
      colorAttachments: [{
        view: this.canvasContext.getCurrentTexture().createView(),
        clearValue: clearColor ? { r: clearColor[0], g: clearColor[1], b: clearColor[2], a: clearColor[3] } : undefined,
        loadOp: clearColor ? 'clear' : 'load',
        storeOp: 'store',
      }],
    };
    
    this.renderPassEncoder = this.commandEncoder.beginRenderPass(renderPassDesc);
  }
  
  /**
   * Set vertex buffers
   */
  setVertexBuffers(startSlot: number, buffers: D3D11Buffer[], strides: number[], offsets: number[]) {
    for (let i = 0; i < buffers.length; i++) {
      this.vertexBuffers[startSlot + i] = buffers[i];
    }
    
    // Bind to render pass
    if (this.renderPassEncoder) {
      for (let i = 0; i < buffers.length; i++) {
        if (buffers[i]) {
          // WebGPU API: setVertexBuffer(slot, buffer, offset?, size?)
          (this.renderPassEncoder as any).setVertexBuffer(startSlot + i, buffers[i].buffer, offsets[i]);
        }
      }
    }
  }
  
  /**
   * Set index buffer
   */
  setIndexBuffer(buffer: D3D11Buffer, format: number, offset: number) {
    this.indexBuffer = buffer;
    
    if (this.renderPassEncoder) {
      const indexFormat = format === 1 ? 'uint16' : 'uint32'; // R16_UINT or R32_UINT
      this.renderPassEncoder.setIndexBuffer(buffer.buffer, indexFormat, offset);
    }
  }
  
  /**
   * Set vertex shader
   */
  setVertexShader(shader: D3D11VertexShader | null) {
    this.vertexShader = shader;
  }
  
  /**
   * Set pixel shader
   */
  setPixelShader(shader: D3D11PixelShader | null) {
    this.pixelShader = shader;
  }
  
  /**
   * Set input layout
   */
  setInputLayout(layout: D3D11InputLayout | null) {
    this.inputLayout = layout;
  }
  
  /**
   * Set constant buffers
   */
  setConstantBuffers(startSlot: number, buffers: D3D11Buffer[]) {
    for (let i = 0; i < buffers.length; i++) {
      this.constantBuffers[startSlot + i] = buffers[i];
    }
  }
  
  /**
   * Draw
   */
  draw(vertexCount: number, startVertexLocation: number) {
    if (!this.renderPassEncoder) return;
    
    // Create pipeline if needed
    this.ensurePipeline();
    
    if (this.currentPipeline) {
      this.renderPassEncoder.setPipeline(this.currentPipeline);
      this.renderPassEncoder.draw(vertexCount, 1, startVertexLocation, 0);
    }
  }
  
  /**
   * Draw indexed
   */
  drawIndexed(indexCount: number, startIndexLocation: number, baseVertexLocation: number) {
    if (!this.renderPassEncoder) return;
    
    this.ensurePipeline();
    
    if (this.currentPipeline) {
      this.renderPassEncoder.setPipeline(this.currentPipeline);
      this.renderPassEncoder.drawIndexed(indexCount, 1, startIndexLocation, baseVertexLocation, 0);
    }
  }
  
  /**
   * End render pass
   */
  endRenderPass() {
    if (this.renderPassEncoder) {
      this.renderPassEncoder.end();
      this.renderPassEncoder = null;
    }
  }
  
  /**
   * Submit commands
   */
  submitFrame() {
    if (this.commandEncoder) {
      this.device.queue.submit([this.commandEncoder.finish()]);
      this.commandEncoder = null;
    }
  }
  
  /**
   * Clear render target
   */
  clearRenderTargetView(renderTargetView: any, color: number[]) {
    // Handled by beginRenderPass clearValue
  }
  
  /**
   * Clear depth stencil
   */
  clearDepthStencilView(depthStencilView: any, flags: number, depth: number, stencil: number) {
    // Handled by render pass descriptor
  }
  
  /**
   * Update subresource (update buffer/texture data)
   */
  updateSubresource(resource: any, subresource: number, box: any, data: ArrayBuffer) {
    if (resource instanceof D3D11Buffer) {
      this.device.queue.writeBuffer(resource.buffer, 0, data);
    }
  }
  
  /**
   * Ensure pipeline is created
   */
  private ensurePipeline() {
    if (this.currentPipeline) return;
    
    // Would compile shaders and create pipeline
    // This is simplified - real implementation would cache pipelines
    console.log('[D3D11] Creating render pipeline...');
  }
}

// ===== D3D11 RESOURCE CLASSES =====

export class D3D11Buffer {
  buffer: GPUBuffer;
  desc: D3D11BufferDesc;
  
  constructor(buffer: GPUBuffer, desc: D3D11BufferDesc) {
    this.buffer = buffer;
    this.desc = desc;
  }
}

export class D3D11Texture2D {
  texture: GPUTexture;
  desc: D3D11Texture2DDesc;
  
  constructor(texture: GPUTexture, desc: D3D11Texture2DDesc) {
    this.texture = texture;
    this.desc = desc;
  }
  
  createView(): GPUTextureView {
    return this.texture.createView();
  }
}

export class D3D11VertexShader {
  bytecode: ArrayBuffer;
  
  constructor(bytecode: ArrayBuffer) {
    this.bytecode = bytecode;
  }
}

export class D3D11PixelShader {
  bytecode: ArrayBuffer;
  
  constructor(bytecode: ArrayBuffer) {
    this.bytecode = bytecode;
  }
}

export class D3D11InputLayout {
  elements: D3D11InputElementDesc[];
  
  constructor(elements: D3D11InputElementDesc[]) {
    this.elements = elements;
  }
}

export class D3D11RasterizerState {
  desc: D3D11RasterizerDesc;
  
  constructor(desc: D3D11RasterizerDesc) {
    this.desc = desc;
  }
}

export class D3D11BlendState {
  desc: D3D11BlendDesc;
  
  constructor(desc: D3D11BlendDesc) {
    this.desc = desc;
  }
}

export class D3D11DepthStencilState {
  desc: D3D11DepthStencilDesc;
  
  constructor(desc: D3D11DepthStencilDesc) {
    this.desc = desc;
  }
}

// ===== TYPE DEFINITIONS =====

export interface D3D11BufferDesc {
  byteWidth: number;
  usage: number;      // D3D11_USAGE
  bindFlags: number;  // D3D11_BIND_FLAG
  cpuAccessFlags: number;
  miscFlags: number;
}

export interface D3D11Texture2DDesc {
  width: number;
  height: number;
  mipLevels: number;
  arraySize: number;
  format: number;     // DXGI_FORMAT
  sampleDesc: { count: number; quality: number };
  usage: number;
  bindFlags: number;
  cpuAccessFlags: number;
  miscFlags: number;
}

export interface D3D11InputElementDesc {
  semanticName: string;
  semanticIndex: number;
  format: number;
  inputSlot: number;
  alignedByteOffset: number;
  inputSlotClass: number;
  instanceDataStepRate: number;
}

export interface D3D11RasterizerDesc {
  fillMode: number;
  cullMode: number;
  frontCounterClockwise: boolean;
  depthBias: number;
  depthBiasClamp: number;
  slopeScaledDepthBias: number;
  depthClipEnable: boolean;
  scissorEnable: boolean;
  multisampleEnable: boolean;
  antialiasedLineEnable: boolean;
}

export interface D3D11BlendDesc {
  alphaToCoverageEnable: boolean;
  independentBlendEnable: boolean;
  renderTarget: any[]; // D3D11_RENDER_TARGET_BLEND_DESC[]
}

export interface D3D11DepthStencilDesc {
  depthEnable: boolean;
  depthWriteMask: number;
  depthFunc: number;
  stencilEnable: boolean;
  stencilReadMask: number;
  stencilWriteMask: number;
  frontFace: any;
  backFace: any;
}
