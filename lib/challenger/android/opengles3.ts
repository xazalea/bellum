import { glslToWGSLTranslator } from '../../rendering/glsl-to-wgsl';

/**
 * OpenGL ES 3.0+ Emulation via WebGL2/WebGPU
 * Maps OpenGL ES API calls to WebGL2 and WebGPU
 */

export enum GLEnum {
  // Data types
  GL_BYTE = 0x1400,
  GL_UNSIGNED_BYTE = 0x1401,
  GL_SHORT = 0x1402,
  GL_UNSIGNED_SHORT = 0x1403,
  GL_INT = 0x1404,
  GL_UNSIGNED_INT = 0x1405,
  GL_FLOAT = 0x1406,
  
  // Primitives
  GL_POINTS = 0x0000,
  GL_LINES = 0x0001,
  GL_LINE_LOOP = 0x0002,
  GL_LINE_STRIP = 0x0003,
  GL_TRIANGLES = 0x0004,
  GL_TRIANGLE_STRIP = 0x0005,
  GL_TRIANGLE_FAN = 0x0006,
  
  // Blending
  GL_ZERO = 0,
  GL_ONE = 1,
  GL_SRC_COLOR = 0x0300,
  GL_ONE_MINUS_SRC_COLOR = 0x0301,
  GL_SRC_ALPHA = 0x0302,
  GL_ONE_MINUS_SRC_ALPHA = 0x0303,
  GL_DST_ALPHA = 0x0304,
  GL_ONE_MINUS_DST_ALPHA = 0x0305,
  GL_DST_COLOR = 0x0306,
  GL_ONE_MINUS_DST_COLOR = 0x0307,
  
  // Buffer objects
  GL_ARRAY_BUFFER = 0x8892,
  GL_ELEMENT_ARRAY_BUFFER = 0x8893,
  GL_UNIFORM_BUFFER = 0x8A11,
  
  // Buffer usage
  GL_STATIC_DRAW = 0x88E4,
  GL_DYNAMIC_DRAW = 0x88E8,
  GL_STREAM_DRAW = 0x88E0,
  
  // Textures
  GL_TEXTURE_2D = 0x0DE1,
  GL_TEXTURE_CUBE_MAP = 0x8513,
  GL_TEXTURE_3D = 0x806F,
  GL_TEXTURE_2D_ARRAY = 0x8C1A,
  
  // Texture parameters
  GL_TEXTURE_MAG_FILTER = 0x2800,
  GL_TEXTURE_MIN_FILTER = 0x2801,
  GL_TEXTURE_WRAP_S = 0x2802,
  GL_TEXTURE_WRAP_T = 0x2803,
  
  // Texture filters
  GL_NEAREST = 0x2600,
  GL_LINEAR = 0x2601,
  GL_NEAREST_MIPMAP_NEAREST = 0x2700,
  GL_LINEAR_MIPMAP_NEAREST = 0x2701,
  GL_NEAREST_MIPMAP_LINEAR = 0x2702,
  GL_LINEAR_MIPMAP_LINEAR = 0x2703,
  
  // Texture wrap modes
  GL_REPEAT = 0x2901,
  GL_CLAMP_TO_EDGE = 0x812F,
  GL_MIRRORED_REPEAT = 0x8370,
  
  // Pixel formats
  GL_RGBA = 0x1908,
  GL_RGB = 0x1907,
  GL_LUMINANCE = 0x1909,
  GL_LUMINANCE_ALPHA = 0x190A,
  GL_ALPHA = 0x1906,
  
  // Shaders
  GL_VERTEX_SHADER = 0x8B31,
  GL_FRAGMENT_SHADER = 0x8B30,
  
  // Shader status
  GL_COMPILE_STATUS = 0x8B81,
  GL_LINK_STATUS = 0x8B82,
  
  // Framebuffers
  GL_FRAMEBUFFER = 0x8D40,
  GL_RENDERBUFFER = 0x8D41,
  GL_COLOR_ATTACHMENT0 = 0x8CE0,
  GL_DEPTH_ATTACHMENT = 0x8D00,
  GL_STENCIL_ATTACHMENT = 0x8D20,
  
  // Capabilities
  GL_BLEND = 0x0BE2,
  GL_DEPTH_TEST = 0x0B71,
  GL_CULL_FACE = 0x0B44,
  GL_SCISSOR_TEST = 0x0C11,
  GL_STENCIL_TEST = 0x0B90,
  
