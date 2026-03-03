/**
 * Compression Service - Multi-Algorithm & Context-Aware
 * Handles "Ultra-Compression Layering"
 */

export enum CompressionMethod {
    NONE = 'none',
    GZIP = 'gzip',       // General purpose (fallback)
    BROTLI = 'brotli',   // Text / Web
    ZSTD = 'zstd',       // Binaries (Simulated/WASM)
    LZ4 = 'lz4',         // Fast Decompression
    NEURAL = 'neural'    // AI-Predicted (GPU)
}

export class CompressionService {
    private static instance: CompressionService;

    static getInstance(): CompressionService {
        if (!CompressionService.instance) {
            CompressionService.instance = new CompressionService();
        }
        return CompressionService.instance;
    }

    async compress(data: Uint8Array, filename: string): Promise<{ data: Uint8Array, method: CompressionMethod }> {
        const method = this.selectMethod(filename, data);
        console.log(`CompressionService: Compressing ${filename} with ${method}...`);

        switch (method) {
            case CompressionMethod.GZIP:
            case CompressionMethod.BROTLI: // Browsers support gzip/deflate in CompressionStream. Brotli is often 'deflate-raw' or specific.
                return {
                    data: await this.streamCompress(data, 'gzip'), // Using gzip as standard browser API
                    method: CompressionMethod.GZIP
                };
            case CompressionMethod.NEURAL:
                // Mock Neural Compression
                return {
                    data: data, // Pass-through for POC
                    method: CompressionMethod.NEURAL
                };
            default:
                return { data, method: CompressionMethod.NONE };
        }
    }

    async decompress(data: Uint8Array, method: CompressionMethod): Promise<Uint8Array> {
        switch (method) {
            case CompressionMethod.GZIP:
            case CompressionMethod.BROTLI:
                return await this.streamDecompress(data, 'gzip');
            case CompressionMethod.NEURAL:
                return data; // Pass-through
            default:
                return data;
        }
    }

    private selectMethod(filename: string, data: Uint8Array): CompressionMethod {
        const ext = filename.split('.').pop()?.toLowerCase();
        
        // Context-Aware Selection
        switch (ext) {
            case 'txt':
            case 'json':
            case 'js':
            case 'ts':
            case 'html':
            case 'css':
            case 'md':
                return CompressionMethod.GZIP; // Ideal for text (Brotli preferred if available)
            
            case 'wasm':
            case 'exe':
            case 'so':
            case 'dll':
            case 'bin':
            case 'apk':
                // Binaries benefit from Zstd or LZMA
                // For browser native, Gzip is still best option without extra WASM libs
                return CompressionMethod.GZIP; 
            
            case 'png':
            case 'jpg':
            case 'webp':
            case 'mp3':
            case 'mp4':
                // Already compressed media
                return CompressionMethod.NONE;

            default:
                // Entropy Check (Heuristic)
                // If entropy is high, it's likely compressed or random -> No compression
                // If low -> Gzip
                return this.estimateEntropy(data) > 0.9 ? CompressionMethod.NONE : CompressionMethod.GZIP;
        }
    }

    private async streamCompress(data: Uint8Array, format: 'gzip' | 'deflate'): Promise<Uint8Array> {
        // @ts-ignore - CompressionStream is standard in modern browsers
        const stream = new CompressionStream(format);
        const writer = stream.writable.getWriter();
        // @ts-ignore - BufferSource check
        writer.write(data);
        writer.close();
        return new Uint8Array(await new Response(stream.readable).arrayBuffer());
    }

    private async streamDecompress(data: Uint8Array, format: 'gzip' | 'deflate'): Promise<Uint8Array> {
        // @ts-ignore - DecompressionStream is standard in modern browsers
        const stream = new DecompressionStream(format);
        const writer = stream.writable.getWriter();
        // @ts-ignore - BufferSource check
        writer.write(data);
        writer.close();
        return new Uint8Array(await new Response(stream.readable).arrayBuffer());
    }

    private estimateEntropy(data: Uint8Array): number {
        // Simple Shannon Entropy calculation on a sample
        const sampleSize = Math.min(data.length, 1000);
        const counts = new Int32Array(256);
        for (let i = 0; i < sampleSize; i++) {
            counts[data[i]]++;
        }
        
        let entropy = 0;
        for (let i = 0; i < 256; i++) {
            const p = counts[i] / sampleSize;
            if (p > 0) entropy -= p * Math.log2(p);
        }
        
        // Max entropy for byte is 8 bits
        return entropy / 8;
    }
}

export const compressionService = CompressionService.getInstance();

