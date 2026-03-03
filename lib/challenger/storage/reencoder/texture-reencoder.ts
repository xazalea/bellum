/**
 * Texture Re-encoder
 * Transform PNG/JPEG → GPU-native formats (BC7/BC5/BC4/ASTC)
 * Compression: 3x-8x depending on format
 */

export type TextureType = 'diffuse' | 'normal' | 'roughness' | 'metallic' | 'grayscale' | 'ui' | 'unknown';

export type GPUTextureFormat =
  | 'BC7'    // High quality color (RGBA)
  | 'BC5'    // 2-channel (normal maps)
  | 'BC4'    // Single channel (grayscale)
  | 'BC1'    // Low quality color (RGB)
  | 'ASTC'   // Mobile-friendly
  | 'ETC2';  // Mobile fallback

export interface TextureAnalysis {
  type: TextureType;
  hasAlpha: boolean;
  channels: number;
  averageColor: [number, number, number, number];
  variance: number;
  recommendedFormat: GPUTextureFormat;
  estimatedCompressionRatio: number;
}

export interface ReencodedTexture {
  format: GPUTextureFormat;
  data: Uint8Array;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Texture Re-encoder
 */
export class TextureReencoder {
  /**
   * Analyze texture to determine optimal format
   */
  static analyzeTexture(imageData: ImageData): TextureAnalysis {
    const { data, width, height } = imageData;
    const pixelCount = width * height;

    let hasAlpha = false;
    let channelSum = [0, 0, 0, 0];
    let variance = 0;

    // Analyze pixels
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      channelSum[0] += r;
      channelSum[1] += g;
      channelSum[2] += b;
      channelSum[3] += a;

      if (a < 255) hasAlpha = true;
    }

    const avgColor: [number, number, number, number] = [
      channelSum[0] / pixelCount,
      channelSum[1] / pixelCount,
      channelSum[2] / pixelCount,
      channelSum[3] / pixelCount,
    ];

    // Calculate variance
    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - avgColor[0];
      const dg = data[i + 1] - avgColor[1];
      const db = data[i + 2] - avgColor[2];
      variance += dr * dr + dg * dg + db * db;
    }
    variance /= pixelCount;

    // Detect texture type
    const type = this.detectTextureType(imageData);

    // Determine channels
    const isGrayscale = this.isGrayscale(imageData);
    const channels = isGrayscale ? 1 : hasAlpha ? 4 : 3;

    // Recommend format
    let recommendedFormat: GPUTextureFormat;
    let estimatedCompressionRatio: number;

    if (type === 'normal') {
      recommendedFormat = 'BC5';
      estimatedCompressionRatio = 4;
    } else if (type === 'grayscale' || type === 'roughness' || type === 'metallic') {
      recommendedFormat = 'BC4';
      estimatedCompressionRatio = 8;
    } else if (type === 'ui') {
      recommendedFormat = 'ASTC';
      estimatedCompressionRatio = 4;
    } else if (hasAlpha) {
      recommendedFormat = 'BC7';
      estimatedCompressionRatio = 4;
    } else {
      recommendedFormat = 'BC7';
      estimatedCompressionRatio = 4;
    }