  // Clear bits
  GL_COLOR_BUFFER_BIT = 0x00004000,
  GL_DEPTH_BUFFER_BIT = 0x00000100,
  GL_STENCIL_BUFFER_BIT = 0x00000400,
}

export type GLBuffer = WebGLBuffer | GPUBuffer;
export type GLTexture = WebGLTexture | GPUTexture;
export type GLShader = WebGLShader;
export type GLProgram = WebGLProgram;
export type GLFramebuffer = WebGLFramebuffer;
export type GLRenderbuffer = WebGLRenderbuffer;

/**
 * OpenGL ES 3.0+ Context
 */
export class OpenGLES3Context {
  private gl: WebGL2RenderingContext | null = null;
  private gpuDevice: GPUDevice | null = null;
  private useWebGPU: boolean = false;
  
  // Resource tracking
  private buffers: Map<number, GLBuffer> = new Map();
  private textures: Map<number, GLTexture> = new Map();
  private shaders: Map<number, GLShader> = new Map();
  private shaderTypes: Map<number, number> = new Map();
  private programs: Map<number, GLProgram> = new Map();
  private framebuffers: Map<number, GLFramebuffer> = new Map();
  private renderbuffers: Map<number, GLRenderbuffer> = new Map();
  
  private nextId = 1;
  private currentProgram: GLProgram | null = null;
  
  constructor(canvas: HTMLCanvasElement, preferWebGPU: boolean = false) {
    console.log('[OpenGLES3] Initializing...');
    
    if (preferWebGPU && 'gpu' in navigator) {
      this.initWebGPU(canvas);
    } else {
      this.initWebGL2(canvas);
    }
  }
  
  /**
   * Initialize WebGL2 context
   */
  private initWebGL2(canvas: HTMLCanvasElement): void {
    this.gl = canvas.getContext('webgl2', {
      alpha: true,
      depth: true,
      stencil: true,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });
    
    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }
    
