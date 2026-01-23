/**
 * Perf Validator
 * Tracks FPS and validates target performance thresholds.
 */

export class PerfValidator {
  private frameTimes: number[] = [];
  private maxSamples = 120;
  private lastReport = 0;
  private targetFps = 50;

  recordFrame(frameTimeMs: number): void {
    this.frameTimes.push(frameTimeMs);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
    this.maybeReport();
  }

  private maybeReport(): void {
    const now = performance.now();
    if (now - this.lastReport < 2000) return;
    this.lastReport = now;

    const avg = this.getAverageFrameTime();
    if (!avg) return;
    const fps = 1000 / avg;
    const status = fps >= this.targetFps ? 'PASS' : 'BELOW_TARGET';
    console.log(`[PerfValidator] FPS=${fps.toFixed(1)} Target=${this.targetFps} Status=${status}`);
  }

  private getAverageFrameTime(): number | null {
    if (this.frameTimes.length === 0) return null;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }
}

export const perfValidator = new PerfValidator();
