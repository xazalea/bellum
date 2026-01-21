/**
 * Fast Fingerprinting with WASM
 * Fallback to SubtleCrypto if WASM unavailable
 */

import { loadAndInstantiate } from './loader';

interface FingerprintWasm {
  hash_sha256(data: Uint8Array): Uint8Array;
  hash_combined(sources: any[]): Uint8Array;
  bytes_to_hex(bytes: Uint8Array): string;
  hash_canvas_data(pixels: Uint8Array, width: number, height: number): string;
  hash_audio_data(samples: Float32Array): string;
  generate_fingerprint_id(components: string[]): string;
}

let wasmModule: FingerprintWasm | null = null;
let useWasm = false;

/**
 * Initialize fingerprint module
 */
export async function initFingerprint(): Promise<boolean> {
  try {
    wasmModule = await loadAndInstantiate('/wasm/fingerprint.wasm');
    if (wasmModule) {
      useWasm = true;
      console.log('✅ Fingerprint WASM loaded');
      return true;
    }
  } catch (error) {
    console.warn('Fingerprint WASM failed, using JS fallback:', error);
  }
  
  useWasm = false;
  return false;
}

/**
 * Hash data with SHA-256
 */
export async function hashSHA256(data: Uint8Array): Promise<Uint8Array> {
  if (wasmModule === null && !useWasm) {
    await initFingerprint();
  }

  if (useWasm && wasmModule) {
    try {
      return wasmModule.hash_sha256(data);
    } catch (error) {
      console.warn('WASM hash failed, using fallback:', error);
      useWasm = false;
    }
  }

  // JavaScript fallback (SubtleCrypto)
  // Convert ArrayBufferLike to ArrayBuffer for crypto.subtle.digest
  const buffer = data.buffer instanceof ArrayBuffer
    ? data.buffer
    : new Uint8Array(data).buffer;
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Hash multiple data sources and combine
 */
export async function hashCombined(sources: (string | Uint8Array)[]): Promise<string> {
  if (wasmModule === null) {
    await initFingerprint();
  }

  if (useWasm && wasmModule) {
    try {
      const hash = wasmModule.hash_combined(sources);
      return bytesToHex(hash);
    } catch (error) {
      console.warn('WASM combined hash failed, using fallback:', error);
      useWasm = false;
    }
  }

  // Fallback: concatenate and hash
  const encoder = new TextEncoder();
  let combined = new Uint8Array();
  
  for (const source of sources) {
    const bytes = typeof source === 'string' ? encoder.encode(source) : source;
    const temp = new Uint8Array(combined.length + bytes.length);
    temp.set(combined);
    temp.set(bytes, combined.length);
    combined = temp;
  }
  
  const hash = await hashSHA256(combined);
  return bytesToHex(hash);
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  if (useWasm && wasmModule) {
    try {
      return wasmModule.bytes_to_hex(bytes);
    } catch (error) {
      // Fall through to JS implementation
    }
  }

  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash canvas pixel data for fingerprinting
 */
export async function hashCanvasData(
  pixels: Uint8Array,
  width: number,
  height: number
): Promise<string> {
  if (wasmModule === null) {
    await initFingerprint();
  }

  if (useWasm && wasmModule) {
    try {
      return wasmModule.hash_canvas_data(pixels, width, height);
    } catch (error) {
      console.warn('WASM canvas hash failed, using fallback:', error);
      useWasm = false;
    }
  }

  // Fallback: sample and hash
  const samples = new Uint8Array(1024);
  const sampleRate = Math.floor(pixels.length / 1024);
  
  for (let i = 0; i < 1024; i++) {
    samples[i] = pixels[i * sampleRate] || 0;
  }
  
  const hash = await hashSHA256(samples);
  return bytesToHex(hash);
}

/**
 * Hash audio data for fingerprinting
 */
export async function hashAudioData(samples: Float32Array): Promise<string> {
  if (wasmModule === null) {
    await initFingerprint();
  }

  if (useWasm && wasmModule) {
    try {
      return wasmModule.hash_audio_data(samples);
    } catch (error) {
      console.warn('WASM audio hash failed, using fallback:', error);
      useWasm = false;
    }
  }

  // Fallback: sample and hash
  const sampleRate = Math.floor(samples.length / 1000);
  const bytes = new Uint8Array(1000 * 4);
  
  for (let i = 0; i < 1000; i++) {
    const sample = samples[i * sampleRate] || 0;
    const view = new DataView(bytes.buffer);
    view.setFloat32(i * 4, sample, true);
  }
  
  const hash = await hashSHA256(bytes);
  return bytesToHex(hash);
}

/**
 * Generate combined fingerprint ID
 */
export async function generateFingerprintId(components: string[]): Promise<string> {
  if (wasmModule === null) {
    await initFingerprint();
  }

  if (useWasm && wasmModule) {
    try {
      return wasmModule.generate_fingerprint_id(components);
    } catch (error) {
      console.warn('WASM fingerprint ID failed, using fallback:', error);
      useWasm = false;
    }
  }

  // Fallback
  return hashCombined(components);
}

/**
 * Check if WASM is being used
 */
export function isUsingWasm(): boolean {
  return useWasm;
}
