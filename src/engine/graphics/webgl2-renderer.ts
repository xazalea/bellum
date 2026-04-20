export interface RenderSurface {
  width: number;
  height: number;
  pixels: Uint8Array;
  dirty: boolean;
  stride: number;
}

/** Dirty rectangle tracking for efficient partial uploads */
interface DirtyRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const EMPTY_DIRTY: DirtyRect = { minX: 0x7FFFFFFF, minY: 0x7FFFFFFF, maxX: 0, maxY: 0 };
const FULL_DIRTY: DirtyRect = { minX: 0, minY: 0, maxX: 0x7FFFFFFF, maxY: 0x7FFFFFFF };

export class WebGL2Renderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private surface: RenderSurface;
  private canvas: HTMLCanvasElement;
  private frameBuffer: Uint8Array;
  private quadVerts: WebGLBuffer | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private _fps = 0;
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private dirtyRect: DirtyRect = { ...FULL_DIRTY };

  constructor(canvas: HTMLCanvasElement, width = 800, height = 600) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 not available');
    this.gl = gl;

    this.surface = {
      width,
      height,
      pixels: new Uint8Array(width * height * 4),
      dirty: true,
      stride: width * 4,
    };
    this.frameBuffer = new Uint8Array(width * height * 4);

    this.initShaders();
    this.initGeometry();
    this.initTexture();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(canvas);
  }

  get fps(): number { return this._fps; }
  getSurface(): RenderSurface { return this.surface; }

  private initShaders(): void {
    const gl = this.gl;

    const vsSource = `#version 300 es
      in vec2 aPos;
      in vec2 aTex;
      out vec2 vTex;
      void main() {
        gl_Position = vec4(aPos, 0.0, 1.0);
        vTex = aTex;
      }
    `;

    const fsSource = `#version 300 es
      precision highp float;
      in vec2 vTex;
      out vec4 fragColor;
      uniform sampler2D uTex;
      void main() {
        fragColor = texture(uTex, vTex);
      }
    `;

    this.program = this.createProgram(vsSource, fsSource);
    if (!this.program) throw new Error('Failed to compile renderer shaders');
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('VS:', gl.getShaderInfoLog(vs));
      return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('FS:', gl.getShaderInfoLog(fs));
      return null;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Link:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  private initGeometry(): void {
    const gl = this.gl;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const verts = new Float32Array([
      -1, -1,  0, 1,
       1, -1,  1, 1,
      -1,  1,  0, 0,
       1,  1,  1, 0,
    ]);

    this.quadVerts = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVerts);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const posLoc = 0;
    const texLoc = 1;
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);
  }

  private initTexture(): void {
    const gl = this.gl;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.surface.width, this.surface.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (w === 0 || h === 0) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  syncCanvasSize(): void {
    this.handleResize();
  }

  resizeSurface(w: number, h: number): void {
    if (w === this.surface.width && h === this.surface.height) return;
    this.surface.width = w;
    this.surface.height = h;
    this.surface.stride = w * 4;
    this.surface.pixels = new Uint8Array(w * h * 4);
    this.frameBuffer = new Uint8Array(w * h * 4);
    // Full surface dirty on resize
    this.dirtyRect = { ...FULL_DIRTY };
    this.surface.dirty = true;

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  /** Mark a region as dirty for partial upload */
  private markDirty(x: number, y: number, w = 1, h = 1): void {
    if (x < this.dirtyRect.minX) this.dirtyRect.minX = x;
    if (y < this.dirtyRect.minY) this.dirtyRect.minY = y;
    const rx = x + w;
    const ry = y + h;
    if (rx > this.dirtyRect.maxX) this.dirtyRect.maxX = rx;
    if (ry > this.dirtyRect.maxY) this.dirtyRect.maxY = ry;
    this.surface.dirty = true;
  }

  flush(): void {
    if (!this.surface.dirty) return;

    const gl = this.gl;
    const minX = Math.max(0, this.dirtyRect.minX);
    const minY = Math.max(0, this.dirtyRect.minY);
    const maxX = Math.min(this.surface.width, this.dirtyRect.maxX);
    const maxY = Math.min(this.surface.height, this.dirtyRect.maxY);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    const fullUpload = (minX === 0 && minY === 0
      && maxX >= this.surface.width && maxY >= this.surface.height);

    if (fullUpload) {
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
      gl.texSubImage2D(
        gl.TEXTURE_2D, 0, 0, 0,
        this.surface.width, this.surface.height,
        gl.RGBA, gl.UNSIGNED_BYTE,
        this.surface.pixels
      );
    } else if (minX < maxX && minY < maxY) {
      const rw = maxX - minX;
      const rh = maxY - minY;
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, this.surface.width);
      const byteOffset = (minY * this.surface.width + minX) * 4;
      gl.texSubImage2D(
        gl.TEXTURE_2D, 0, minX, minY, rw, rh,
        gl.RGBA, gl.UNSIGNED_BYTE,
        this.surface.pixels, byteOffset
      );
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
    }

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(this.program!, 'uTex'), 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);

    this.surface.dirty = false;
    this.dirtyRect = { ...EMPTY_DIRTY };
  }

  present(): void {
    this.flush();
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this._fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  setPixel(x: number, y: number, r: number, g: number, b: number, a = 255): void {
    const idx = (y * this.surface.stride + x * 4) | 0;
    if (idx < 0 || idx + 3 >= this.surface.pixels.length) return;
    this.surface.pixels[idx] = r;
    this.surface.pixels[idx + 1] = g;
    this.surface.pixels[idx + 2] = b;
    this.surface.pixels[idx + 3] = a;
    this.markDirty(x, y);
  }

  private fillRowCache: Uint8Array | null = null;
  private fillRowCacheKey = 0;

  fillRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a = 255): void {
    const sx = Math.max(0, x) | 0;
    const sy = Math.max(0, y) | 0;
    const ex = Math.min(this.surface.width, x + w) | 0;
    const ey = Math.min(this.surface.height, y + h) | 0;
    const rowLen = (ex - sx) * 4;
    if (rowLen <= 0 || ey <= sy) { this.surface.dirty = true; return; }

    // Build a cached row pattern for this (r,g,b,a) combination
    const cacheKey = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
    if (this.fillRowCacheKey !== cacheKey || !this.fillRowCache || this.fillRowCache.length < rowLen) {
      const row = new Uint8Array(rowLen);
      for (let i = 0; i < rowLen; i += 4) {
        row[i] = r; row[i + 1] = g; row[i + 2] = b; row[i + 3] = a;
      }
      this.fillRowCache = row;
      this.fillRowCacheKey = cacheKey;
    }

    const pixels = this.surface.pixels;
    const stride = this.surface.stride;
    const rowPattern = this.fillRowCache;

    for (let row = sy; row < ey; row++) {
      const dstOff = row * stride + sx * 4;
      pixels.set(rowPattern.subarray(0, rowLen), dstOff);
    }
    this.markDirty(sx, sy, ex - sx, ey - sy);
  }

  drawLine(x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number, a = 255): void {
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      this.setPixel(x0, y0, r, g, b, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  blit(src: Uint8Array, srcW: number, srcH: number, dstX: number, dstY: number, srcX = 0, srcY = 0, w?: number, h?: number): void {
    const bw = w ?? srcW;
    const bh = h ?? srcH;
    for (let row = 0; row < bh; row++) {
      const srcOff = ((srcY + row) * srcW + srcX) * 4;
      const dstOff = ((dstY + row) * this.surface.width + dstX) * 4;
      const copyLen = Math.min(bw * 4, (this.surface.width - dstX) * 4);
      if (dstOff < 0 || dstOff + copyLen > this.surface.pixels.length) continue;
      if (srcOff < 0 || srcOff + copyLen > src.length) continue;
      this.surface.pixels.set(src.subarray(srcOff, srcOff + copyLen), dstOff);
    }
    this.markDirty(dstX, dstY, bw, bh);
  }

  drawText(text: string, x: number, y: number, r: number, g: number, b: number, font: Uint8Array[] | null = null): void {
    if (!font) {
      for (let i = 0; i < text.length; i++) {
        const cx = x + i * 8;
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            if ((row + col) % 3 === 0) {
              this.setPixel(cx + col, y + row, r, g, b);
            }
          }
        }
      }
      return;
    }
    for (let i = 0; i < text.length; i++) {
      const glyph = font[text.charCodeAt(i)];
      if (!glyph) continue;
      const cx = x + i * 8;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (glyph[row] & (1 << (7 - col))) {
            this.setPixel(cx + col, y + row, r, g, b);
          }
        }
      }
    }
  }

  clear(r = 0, g = 0, b = 0, a = 255): void {
    const pixels = this.surface.pixels;
    const len = pixels.length;
    // Build 4-byte pattern and fill using 32-bit writes for speed
    const pattern32 = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
    const view32 = new Uint32Array(pixels.buffer, 0, len / 4);
    view32.fill(pattern32);
    // Full surface dirty — skip per-pixel tracking
    this.dirtyRect = { ...FULL_DIRTY };
    this.surface.dirty = true;
  }

  captureFrame(): Uint8Array {
    return new Uint8Array(this.surface.pixels);
  }

  destroy(): void {
    const gl = this.gl;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.program) gl.deleteProgram(this.program);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.quadVerts) gl.deleteBuffer(this.quadVerts);
    this.resizeObserver?.disconnect();
  }
}
