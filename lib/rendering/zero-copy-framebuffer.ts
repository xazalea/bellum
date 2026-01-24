export class ZeroCopyFramebuffer {
  private source: HTMLCanvasElement;
  private target: HTMLCanvasElement;

  constructor(source: HTMLCanvasElement, target: HTMLCanvasElement) {
    this.source = source;
    this.target = target;
  }

  // In browsers, the fastest path is to use the canvas as a texture input.
  syncTo2dContext(): void {
    const ctx = this.target.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(this.source, 0, 0, this.target.width, this.target.height);
  }
}
