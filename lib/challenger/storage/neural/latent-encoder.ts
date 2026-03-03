/**
 * Latent Space Encoder
 * Utilities for working with neural codec latent vectors
 */

import { LatentVector } from './wasm-codec';

export interface LatentMetadata {
  dim: number;
  min: number;
  max: number;
  mean: number;
  variance: number;
}

/**
 * Latent Encoder utilities
 */
export class LatentEncoder {
  /**
   * Analyze latent vector statistics
   */
  static analyze(latent: LatentVector): LatentMetadata {
    const { data, dim } = latent;
    
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (let i = 0; i < dim; i++) {
      const value = data[i];
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
    }

    const mean = sum / dim;
    
    let variance = 0;
    for (let i = 0; i < dim; i++) {
      const diff = data[i] - mean;
      variance += diff * diff;
    }
    variance /= dim;

    return { dim, min, max, mean, variance };
  }

  /**
   * Interpolate between two latent vectors
   */
  static interpolate(a: LatentVector, b: LatentVector, t: number): LatentVector {
    if (a.dim !== b.dim) {
      throw new Error('Latent dimensions must match');
    }

    const data = new Float32Array(a.dim);
    for (let i = 0; i < a.dim; i++) {
      data[i] = a.data[i] + (b.data[i] - a.data[i]) * t;
    }

    // Quantize for storage
    const quantized = new Uint8Array(a.dim + 8);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < a.dim; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }

    new Float32Array(quantized.buffer, 0, 2).set([min, max]);
    const range = max - min;
    for (let i = 0; i < a.dim; i++) {
      const normalized = (data[i] - min) / range;
      quantized[i + 8] = Math.round(normalized * 255);
    }

    return { data, quantized, dim: a.dim };
  }

  /**
   * Add noise to latent vector (for variation)
   */
  static addNoise(latent: LatentVector, amount: number = 0.1): LatentVector {
    const data = new Float32Array(latent.dim);
    
    for (let i = 0; i < latent.dim; i++) {
      const noise = (Math.random() * 2 - 1) * amount;
      data[i] = latent.data[i] + noise;
    }

    // Re-quantize
    const quantized = new Uint8Array(latent.dim + 8);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < latent.dim; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }

    new Float32Array(quantized.buffer, 0, 2).set([min, max]);
    const range = max - min;
    for (let i = 0; i < latent.dim; i++) {
      const normalized = (data[i] - min) / range;
      quantized[i + 8] = Math.round(normalized * 255);
    }

    return { data, quantized, dim: latent.dim };
  }

  /**
   * Calculate similarity between two latent vectors
   */
  static similarity(a: LatentVector, b: LatentVector): number {
    if (a.dim !== b.dim) return 0;

    // Cosine similarity
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.dim; i++) {
      dotProduct += a.data[i] * b.data[i];
      magA += a.data[i] * a.data[i];
      magB += b.data[i] * b.data[i];
    }

    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * Serialize latent vector to binary
   */
  static serialize(latent: LatentVector): Uint8Array {
    return latent.quantized;
  }

  /**
   * Deserialize latent vector from binary
   */
  static deserialize(data: Uint8Array, dim: number): LatentVector {
    const quantized = data;
    
    // Dequantize
    const minMax = new Float32Array(data.buffer, 0, 2);
    const min = minMax[0];
    const max = minMax[1];
    const range = max - min;

    const latentData = new Float32Array(dim);
    const quantizedData = new Uint8Array(data.buffer, 8);
    
    for (let i = 0; i < dim; i++) {
      const normalized = quantizedData[i] / 255;
      latentData[i] = min + normalized * range;
    }

    return { data: latentData, quantized, dim };
  }
}
