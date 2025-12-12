export interface CompressionResult {
  blob: Blob;
  originalBytes: number;
  compressedBytes: number;
  algorithm: 'gzip';
}

/**
 * Best-effort extreme compression in-browser.
 * Uses CompressionStream (gzip) when available.
 */
export async function compressFileGzip(file: Blob): Promise<CompressionResult> {
  // If CompressionStream isn't available, no-op.
  // (Still functional; just no compression.)
  // @ts-ignore
  if (typeof CompressionStream === 'undefined') {
    return {
      blob: file,
      originalBytes: file.size,
      compressedBytes: file.size,
      algorithm: 'gzip',
    };
  }

  // @ts-ignore
  const cs = new CompressionStream('gzip');
  const compressedStream = file.stream().pipeThrough(cs);
  const compressedBlob = await new Response(compressedStream).blob();

  return {
    blob: compressedBlob,
    originalBytes: file.size,
    compressedBytes: compressedBlob.size,
    algorithm: 'gzip',
  };
}
