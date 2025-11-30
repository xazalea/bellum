/**
 * WebGL Renderer - High-performance rendering for emulator output
 * Uses WebGL for hardware-accelerated rendering
 */

export class WebGLRenderer {
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.init();
  }

  private init(): void {
    if (!this.canvas) return;

    // Try WebGL2 first, fallback to WebGL1
    this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
    
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }

    this.setupShaders();
    this.setupBuffers();
    this.isInitialized = true;
  }

  private setupShaders(): void {
    if (!this.gl) return;

    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_texture;
      varying vec2 v_texCoord;
      
      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord);
      }
    `;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    this.program = this.gl.createProgram();
    if (!this.program) return;

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Program linking failed:', this.gl.getProgramInfoLog(this.program));
      return;
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation failed:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private setupBuffers(): void {
    if (!this.gl || !this.program) return;

    // Full-screen quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]);

    // Position buffer
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Texture coordinate buffer
    const texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);

    const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Create texture
    this.texture = this.gl.createTexture();
  }

  /**
   * Render a frame from image data
   */
  render(imageData: ImageData | HTMLImageElement | HTMLCanvasElement): void {
    if (!this.gl || !this.program || !this.texture || !this.isInitialized) return;

    this.gl.useProgram(this.program);

    // Update texture
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    
    if (imageData instanceof ImageData) {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        imageData
      );
    } else {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        imageData
      );
    }

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    // Clear and draw
    this.gl.viewport(0, 0, this.canvas!.width, this.canvas!.height);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.gl) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.gl && this.texture) {
      this.gl.deleteTexture(this.texture);
    }
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
    this.isInitialized = false;
  }
}

