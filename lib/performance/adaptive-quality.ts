/**
 * Adaptive Quality Controller
 * Keeps FPS above target by scaling quality dynamically.
 */

export class AdaptiveQualityController {
  private targetFps: number;
  private frameTimes: number[] = [];
  private maxSamples: number = 60;
  private qualityScale: number = 1.0;

  constructor(targetFps: number = 50) {
    this.targetFps = targetFps;
  }

  recordFrame(frameTimeMs: number): void {
    this.frameTimes.push(frameTimeMs);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
    this.adjustQuality();
  }

  getQualityScale(): number {
    return this.qualityScale;
  }

  private adjustQuality(): void {
    if (this.frameTimes.length === 0) return;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = 1000 / avgFrameTime;

    if (fps < this.targetFps) {
      this.qualityScale = Math.max(0.5, this.qualityScale - 0.05);
    } else if (fps > this.targetFps + 10) {
      this.qualityScale = Math.min(1.0, this.qualityScale + 0.02);
    }
  }
}

export const adaptiveQualityController = new AdaptiveQualityController(50);
