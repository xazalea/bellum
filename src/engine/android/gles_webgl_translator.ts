import { WebGL2Renderer } from '../graphics/webgl2-renderer';

const GL_TRIANGLES = 0x0004;
const GL_TRIANGLE_STRIP = 0x0005;
const GL_LINES = 0x0001;
const GL_LINE_STRIP = 0x0003;
const GL_POINTS = 0x0000;
const GL_RGBA = 0x1908;
const GL_FLOAT = 0x1406;
const GL_UNSIGNED_BYTE = 0x1401;
const GL_UNSIGNED_SHORT = 0x1403;
const GL_ARRAY_BUFFER = 0x8892;
const GL_ELEMENT_ARRAY_BUFFER = 0x8893;
const GL_TEXTURE_2D = 0x0DE1;
const GL_COLOR_BUFFER_BIT = 0x00004000;
const GL_DEPTH_BUFFER_BIT = 0x00000100;

export interface GLESBuffer {
  data: Float32Array | Uint16Array | Uint8Array;
  type: 'array' | 'element';
  stride: number;
}

export interface GLESTexture {
  width: number;
  height: number;
  pixels: Uint8Array;
  format: number;
}

export interface GLESShader {
  vsSource: string;
  fsSource: string;
  program: WebGLProgram | null;
  uniforms: Map<string, WebGLUniformLocation | null>;
}

export class GLESWebGLTranslator {
  private renderer: WebGL2Renderer;
  private buffers: Map<number, GLESBuffer> = new Map();
  private textures: Map<number, GLESTexture> = new Map();
  private shaders: Map<number, GLESShader> = new Map();
  private nextId = 1;
  private clearColor = [0, 0, 0, 1];
  private currentProgram = -1;
  private boundArrayBuffer = -1;
  private boundElementBuffer = -1;
  private attribs: Map<number, { size: number; type: number; normalized: boolean; stride: number; offset: number; bufferId: number }> = new Map();
  private drawColor = [1, 1, 1, 1];

  constructor(renderer: WebGL2Renderer) {
    this.renderer = renderer;
  }

  genBuffer(): number {
    const id = this.nextId++;
    this.buffers.set(id, { data: new Float32Array(0), type: 'array', stride: 0 });
    return id;
  }

  genTexture(): number {
    const id = this.nextId++;
    this.textures.set(id, { width: 1, height: 1, pixels: new Uint8Array([255, 255, 255, 255]), format: GL_RGBA });
    return id;
  }

  bindBuffer(target: number, id: number): void {
    if (target === GL_ARRAY_BUFFER) this.boundArrayBuffer = id;
    else if (target === GL_ELEMENT_ARRAY_BUFFER) this.boundElementBuffer = id;
  }

  bufferData(target: number, data: ArrayBufferView): void {
    const id = target === GL_ARRAY_BUFFER ? this.boundArrayBuffer : this.boundElementBuffer;
    const buf = this.buffers.get(id);
    if (!buf) return;
    if (data instanceof Float32Array) { buf.data = new Float32Array(data); buf.type = 'array'; buf.stride = 4; }
    else if (data instanceof Uint16Array) { buf.data = new Uint16Array(data); buf.type = 'element'; buf.stride = 2; }
    else if (data instanceof Uint8Array) { buf.data = new Uint8Array(data); buf.type = 'element'; buf.stride = 1; }
  }

  texImage2D(target: number, level: number, internalFormat: number, width: number, height: number, border: number, format: number, type: number, pixels: ArrayBufferView | null): void {
    const tex = this.textures.get(this.nextId - 1);
    if (!tex) return;
    tex.width = width;
    tex.height = height;
    tex.format = format;
    if (pixels) {
      if (pixels instanceof Uint8Array) tex.pixels = new Uint8Array(pixels);
      else {
        const view = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
        tex.pixels = new Uint8Array(view);
      }
    }
  }

  clearColorBuffer(r: number, g: number, b: number, a: number): void {
    this.clearColor = [r, g, b, a];
    this.renderer.clear((r * 255) | 0, (g * 255) | 0, (b * 255) | 0, (a * 255) | 0);
  }

  clear(mask: number): void {
    if (mask & GL_COLOR_BUFFER_BIT) {
      this.renderer.clear(
        (this.clearColor[0] * 255) | 0,
        (this.clearColor[1] * 255) | 0,
        (this.clearColor[2] * 255) | 0,
        (this.clearColor[3] * 255) | 0
      );
    }
  }

