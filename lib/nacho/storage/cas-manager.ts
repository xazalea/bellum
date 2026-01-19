/**
 * CAS Manager - Content Addressable Storage & Deduplication
 * Handles "Deduplication & Hash-Based Storage"
 */

import { compressionService, CompressionMethod } from './compression-service';
import { puterClient } from '../../storage/hiberfile'; // Use existing IDB client as backing store

export interface ChunkMeta {
    hash: string;
    size: number;
    compressedSize: number;
    compression: CompressionMethod;
    refCount: number;
}

export interface FileManifest {
    path: string;
    size: number;
    chunks: string[]; // List of chunk hashes
    created: number;
    modified: number;
}

export class CASManager {
    private static instance: CASManager;
    
    // Manifest Index: Path -> Manifest
    private manifestIndex: Map<string, FileManifest> = new Map();
    // Chunk Index: Hash -> Meta
    private chunkIndex: Map<string, ChunkMeta> = new Map();

    // Constants
    private readonly CHUNK_SIZE = 64 * 1024; // 64KB Chunks

    static getInstance(): CASManager {
        if (!CASManager.instance) {
            CASManager.instance = new CASManager();
        }
        return CASManager.instance;
    }

    async storeFile(path: string, data: Uint8Array): Promise<void> {
        // Initialize WASM storage for faster hashing
        await initStorage();
        
        const chunks: string[] = [];
        let totalSize = 0;

        // 1. Chunking (WASM-accelerated)
        const chunker = new Chunker(this.CHUNK_SIZE);
        const chunkCount = chunker.chunkCount(data.length);
        
        // Batch process chunks for better performance
        const chunkBatch: Uint8Array[] = [];
        const chunkHashes: string[] = [];
        
        for (let i = 0; i < chunkCount; i++) {
            const [start, end] = chunker.chunkBoundaries(i, data.length);
            const chunk = data.slice(start, end);
            chunkBatch.push(chunk);
            
            // Process in batches of 10 for parallel hashing
            if (chunkBatch.length >= 10 || i === chunkCount - 1) {
                const hashes = await hashChunksBatch(chunkBatch);
                chunkHashes.push(...hashes);
                chunkBatch.length = 0;
            }
        }
        
        // 2. Store chunks with deduplication
        for (let i = 0; i < chunkCount; i++) {
            const [start, end] = chunker.chunkBoundaries(i, data.length);
            const chunk = data.slice(start, end);
            const hash = chunkHashes[i];
            
            // 3. Store Chunk if new
            if (!this.chunkIndex.has(hash)) {
                // Compress
                const { data: compressed, method } = await compressionService.compress(chunk, path);
                
                // Persist to IDB (Simulated via HiberFile or direct IDB access)
                // We prefix to separate from normal files
                await puterClient.writeFile(`/.cas/chunks/${hash}`, compressed, { compress: false });

                this.chunkIndex.set(hash, {
                    hash,
                    size: chunk.length,
                    compressedSize: compressed.length,
                    compression: method,
                    refCount: 1
                });
            } else {
                // Increment Ref Count
                const meta = this.chunkIndex.get(hash)!;
                meta.refCount++;
            }

            chunks.push(hash);
            totalSize += chunk.length;
        }

        // 4. Update Manifest
        const manifest: FileManifest = {
            path,
            size: totalSize,
            chunks,
            created: Date.now(),
            modified: Date.now()
        };
        
        this.manifestIndex.set(path, manifest);
        await this.saveManifestIndex();
    }

    async readFile(path: string): Promise<Uint8Array | null> {
        const manifest = this.manifestIndex.get(path);
        if (!manifest) return null;

        // 5. Reconstruct File
        // Lazy Loading: In a real implementation, we'd return a ReadableStream
        // For POC, we assemble the buffer
        const buffer = new Uint8Array(manifest.size);
        let offset = 0;

        for (const hash of manifest.chunks) {
            const meta = this.chunkIndex.get(hash);
            if (!meta) throw new Error(`Chunk missing: ${hash}`);

            // Fetch from IDB
            const blob = await puterClient.readFile(`/.cas/chunks/${hash}`);
            const compressed = new Uint8Array(await blob.arrayBuffer());

            // Decompress
            const chunk = await compressionService.decompress(compressed, meta.compression);
            
            buffer.set(chunk, offset);
            offset += chunk.length;
        }

        return buffer;
    }

    async readChunk(path: string, offset: number, length: number): Promise<Uint8Array | null> {
        const manifest = this.manifestIndex.get(path);
        if (!manifest) return null;

        const start = offset;
        const end = offset + length;
        const result = new Uint8Array(length);
        let currentOffset = 0;

        for (const hash of manifest.chunks) {
            const meta = this.chunkIndex.get(hash);
            if (!meta) throw new Error(`Chunk missing: ${hash}`);

            const chunkStart = currentOffset;
            const chunkEnd = currentOffset + meta.size;

            // Check intersection
            if (chunkEnd > start && chunkStart < end) {
                // Fetch & Decompress (TODO: Cache decompressed chunks in RAM LRU)
                const blob = await puterClient.readFile(`/.cas/chunks/${hash}`);
                const compressed = new Uint8Array(await blob.arrayBuffer());
                const chunk = await compressionService.decompress(compressed, meta.compression);

                // Calculate slice relative to chunk
                const sliceStart = Math.max(0, start - chunkStart);
                const sliceEnd = Math.min(chunk.length, end - chunkStart);
                
                // Calculate target position in result buffer
                const targetStart = Math.max(0, chunkStart - start);

                result.set(chunk.slice(sliceStart, sliceEnd), targetStart);
            }

            currentOffset += meta.size;
            if (currentOffset >= end) break;
        }

        return result;
    }

    private async computeHash(data: Uint8Array): Promise<string> {
        // @ts-ignore - Strictness on BufferSource
        const buffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private async saveManifestIndex() {
        // Persist index to IDB
        const data = JSON.stringify({
            manifests: Array.from(this.manifestIndex.entries()),
            chunks: Array.from(this.chunkIndex.entries())
        });
        await puterClient.writeFile('/.cas/index.json', new TextEncoder().encode(data), { compress: true });
    }

    async loadIndex() {
        try {
            const blob = await puterClient.readFile('/.cas/index.json');
            const text = await blob.text();
            const data = JSON.parse(text);
            this.manifestIndex = new Map(data.manifests);
            this.chunkIndex = new Map(data.chunks);
            console.log(`CASManager: Loaded ${this.manifestIndex.size} files, ${this.chunkIndex.size} chunks.`);
        } catch (e) {
            console.log('CASManager: No existing index found. Initializing empty.');
        }
    }
}

export const casManager = CASManager.getInstance();

