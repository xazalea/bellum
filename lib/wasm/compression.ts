/**
 * High-Performance Compression Module (WASM)
 * Fallback to fflate (pure JS) if WASM unavailable
 */

import { loadAndInstantiate } from './loader';
import { gzip, gunzip, strToU8, strFromU8 } from 'fflate';

export enum CompressionAlgorithm {
  Gzip = 0,
  Zstd = 1,
  Lz4 = 2,
}

interface CompressionWasm {
  compress(data: Uint8Array, algorithm: number, level: number): Uint8Array;
  decompress(data: Uint8Array, algorithm: number): Uint8Array;
  compression_ratio(originalSize: number, compressedSize: number): number;
  estimate_compressed_size(originalSize: number, algorithm: number): number;
}

let wasmModule: CompressionWasm | null = null;
let useWasm = false;

/**
 * Initialize compression module (WASM with JS fallback)
 */
export async function initCompression(): Promise<boolean> {
  try {
    wasmModule = await loadAndInstantiate('/wasm/compression.wasm');
    if (wasmModule) {
      useWasm = true;
      console.log('✅ Compression WASM loaded');
      return true;
    }
  } catch (error) {
    // Silently fall back to JavaScript implementation
    // This is expected when WASM is not available
    console.log('[Compression] Using JavaScript fallback (WASM not available)');
  }
  
  useWasm = false;
  return false;
}

/**
 * Compress data
 */
export async function compress(
  data: Uint8Array,
  algorithm: CompressionAlgorithm = CompressionAlgorithm.Gzip,
  level: number = 6
): Promise<Uint8Array> {
  // Ensure initialization
  if (wasmModule === null && !useWasm) {
    await initCompression();
  }

  if (useWasm && wasmModule) {
    try {
      return wasmModule.compress(data, algorithm, level);
    } catch (error) {
      console.log('[Compression] WASM compression failed, using JavaScript fallback');
      useWasm = false;
    }
  }

  // JavaScript fallback (fflate)
  // Constrain level to valid range (0-9) for fflate
  const validLevel = Math.max(0, Math.min(9, Math.round(level))) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  
  return new Promise((resolve, reject) => {
    if (algorithm === CompressionAlgorithm.Gzip) {
      gzip(data, { level: validLevel }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    } else {
      // For other algorithms, use gzip as fallback
      gzip(data, { level: validLevel }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    }
  });
}

/**
 * Decompress data
 */
export async function decompress(
  data: Uint8Array,
  algorithm: CompressionAlgorithm = CompressionAlgorithm.Gzip
): Promise<Uint8Array> {
  if (wasmModule === null && !useWasm) {
    await initCompression();
  }

  if (useWasm && wasmModule) {
    try {
      return wasmModule.decompress(data, algorithm);
    } catch (error) {
      console.log('[Compression] WASM decompression failed, using JavaScript fallback');
      useWasm = false;
    }
  }

  // JavaScript fallback
  return new Promise((resolve, reject) => {
    gunzip(data, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Compress a Blob/File
 */
export async function compressFile(
  file: Blob,
  algorithm: CompressionAlgorithm = CompressionAlgorithm.Zstd,
  level: number = 9
): Promise<{
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  algorithm: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  
  const compressed = await compress(data, algorithm, level);
  
  const originalSize = data.byteLength;
  const compressedSize = compressed.byteLength;
  const ratio = compressedSize / originalSize;
  
  // Convert ArrayBufferLike to ArrayBuffer for Blob constructor
  const buffer = compressed.buffer instanceof ArrayBuffer
    ? compressed.buffer
    : new Uint8Array(compressed).buffer;
  
  return {
    blob: new Blob([buffer]),
    originalSize,
    compressedSize,
    ratio,
    algorithm: CompressionAlgorithm[algorithm],
  };
}

/**
 * Compress a Blob (alias for compressFile for API consistency)
 */
export async function compressBlob(
  blob: Blob,
  algorithm: CompressionAlgorithm = CompressionAlgorithm.Zstd,
  level: number = 9
): Promise<Blob> {
  const result = await compressFile(blob, algorithm, level);
  return result.blob;
}

/**
 * Decompress a Blob
 */
export async function decompressBlob(
  blob: Blob,
  algorithm: CompressionAlgorithm = CompressionAlgorithm.Gzip
): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const decompressed = await decompress(data, algorithm);
  
  // Convert ArrayBufferLike to ArrayBuffer for Blob constructor
  const buffer = decompressed.buffer instanceof ArrayBuffer
    ? decompressed.buffer
    : new Uint8Array(decompressed).buffer;
  
  return new Blob([buffer]);
}

/**
 * Get compression ratio
 */
export function getCompressionRatio(originalSize: number, compressedSize: number): number {
  if (wasmModule && useWasm) {
    return wasmModule.compression_ratio(originalSize, compressedSize);
  }
  return originalSize > 0 ? compressedSize / originalSize : 1.0;
}

/**
 * Estimate compressed size
 */
export function estimateCompressedSize(
  originalSize: number,
  algorithm: CompressionAlgorithm = CompressionAlgorithm.Gzip
): number {
  if (wasmModule && useWasm) {
    return wasmModule.estimate_compressed_size(originalSize, algorithm);
  }
  
  // Fallback estimates
  switch (algorithm) {
    case CompressionAlgorithm.Gzip:
      return Math.floor(originalSize * 0.35);
    case CompressionAlgorithm.Zstd:
      return Math.floor(originalSize * 0.25);
    case CompressionAlgorithm.Lz4:
      return Math.floor(originalSize * 0.50);
    default:
      return originalSize;
  }
}

/**
 * Check if WASM is being used
 */
export function isUsingWasm(): boolean {
  return useWasm;
}
