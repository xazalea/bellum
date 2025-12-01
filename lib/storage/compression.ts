
/**
 * Compression Service
 * Handles Gzip compression/decompression streams for large files
 */
export class CompressionService {
  static async compress(blob: Blob): Promise<Blob> {
    const stream = blob.stream();
    const compressedReadable = stream.pipeThrough(new CompressionStream('gzip'));
    return await new Response(compressedReadable).blob();
  }

  static async decompress(blob: Blob): Promise<Blob> {
    const stream = blob.stream();
    const decompressedReadable = stream.pipeThrough(new DecompressionStream('gzip'));
    return await new Response(decompressedReadable).blob();
  }
}

