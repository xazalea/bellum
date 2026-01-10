/**
 * Video Re-encoder
 * Transform video → Motion fields + keyframes
 * Compression: 10x-20x
 */

export interface VideoFrame {
  timestamp: number;
  data: ImageData;
}

export interface MotionVector {
  x: number;
  y: number;
}

export interface Keyframe {
  index: number;
  timestamp: number;
  data: Uint8Array; // Compressed image data
}

export interface MotionField {
  fromFrame: number;
  toFrame: number;
  vectors: MotionVector[][]; // 2D grid of motion vectors
  blockSize: number;
}

export interface ReencodedVideo {
  keyframes: Keyframe[];
  motionFields: MotionField[];
  width: number;
  height: number;
  fps: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Video Re-encoder
 */
export class VideoReencoder {
  /**
   * Re-encode video using motion fields
   */
  static async reencode(frames: VideoFrame[], fps: number = 30): Promise<ReencodedVideo> {
    if (frames.length === 0) {
      throw new Error('No frames provided');
    }

    const { width, height } = frames[0].data;
    const keyframeInterval = 30; // Every 30 frames

    // Extract keyframes
    const keyframes: Keyframe[] = [];
    for (let i = 0; i < frames.length; i += keyframeInterval) {
      const frame = frames[i];
      const compressedData = await this.compressFrame(frame.data);
      keyframes.push({
        index: i,
        timestamp: frame.timestamp,
        data: compressedData,
      });
    }

    // Compute motion fields between keyframes
    const motionFields: MotionField[] = [];
    for (let i = 0; i < keyframes.length - 1; i++) {
      const startIndex = keyframes[i].index;
      const endIndex = keyframes[i + 1].index;

      for (let j = startIndex; j < endIndex - 1; j++) {
        const field = await this.computeMotionField(
          frames[j].data,
          frames[j + 1].data,
          16 // block size
        );
        motionFields.push({
          fromFrame: j,
          toFrame: j + 1,
          ...field,
        });
      }
    }

    // Calculate sizes
    const originalSize = frames.reduce((sum, f) => sum + f.data.data.length, 0);
    const keyframesSize = keyframes.reduce((sum, kf) => sum + kf.data.length, 0);
    const motionFieldsSize = motionFields.reduce(
      (sum, mf) => sum + mf.vectors.length * mf.vectors[0].length * 4, // 2 floats per vector
      0
    );
    const compressedSize = keyframesSize + motionFieldsSize;

    return {
      keyframes,
      motionFields,
      width,
      height,
      fps,
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
    };
  }

  private static async compressFrame(imageData: ImageData): Promise<Uint8Array> {
    // Use canvas to compress as JPEG
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(new Uint8Array(0));
            return;
          }
          blob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)));
        },
        'image/jpeg',
        0.8
      );
    });
  }

  private static async computeMotionField(
    frame1: ImageData,
    frame2: ImageData,
    blockSize: number
  ): Promise<{ vectors: MotionVector[][]; blockSize: number }> {
    const { width, height } = frame1;
    const blocksX = Math.ceil(width / blockSize);
    const blocksY = Math.ceil(height / blockSize);

    const vectors: MotionVector[][] = [];

    for (let by = 0; by < blocksY; by++) {
      const row: MotionVector[] = [];
      for (let bx = 0; bx < blocksX; bx++) {
        const vector = this.findMotionVector(
          frame1,
          frame2,
          bx * blockSize,
          by * blockSize,
          blockSize
        );
        row.push(vector);
      }
      vectors.push(row);
    }

    return { vectors, blockSize };
  }

  private static findMotionVector(
    frame1: ImageData,
    frame2: ImageData,
    x: number,
    y: number,
    blockSize: number
  ): MotionVector {
    const searchRange = 16; // pixels
    let bestVector: MotionVector = { x: 0, y: 0 };
    let bestError = Infinity;

    for (let dy = -searchRange; dy <= searchRange; dy++) {
      for (let dx = -searchRange; dx <= searchRange; dx++) {
        const error = this.blockMatchError(frame1, frame2, x, y, x + dx, y + dy, blockSize);
        if (error < bestError) {
          bestError = error;
          bestVector = { x: dx, y: dy };
        }
      }
    }

    return bestVector;
  }

  private static blockMatchError(
    frame1: ImageData,
    frame2: ImageData,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    blockSize: number
  ): number {
    let error = 0;
    const { width: w1, height: h1, data: d1 } = frame1;
    const { width: w2, height: h2, data: d2 } = frame2;

    for (let dy = 0; dy < blockSize; dy++) {
      for (let dx = 0; dx < blockSize; dx++) {
        const px1 = Math.min(x1 + dx, w1 - 1);
        const py1 = Math.min(y1 + dy, h1 - 1);
        const px2 = Math.min(Math.max(x2 + dx, 0), w2 - 1);
        const py2 = Math.min(Math.max(y2 + dy, 0), h2 - 1);

        const i1 = (py1 * w1 + px1) * 4;
        const i2 = (py2 * w2 + px2) * 4;

        const dr = d1[i1] - d2[i2];
        const dg = d1[i1 + 1] - d2[i2 + 1];
        const db = d1[i1 + 2] - d2[i2 + 2];

        error += dr * dr + dg * dg + db * db;
      }
    }

    return error;
  }
}
