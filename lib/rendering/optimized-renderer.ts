/**
 * Optimized Renderer - Uses compiled languages for rendering optimizations
 */

import { WebGLRenderer } from './webgl-renderer';
// stateOptimizer imported dynamically to avoid fengari SSR issues
import { adaptivePerformance } from '../performance/adaptive';

export class OptimizedRenderer extends WebGLRenderer {
  private frameBuffer: ImageData | null = null;
  private lastOptimization = 0;
  private optimizationInterval = 100; // Optimize every 100ms

  /**
   * Render with optimizations
   */
  async renderOptimized(imageData: ImageData | HTMLImageElement | HTMLCanvasElement): Promise<void> {
    const now = performance.now();
    const adaptive = adaptivePerformance?.getConfig();

    // Apply optimizations periodically (client-side only)
    if (now - this.lastOptimization >= this.optimizationInterval && typeof window !== 'undefined') {
      if (imageData instanceof ImageData) {
        // Use Go optimizer for parallel frame processing
        const { stateOptimizer } = await import('../performance/optimizers');
        const optimized = await stateOptimizer.optimizeRenderingGo(imageData);
        
        if (optimized.success && optimized.optimized) {
          // Create new ImageData from optimized buffer
          const optimizedData = new ImageData(
            new Uint8ClampedArray(optimized.optimized),
            imageData.width,
            imageData.height
          );
          this.render(optimizedData);
          this.lastOptimization = now;
          return;
        }
      }
    }

    // Fallback to standard rendering
    this.render(imageData);
  }

  /**
   * Render with adaptive quality
   */
  renderWithAdaptiveQuality(imageData: ImageData | HTMLImageElement | HTMLCanvasElement): void {
    const adaptive = adaptivePerformance?.getConfig();
    
    if (!adaptive) {
      this.render(imageData);
      return;
    }

    // Apply render resolution scaling
    if (adaptive.renderResolution < 1.0 && imageData instanceof ImageData) {
      const scaledWidth = Math.floor(imageData.width * adaptive.renderResolution);
      const scaledHeight = Math.floor(imageData.height * adaptive.renderResolution);
      
      // Create scaled canvas
      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          this.imageDataToCanvas(imageData),
          0, 0, scaledWidth, scaledHeight
        );
        this.render(canvas);
        return;
      }
    }

    this.render(imageData);
  }

  private imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
    }
    return canvas;
  }
}

