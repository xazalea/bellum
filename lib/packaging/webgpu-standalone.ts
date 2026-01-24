export function buildWebgpuStandaloneRuntime(): string {
  return `
      class WebGPURuntime {
        constructor(canvas) {
          this.canvas = canvas;
          this.device = null;
          this.context = null;
          this.pipeline = null;
          this.time = 0;
          this.running = false;
          this.lastFrame = 0;
          this.targetFrameTime = 1000 / 120;
        }

        async init() {
          if (!('gpu' in navigator)) {
            return false;
          }
          const adapter = await navigator.gpu.requestAdapter();
          if (!adapter) return false;
          this.device = await adapter.requestDevice();
          this.context = this.canvas.getContext('webgpu');
          if (!this.context) return false;
          const format = navigator.gpu.getPreferredCanvasFormat();
          this.context.configure({ device: this.device, format, alphaMode: 'opaque' });

          const shader = this.device.createShaderModule({
            code: \`
              struct VSOut { @builtin(position) position: vec4f; @location(0) uv: vec2f; };
              @vertex fn vsMain(@location(0) pos: vec2f, @location(1) uv: vec2f) -> VSOut {
                var out: VSOut;
                out.position = vec4f(pos, 0.0, 1.0);
                out.uv = uv;
                return out;
              }
              @fragment fn fsMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                let glow = 0.4 + 0.6 * (uv.x * uv.y);
                return vec4f(uv.x, uv.y, glow, 1.0);
              }
            \`,
          });

          this.pipeline = this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
              module: shader,
              entryPoint: 'vsMain',
              buffers: [{
                arrayStride: 16,
                attributes: [
                  { shaderLocation: 0, offset: 0, format: 'float32x2' },
                  { shaderLocation: 1, offset: 8, format: 'float32x2' },
                ],
              }],
            },
            fragment: {
              module: shader,
              entryPoint: 'fsMain',
              targets: [{ format }],
            },
            primitive: { topology: 'triangle-strip' },
          });

          return true;
        }

        start() {
          this.running = true;
          this.lastFrame = performance.now();
          this.loop();
        }

        stop() {
          this.running = false;
        }

        loop() {
          if (!this.running) return;
          const now = performance.now();
          const delta = now - this.lastFrame;
          if (delta >= this.targetFrameTime) {
            this.lastFrame = now - (delta % this.targetFrameTime);
            this.render();
          }
          requestAnimationFrame(() => this.loop());
        }

        render() {
          if (!this.device || !this.context || !this.pipeline) return;
          const vertexData = new Float32Array([
            -1, -1, 0, 1,
             1, -1, 1, 1,
            -1,  1, 0, 0,
             1,  1, 1, 0,
          ]);
          const vertexBuffer = this.device.createBuffer({
            size: vertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
          });
          this.device.queue.writeBuffer(vertexBuffer, 0, vertexData);
          const encoder = this.device.createCommandEncoder();
          const pass = encoder.beginRenderPass({
            colorAttachments: [{
              view: this.context.getCurrentTexture().createView(),
              loadOp: 'clear',
              storeOp: 'store',
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
            }],
          });
          pass.setPipeline(this.pipeline);
          pass.setVertexBuffer(0, vertexBuffer);
          pass.draw(4);
          pass.end();
          this.device.queue.submit([encoder.finish()]);
        }
      }
  `;
}
