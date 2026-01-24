import { OptimizedRenderer } from './optimized-renderer';

export interface UltraRendererConfig {
  targetFps?: number;
}

export class UltraRenderer {
  private source: HTMLCanvasElement;
  private output: HTMLCanvasElement;
  private renderer: OptimizedRenderer | null = null;
  private running = false;
  private lastFrame = 0;
  private targetFrameTime: number;
  private rafId: number | null = null;
  private offscreenWorker: Worker | null = null;
  private offscreenEnabled = false;

  constructor(source: HTMLCanvasElement, output: HTMLCanvasElement, config: UltraRendererConfig = {}) {
    this.source = source;
    this.output = output;
    this.initializeOffscreenRenderer();
    if (!this.offscreenEnabled) {
      this.renderer = new OptimizedRenderer(output);
    }
    const targetFps = config.targetFps ?? 120;
    this.targetFrameTime = 1000 / targetFps;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const delta = now - this.lastFrame;
    if (delta >= this.targetFrameTime) {
      this.lastFrame = now - (delta % this.targetFrameTime);
      if (this.offscreenEnabled) {
        void this.sendFrameToWorker();
      } else if (this.renderer) {
        void this.renderer.renderWithAdaptiveQuality(this.source);
      }
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  private initializeOffscreenRenderer(): void {
    if (typeof window === 'undefined') return;
    if (typeof Worker === 'undefined') return;
    const canTransfer = typeof this.output.transferControlToOffscreen === 'function';
    if (!canTransfer) return;

    try {
      const offscreen = this.output.transferControlToOffscreen();
      const worker = new Worker(new URL('../workers/offscreen-renderer.worker.ts', import.meta.url));
      worker.postMessage({ type: 'INIT', canvas: offscreen }, [offscreen]);
      this.offscreenWorker = worker;
      this.offscreenEnabled = true;
    } catch (error) {
      console.warn('[UltraRenderer] OffscreenCanvas unavailable', error);
    }
  }

  private async sendFrameToWorker(): Promise<void> {
    if (!this.offscreenWorker) return;
    const bitmap = await createImageBitmap(this.source);
    this.offscreenWorker.postMessage({ type: 'FRAME', bitmap }, [bitmap]);
  }
}
