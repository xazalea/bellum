import { compressSync } from 'fflate';

export interface CompressionResult {
  payload: Uint8Array;
  algorithm: string;
  originalSize: number;
}

export class UltraCompressor {
  async compress(buffers: Record<string, ArrayBuffer>): Promise<Record<string, CompressionResult>> {
    const result: Record<string, CompressionResult> = {};
    for (const [key, buffer] of Object.entries(buffers)) {
      const input = new Uint8Array(buffer);
      const originalSize = input.byteLength;
      if (originalSize === 0) {
        result[key] = { payload: new Uint8Array(0), algorithm: 'none', originalSize: 0 };
        continue;
      }
      try {
        const compressed = compressSync(input, { level: 9 });
        if (compressed.byteLength < originalSize) {
          result[key] = { payload: compressed, algorithm: 'deflate-9', originalSize };
        } else {
          result[key] = { payload: input, algorithm: 'none', originalSize };
        }
      } catch {
        result[key] = { payload: input, algorithm: 'none', originalSize };
      }
    }
    return result;
  }

  encodeBase64(data: Uint8Array): string {
    if (typeof btoa === 'function') {
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    }
    const nodeBuffer = (globalThis as any).Buffer;
    if (nodeBuffer) {
      return nodeBuffer.from(data).toString('base64');
    }
    return '';
  }
}