  vertexAttribPointer(index: number, size: number, type: number, normalized: boolean, stride: number, offset: number): void {
    this.attribs.set(index, { size, type, normalized, stride, offset, bufferId: this.boundArrayBuffer });
  }

  enableVertexAttribArray(index: number): void {
    this.attribs.set(index, this.attribs.get(index) || { size: 4, type: GL_FLOAT, normalized: false, stride: 0, offset: 0, bufferId: this.boundArrayBuffer });
  }

  drawArrays(mode: number, first: number, count: number): void {
    const posAttr = this.attribs.get(0);
    if (!posAttr) return;
    const buf = this.buffers.get(posAttr.bufferId);
    if (!buf || !(buf.data instanceof Float32Array)) return;

    const data = buf.data as Float32Array;
    const stride = posAttr.stride || (posAttr.size * 4);
    const offset = posAttr.offset || 0;

    if (mode === GL_TRIANGLES && posAttr.size >= 2) {
      for (let i = first; i < first + count; i += 3) {
        for (let v = 0; v < 3 && (i + v) < first + count; v++) {
          const base = ((i + v - first) * stride / 4 + offset / 4) | 0;
          if (base + 1 < data.length) {
            const x = data[base];
            const y = data[base + 1];
            this.renderer.setPixel(
              ((x + 1) * 0.5 * this.renderer.getSurface().width) | 0,
              ((1 - y) * 0.5 * this.renderer.getSurface().height) | 0,
              (this.drawColor[0] * 255) | 0,
              (this.drawColor[1] * 255) | 0,
              (this.drawColor[2] * 255) | 0
            );
          }
        }
      }
    } else if (mode === GL_LINES && posAttr.size >= 2) {
      for (let i = first; i < first + count - 1; i += 2) {
        const b0 = ((i) * stride / 4 + offset / 4) | 0;
        const b1 = ((i + 1) * stride / 4 + offset / 4) | 0;
        if (b0 + 1 < data.length && b1 + 1 < data.length) {
          const surf = this.renderer.getSurface();
          this.renderer.drawLine(
            ((data[b0] + 1) * 0.5 * surf.width) | 0,
            ((1 - data[b0 + 1]) * 0.5 * surf.height) | 0,
            ((data[b1] + 1) * 0.5 * surf.width) | 0,
            ((1 - data[b1 + 1]) * 0.5 * surf.height) | 0,
            (this.drawColor[0] * 255) | 0,
            (this.drawColor[1] * 255) | 0,
            (this.drawColor[2] * 255) | 0
          );
        }
      }
    }
    this.renderer.getSurface().dirty = true;
  }

  drawElements(mode: number, count: number, type: number, offset: number): void {
    const posAttr = this.attribs.get(0);
    if (!posAttr) return;
    const posBuf = this.buffers.get(posAttr.bufferId);
    const idxBuf = this.buffers.get(this.boundElementBuffer);
    if (!posBuf || !idxBuf || !(posBuf.data instanceof Float32Array)) return;

    const positions = posBuf.data as Float32Array;
    const indices = idxBuf.data;
    const stride = posAttr.stride || (posAttr.size * 4);
    const surf = this.renderer.getSurface();

    const getIdx = (i: number): number => {
      if (indices instanceof Uint16Array) return indices[i];
      if (indices instanceof Uint8Array) return indices[i];
      return i;
    };

    if (mode === GL_TRIANGLES && posAttr.size >= 2) {
      const idxStart = offset / (type === GL_UNSIGNED_SHORT ? 2 : 1);
      for (let i = 0; i < count; i += 3) {
        for (let v = 0; v < 3 && (i + v) < count; v++) {
          const idx = getIdx(idxStart + i + v);
          const base = (idx * stride / 4 + posAttr.offset / 4) | 0;
          if (base + 1 < positions.length) {
            this.renderer.setPixel(
              ((positions[base] + 1) * 0.5 * surf.width) | 0,
              ((1 - positions[base + 1]) * 0.5 * surf.height) | 0,
              (this.drawColor[0] * 255) | 0,
              (this.drawColor[1] * 255) | 0,
              (this.drawColor[2] * 255) | 0
            );
          }
        }
      }
    }
    surf.dirty = true;
  }

  blitTexture(texId: number, dstX: number, dstY: number): void {
    const tex = this.textures.get(texId);
    if (!tex) return;
    this.renderer.blit(tex.pixels, tex.width, tex.height, dstX, dstY);
  }

  setColor(r: number, g: number, b: number, a = 1): void {
    this.drawColor = [r, g, b, a];
  }

  flush(): void {
    this.renderer.present();
  }

  getSurface() { return this.renderer.getSurface(); }
}