    this.useWebGPU = false;
    console.log('[OpenGLES3] Using WebGL2');
  }
  
  /**
   * Initialize WebGPU context (future)
   */
  private async initWebGPU(canvas: HTMLCanvasElement): Promise<void> {
    if (!('gpu' in navigator)) {
      console.warn('[OpenGLES3] WebGPU not supported, falling back to WebGL2');
      this.initWebGL2(canvas);
      return;
    }
    
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) throw new Error('No GPU adapter');
      
      this.gpuDevice = await adapter.requestDevice();
      this.useWebGPU = true;
      console.log('[OpenGLES3] Using WebGPU');
    } catch (e) {
      console.warn('[OpenGLES3] WebGPU init failed, falling back to WebGL2:', e);
      this.initWebGL2(canvas);
    }
  }
  
  // ===== Buffer Operations =====
  
  glGenBuffers(n: number): number[] {
    const ids: number[] = [];
    for (let i = 0; i < n; i++) {
      const id = this.nextId++;
      const buffer = this.gl!.createBuffer();
      if (buffer) {
        this.buffers.set(id, buffer);
        ids.push(id);
      }
    }
    return ids;
  }
  
  glBindBuffer(target: number, buffer: number): void {
    const buf = this.buffers.get(buffer);
    if (buf && buf instanceof WebGLBuffer) {
      this.gl!.bindBuffer(target, buf);
    }
  }
  
  glBufferData(target: number, data: ArrayBufferView, usage: number): void {
    this.gl!.bufferData(target, data, usage);
  }
  
  glBufferSubData(target: number, offset: number, data: ArrayBufferView): void {
    this.gl!.bufferSubData(target, offset, data);
  }
  
  glDeleteBuffers(buffers: number[]): void {
    for (const id of buffers) {
      const buffer = this.buffers.get(id);
      if (buffer && buffer instanceof WebGLBuffer) {
        this.gl!.deleteBuffer(buffer);
      }
      this.buffers.delete(id);
    }
  }
  
  // ===== Texture Operations =====
  
  glGenTextures(n: number): number[] {
    const ids: number[] = [];
    for (let i = 0; i < n; i++) {
      const id = this.nextId++;
      const texture = this.gl!.createTexture();
      if (texture) {
        this.textures.set(id, texture);
        ids.push(id);
      }
    }
    return ids;
  }
  
  glBindTexture(target: number, texture: number): void {
    const tex = this.textures.get(texture);
    if (tex && tex instanceof WebGLTexture) {
      this.gl!.bindTexture(target, tex);
    }
  }
  
  glTexImage2D(
    target: number,
    level: number,
    internalFormat: number,
    width: number,
    height: number,
    border: number,
    format: number,
    type: number,
    pixels: ArrayBufferView | null
  ): void {
    this.gl!.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
  }
  
  glTexParameteri(target: number, pname: number, param: number): void {
    this.gl!.texParameteri(target, pname, param);
  }
  
  glGenerateMipmap(target: number): void {
    this.gl!.generateMipmap(target);
  }
  
  glActiveTexture(texture: number): void {
    this.gl!.activeTexture(texture);
  }
  
  glDeleteTextures(textures: number[]): void {
    for (const id of textures) {
      const texture = this.textures.get(id);
      if (texture && texture instanceof WebGLTexture) {
        this.gl!.deleteTexture(texture);
      }
      this.textures.delete(id);
    }
  }
  
  // ===== Shader Operations =====
  
  glCreateShader(type: number): number {
    const shader = this.gl!.createShader(type);
    if (!shader) return 0;
    
    const id = this.nextId++;
    this.shaders.set(id, shader);
    this.shaderTypes.set(id, type);
    return id;
  }
  
  glShaderSource(shader: number, source: string): void {
    const shdr = this.shaders.get(shader);
    if (shdr) {
      this.gl!.shaderSource(shdr, source);
    }

    const type = this.shaderTypes.get(shader);
    if (type === this.gl!.VERTEX_SHADER || type === this.gl!.FRAGMENT_SHADER) {
      const stage = type === this.gl!.VERTEX_SHADER ? 'vertex' : 'fragment';
      // Warm Mesa-optimized WGSL cache for potential WebGPU path
      glslToWGSLTranslator.translate(source, stage);
    }
  }
  
  glCompileShader(shader: number): void {
    const shdr = this.shaders.get(shader);
    if (shdr) {
      this.gl!.compileShader(shdr);
    }
  }
  
  glGetShaderiv(shader: number, pname: number): number {
    const shdr = this.shaders.get(shader);
    if (!shdr) return 0;
    
    if (pname === GLEnum.GL_COMPILE_STATUS) {
      return this.gl!.getShaderParameter(shdr, pname) ? 1 : 0;
    }
    
    return 0;
  }
  
  glGetShaderInfoLog(shader: number): string {
    const shdr = this.shaders.get(shader);
    if (!shdr) return '';
    
    return this.gl!.getShaderInfoLog(shdr) || '';
  }
  
  glDeleteShader(shader: number): void {
    const shdr = this.shaders.get(shader);
    if (shdr) {
      this.gl!.deleteShader(shdr);
      this.shaders.delete(shader);
    }
  }
  
  // ===== Program Operations =====
  
  glCreateProgram(): number {
    const program = this.gl!.createProgram();
    if (!program) return 0;
    
    const id = this.nextId++;
    this.programs.set(id, program);
    return id;
  }
  
  glAttachShader(program: number, shader: number): void {
    const prog = this.programs.get(program);
    const shdr = this.shaders.get(shader);
    if (prog && shdr) {
      this.gl!.attachShader(prog, shdr);
    }
  }
  
  glLinkProgram(program: number): void {
    const prog = this.programs.get(program);
    if (prog) {
      this.gl!.linkProgram(prog);
    }
  }
  
  glGetProgramiv(program: number, pname: number): number {
    const prog = this.programs.get(program);
    if (!prog) return 0;
    
    if (pname === GLEnum.GL_LINK_STATUS) {
      return this.gl!.getProgramParameter(prog, pname) ? 1 : 0;
    }
    
    return 0;
  }
  
  glGetProgramInfoLog(program: number): string {
    const prog = this.programs.get(program);
    if (!prog) return '';
    
    return this.gl!.getProgramInfoLog(prog) || '';
  }
  
  glUseProgram(program: number): void {
    const prog = this.programs.get(program);
    if (prog) {
      this.gl!.useProgram(prog);
      this.currentProgram = prog;
    }
  }
  
  glDeleteProgram(program: number): void {
    const prog = this.programs.get(program);
    if (prog) {
      this.gl!.deleteProgram(prog);
      this.programs.delete(program);
    }
  }
  
  // ===== Vertex Attributes =====
  
  glGetAttribLocation(program: number, name: string): number {
    const prog = this.programs.get(program);
    if (!prog) return -1;
    
    return this.gl!.getAttribLocation(prog, name);
  }
  
  glVertexAttribPointer(
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number
  ): void {
    this.gl!.vertexAttribPointer(index, size, type, normalized, stride, offset);
  }
  
  glEnableVertexAttribArray(index: number): void {
    this.gl!.enableVertexAttribArray(index);
  }
  
  glDisableVertexAttribArray(index: number): void {
    this.gl!.disableVertexAttribArray(index);
  }
  
  // ===== Uniforms =====
  
  glGetUniformLocation(program: number, name: string): WebGLUniformLocation | null {
    const prog = this.programs.get(program);
    if (!prog) return null;
    
    return this.gl!.getUniformLocation(prog, name);
  }
  
  glUniform1i(location: WebGLUniformLocation | null, v0: number): void {
    if (location) this.gl!.uniform1i(location, v0);
  }
  
  glUniform1f(location: WebGLUniformLocation | null, v0: number): void {
    if (location) this.gl!.uniform1f(location, v0);
  }
  
  glUniform2f(location: WebGLUniformLocation | null, v0: number, v1: number): void {
    if (location) this.gl!.uniform2f(location, v0, v1);
  }
  
  glUniform3f(location: WebGLUniformLocation | null, v0: number, v1: number, v2: number): void {
    if (location) this.gl!.uniform3f(location, v0, v1, v2);
  }
  
  glUniform4f(location: WebGLUniformLocation | null, v0: number, v1: number, v2: number, v3: number): void {
    if (location) this.gl!.uniform4f(location, v0, v1, v2, v3);
  }
  
  glUniformMatrix4fv(location: WebGLUniformLocation | null, transpose: boolean, value: Float32Array): void {
    if (location) this.gl!.uniformMatrix4fv(location, transpose, value);
  }
  
  // ===== Drawing =====
  
  glClear(mask: number): void {
    this.gl!.clear(mask);
  }
  
  glClearColor(r: number, g: number, b: number, a: number): void {
    this.gl!.clearColor(r, g, b, a);
  }
  
  glViewport(x: number, y: number, width: number, height: number): void {
    this.gl!.viewport(x, y, width, height);
  }
  
  glDrawArrays(mode: number, first: number, count: number): void {
    this.gl!.drawArrays(mode, first, count);
  }
  
  glDrawElements(mode: number, count: number, type: number, offset: number): void {
    this.gl!.drawElements(mode, count, type, offset);
  }
  
  // ===== State Management =====
  
  glEnable(cap: number): void {
    this.gl!.enable(cap);
  }
  
  glDisable(cap: number): void {
    this.gl!.disable(cap);
  }
  
  glBlendFunc(sfactor: number, dfactor: number): void {
    this.gl!.blendFunc(sfactor, dfactor);
  }
  
  glDepthFunc(func: number): void {
    this.gl!.depthFunc(func);
  }
  
  glCullFace(mode: number): void {
    this.gl!.cullFace(mode);
  }
  
  // ===== Framebuffer Operations =====
  
  glGenFramebuffers(n: number): number[] {
    const ids: number[] = [];
    for (let i = 0; i < n; i++) {
      const id = this.nextId++;
      const framebuffer = this.gl!.createFramebuffer();
      if (framebuffer) {
        this.framebuffers.set(id, framebuffer);
        ids.push(id);
      }
    }
    return ids;
  }
  
  glBindFramebuffer(target: number, framebuffer: number): void {
    const fb = this.framebuffers.get(framebuffer);
    if (fb) {
      this.gl!.bindFramebuffer(target, fb);
    } else {
      this.gl!.bindFramebuffer(target, null);
    }
  }
  
  glFramebufferTexture2D(
    target: number,
    attachment: number,
    textarget: number,
    texture: number,
    level: number
  ): void {
    const tex = this.textures.get(texture);
    if (tex && tex instanceof WebGLTexture) {
      this.gl!.framebufferTexture2D(target, attachment, textarget, tex, level);
    }
  }
  
  glDeleteFramebuffers(framebuffers: number[]): void {
    for (const id of framebuffers) {
      const fb = this.framebuffers.get(id);
      if (fb) {
        this.gl!.deleteFramebuffer(fb);
      }
      this.framebuffers.delete(id);
    }
  }
  
  /**
   * Get underlying WebGL2 context
   */
  getWebGL2Context(): WebGL2RenderingContext | null {
    return this.gl;
  }
  
  /**
   * Get underlying WebGPU device
   */
  getWebGPUDevice(): GPUDevice | null {
    return this.gpuDevice;
  }
}
