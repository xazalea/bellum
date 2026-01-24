export interface MicroVMBenchmarkResult {
  averageFps: number;
  frameCount: number;
  durationMs: number;
}

export function runMicroVMBenchmark(
  getFrameTimestamp: () => number,
  durationMs: number = 5000
): Promise<MicroVMBenchmarkResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    let frames = 0;

    const loop = () => {
      frames += 1;
      if (performance.now() - start >= durationMs) {
        const elapsed = performance.now() - start;
        resolve({
          averageFps: frames / (elapsed / 1000),
          frameCount: frames,
          durationMs: elapsed,
        });
        return;
      }
      getFrameTimestamp();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  });
}
