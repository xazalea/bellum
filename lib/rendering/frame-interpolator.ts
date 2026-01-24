export class FrameInterpolator {
  interpolate(prev: ImageData, next: ImageData, steps: number = 3): ImageData[] {
    const frames: ImageData[] = [];
    if (prev.width !== next.width || prev.height !== next.height) return frames;
    const total = steps + 1;
    for (let i = 1; i <= steps; i++) {
      const t = i / total;
      const blended = new ImageData(prev.width, prev.height);
      for (let p = 0; p < prev.data.length; p++) {
        blended.data[p] = prev.data[p] + (next.data[p] - prev.data[p]) * t;
      }
      frames.push(blended);
    }
    return frames;
  }
}