    return {
      type,
      hasAlpha,
      channels,
      averageColor: avgColor,
      variance,
      recommendedFormat,
      estimatedCompressionRatio,
    };
  }

  /**
   * Re-encode texture to GPU-native format
   */
  static async reencode(imageData: ImageData, targetFormat?: GPUTextureFormat): Promise<ReencodedTexture> {
    const analysis = this.analyzeTexture(imageData);
    const format = targetFormat || analysis.recommendedFormat;

    let compressedData: Uint8Array;

    switch (format) {
      case 'BC7':
        compressedData = await this.encodeBC7(imageData);
        break;
      case 'BC5':
        compressedData = await this.encodeBC5(imageData);
        break;
      case 'BC4':
        compressedData = await this.encodeBC4(imageData);
        break;
      case 'BC1':
        compressedData = await this.encodeBC1(imageData);
        break;
      case 'ASTC':
        compressedData = await this.encodeASTC(imageData);
        break;
      case 'ETC2':
        compressedData = await this.encodeETC2(imageData);
        break;
      default:
        compressedData = new Uint8Array(imageData.data);
    }

    const originalSize = imageData.data.length;
    const compressedSize = compressedData.length;

    return {
      format,
      data: compressedData,
      width: imageData.width,
      height: imageData.height,
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
    };
  }

  private static detectTextureType(imageData: ImageData): TextureType {
    const { data, width, height } = imageData;

    // Check if it's a normal map (blue-ish with specific patterns)
    let blueSum = 0;
    let normalMapScore = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      blueSum += b;

      // Normal maps typically have high blue values and symmetric R/G
      if (b > 200 && Math.abs(r - 128) < 50 && Math.abs(g - 128) < 50) {
        normalMapScore++;
      }
    }

    const pixelCount = width * height;
    const avgBlue = blueSum / pixelCount;

    if (normalMapScore > pixelCount * 0.5 && avgBlue > 200) {
      return 'normal';
    }

    // Check if grayscale
    if (this.isGrayscale(imageData)) {
      return 'grayscale';
    }

    // Default to diffuse
    return 'diffuse';
  }

  private static isGrayscale(imageData: ImageData): boolean {
    const { data } = imageData;
    let grayscalePixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (Math.abs(r - g) < 5 && Math.abs(g - b) < 5) {
        grayscalePixels++;
      }
    }

    return grayscalePixels > data.length / 4 * 0.95;
  }

  /**
   * BC7 encoding (high quality RGBA)
   * Simplified implementation - real BC7 is complex
   */
  private static async encodeBC7(imageData: ImageData): Promise<Uint8Array> {
    const { width, height, data } = imageData;
    const blockWidth = Math.ceil(width / 4);
    const blockHeight = Math.ceil(height / 4);
    const blockCount = blockWidth * blockHeight;
    
    // BC7 uses 16 bytes per 4x4 block
    const compressed = new Uint8Array(blockCount * 16);

    for (let by = 0; by < blockHeight; by++) {
      for (let bx = 0; bx < blockWidth; bx++) {
        const blockIndex = by * blockWidth + bx;
        const blockOffset = blockIndex * 16;

        // Extract 4x4 block
        const block = this.extractBlock(data, width, height, bx * 4, by * 4);

        // Simplified BC7 mode 6 (single partition, 4-bit indices)
        const [color0, color1] = this.findEndpoints(block);

        // Write mode (mode 6 = 0x40)
        compressed[blockOffset] = 0x40;

        // Write endpoints (RGB565)
        this.writeRGB565(compressed, blockOffset + 1, color0);
        this.writeRGB565(compressed, blockOffset + 3, color1);

        // Write indices (4-bit per pixel)
        for (let i = 0; i < 16; i++) {
          const pixel = block[i];
          const index = this.findClosestColorIndex(pixel, color0, color1, 16);
          const byteIndex = blockOffset + 5 + Math.floor(i / 2);
          if (i % 2 === 0) {
            compressed[byteIndex] = index;
          } else {
            compressed[byteIndex] |= index << 4;
          }
        }
      }
    }

    return compressed;
  }

  /**
   * BC5 encoding (2-channel for normal maps)
   */
  private static async encodeBC5(imageData: ImageData): Promise<Uint8Array> {
    const { width, height, data } = imageData;
    const blockWidth = Math.ceil(width / 4);
    const blockHeight = Math.ceil(height / 4);
    const blockCount = blockWidth * blockHeight;
    
    // BC5 uses 16 bytes per 4x4 block (8 bytes per channel)
    const compressed = new Uint8Array(blockCount * 16);

    for (let by = 0; by < blockHeight; by++) {
      for (let bx = 0; bx < blockWidth; bx++) {
        const blockIndex = by * blockWidth + bx;
        const blockOffset = blockIndex * 16;

        // Extract 4x4 block
        const block = this.extractBlock(data, width, height, bx * 4, by * 4);

        // Encode red channel (first 8 bytes)
        this.encodeBC4Channel(compressed, blockOffset, block, 0);

        // Encode green channel (next 8 bytes)
        this.encodeBC4Channel(compressed, blockOffset + 8, block, 1);
      }
    }

    return compressed;
  }

  /**
   * BC4 encoding (single channel)
   */
  private static async encodeBC4(imageData: ImageData): Promise<Uint8Array> {
    const { width, height, data } = imageData;
    const blockWidth = Math.ceil(width / 4);
    const blockHeight = Math.ceil(height / 4);
    const blockCount = blockWidth * blockHeight;
    
    // BC4 uses 8 bytes per 4x4 block
    const compressed = new Uint8Array(blockCount * 8);

    for (let by = 0; by < blockHeight; by++) {
      for (let bx = 0; bx < blockWidth; bx++) {
        const blockIndex = by * blockWidth + bx;
        const blockOffset = blockIndex * 8;

        const block = this.extractBlock(data, width, height, bx * 4, by * 4);
        this.encodeBC4Channel(compressed, blockOffset, block, 0);
      }
    }

    return compressed;
  }

  private static encodeBC4Channel(
    output: Uint8Array,
    offset: number,
    block: Array<[number, number, number, number]>,
    channel: number
  ): void {
    // Find min/max values
    let min = 255, max = 0;
    for (const pixel of block) {
      const value = pixel[channel];
      if (value < min) min = value;
      if (value > max) max = value;
    }

    // Write endpoints
    output[offset] = max;
    output[offset + 1] = min;

    // Write indices (3-bit per pixel, 16 pixels = 48 bits = 6 bytes)
    let bitOffset = 0;
    for (let i = 0; i < 16; i++) {
      const value = block[i][channel];
      const index = this.findClosestValueIndex(value, min, max, 8);
      
      const byteIndex = offset + 2 + Math.floor(bitOffset / 8);
      const bitPos = bitOffset % 8;
      
      output[byteIndex] |= (index & 0x07) << bitPos;
      bitOffset += 3;
    }
  }

  /**
   * BC1 encoding (low quality RGB)
   */
  private static async encodeBC1(imageData: ImageData): Promise<Uint8Array> {
    const { width, height, data } = imageData;
    const blockWidth = Math.ceil(width / 4);
    const blockHeight = Math.ceil(height / 4);
    const blockCount = blockWidth * blockHeight;
    
    // BC1 uses 8 bytes per 4x4 block
    const compressed = new Uint8Array(blockCount * 8);

    for (let by = 0; by < blockHeight; by++) {
      for (let bx = 0; bx < blockWidth; bx++) {
        const blockIndex = by * blockWidth + bx;
        const blockOffset = blockIndex * 8;

        const block = this.extractBlock(data, width, height, bx * 4, by * 4);
        const [color0, color1] = this.findEndpoints(block);

        this.writeRGB565(compressed, blockOffset, color0);
        this.writeRGB565(compressed, blockOffset + 2, color1);

        // Write indices (2-bit per pixel)
        for (let i = 0; i < 16; i++) {
          const pixel = block[i];
          const index = this.findClosestColorIndex(pixel, color0, color1, 4);
          const byteIndex = blockOffset + 4 + Math.floor(i / 4);
          const bitPos = (i % 4) * 2;
          compressed[byteIndex] |= index << bitPos;
        }
      }
    }

    return compressed;
  }

  /**
   * ASTC encoding (mobile-friendly)
   * Simplified implementation
   */
  private static async encodeASTC(imageData: ImageData): Promise<Uint8Array> {
    // ASTC is very complex, using simplified BC7-like approach
    return this.encodeBC7(imageData);
  }

  /**
   * ETC2 encoding (mobile fallback)
   * Simplified implementation
   */
  private static async encodeETC2(imageData: ImageData): Promise<Uint8Array> {
    // ETC2 is complex, using simplified BC1-like approach
    return this.encodeBC1(imageData);
  }

  // Helper methods

  private static extractBlock(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number
  ): Array<[number, number, number, number]> {
    const block: Array<[number, number, number, number]> = [];

    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        const px = Math.min(x + dx, width - 1);
        const py = Math.min(y + dy, height - 1);
        const index = (py * width + px) * 4;

        block.push([
          data[index],
          data[index + 1],
          data[index + 2],
          data[index + 3],
        ]);
      }
    }

    return block;
  }

  private static findEndpoints(
    block: Array<[number, number, number, number]>
  ): [[number, number, number], [number, number, number]] {
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    for (const [r, g, b] of block) {
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (g < minG) minG = g;
      if (g > maxG) maxG = g;
      if (b < minB) minB = b;
      if (b > maxB) maxB = b;
    }

    return [[minR, minG, minB], [maxR, maxG, maxB]];
  }

  private static writeRGB565(output: Uint8Array, offset: number, color: [number, number, number]): void {
    const r = Math.round(color[0] / 255 * 31);
    const g = Math.round(color[1] / 255 * 63);
    const b = Math.round(color[2] / 255 * 31);

    const rgb565 = (r << 11) | (g << 5) | b;
    output[offset] = rgb565 & 0xFF;
    output[offset + 1] = (rgb565 >> 8) & 0xFF;
  }

  private static findClosestColorIndex(
    pixel: [number, number, number, number],
    color0: [number, number, number],
    color1: [number, number, number],
    steps: number
  ): number {
    let bestIndex = 0;
    let bestDist = Infinity;

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = color0[0] + (color1[0] - color0[0]) * t;
      const g = color0[1] + (color1[1] - color0[1]) * t;
      const b = color0[2] + (color1[2] - color0[2]) * t;

      const dr = pixel[0] - r;
      const dg = pixel[1] - g;
      const db = pixel[2] - b;
      const dist = dr * dr + dg * dg + db * db;

      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  private static findClosestValueIndex(value: number, min: number, max: number, steps: number): number {
    let bestIndex = 0;
    let bestDist = Infinity;

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const interpolated = min + (max - min) * t;
      const dist = Math.abs(value - interpolated);

      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    return bestIndex;
  }
}
