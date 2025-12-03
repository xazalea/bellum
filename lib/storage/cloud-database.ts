/**
 * Cloud Database Provider (Simulated Unlimited Storage)
 * Uses a separate IndexedDB store ("Cold Storage") to simulate a cloud bucket.
 * Implements real Chunking and Compression.
 */
import { HiberFile } from './hiberfile';
import { CompressionService } from '../nacho/storage/compression-service';

interface ArchiveManifest {
  id: string;
  originalSize: number;
  compressedSize: number;
  chunks: string[]; // Paths to chunks in Cold Storage
  timestamp: number;
  mimeType: string;
}

export class CloudDatabase {
  private coldStore: HiberFile;
  private compressionService = CompressionService.getInstance();

  constructor() {
    // We use a separate HiberFile instance pointing to a different DB
    // This isolates "Cloud" storage from "Local" storage
    this.coldStore = new HiberFile('bellum-cloud-storage');
  }

  /**
   * Archive binary data
   * 1. Compress
   * 2. Split into chunks
   * 3. Store in Cold Storage (Puter or LocalDB)
   */
  async saveBinary(file: Blob, onProgress?: (p: number) => void): Promise<string> {
    // Fallback to Local Cold Storage (IndexedDB)
    // 1. Compress
    // @ts-ignore - Property 'name' does not exist on type 'Blob' (it exists on File which extends Blob)
    const { data: compressedBytes } = await this.compressionService.compress(new Uint8Array(await file.arrayBuffer()), file.name || 'binary');
    // @ts-ignore - ArrayBufferLike strictness
    const compressed = new Blob([compressedBytes]);
    
    // 2. Chunking Configuration
    const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB chunks (Standard Cloud Block Size)
    const totalSize = compressed.size;
    const chunkCount = Math.ceil(totalSize / CHUNK_SIZE);
    const chunkPaths: string[] = [];
    const archiveId = crypto.randomUUID();

    // 3. Process Chunks
    const buffer = await compressed.arrayBuffer();
    
    for (let i = 0; i < chunkCount; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunkData = buffer.slice(start, end);
      
      const chunkPath = `archives/${archiveId}/chunk_${i}`;
      await this.coldStore.writeFile(chunkPath, chunkData);
      chunkPaths.push(chunkPath);

      if (onProgress) {
        onProgress(((i + 1) / chunkCount) * 100);
      }
    }

    // 4. Create Manifest
    const manifest: ArchiveManifest = {
      id: archiveId,
      originalSize: file.size,
      compressedSize: totalSize,
      chunks: chunkPaths,
      timestamp: Date.now(),
      mimeType: file.type
    };

    // Store Manifest in Cold Storage as well
    const manifestPath = `manifests/${archiveId}.json`;
    await this.coldStore.writeFile(manifestPath, JSON.stringify(manifest));

    return manifestPath;
  }

  /**
   * Restore binary data
   * 1. Read chunks
   * 2. Assemble
   * 3. Decompress
   */
  async loadBinary(manifestPath: string, onProgress?: (p: number) => void): Promise<Blob> {
    // 1. Load Manifest
    const manifestJson = await this.coldStore.readFileAsText(manifestPath);
    const manifest: ArchiveManifest = JSON.parse(manifestJson);

    // 2. Load Chunks
    const chunks: ArrayBuffer[] = [];
    let loadedCount = 0;

    for (const chunkPath of manifest.chunks) {
      const chunkBlob = await this.coldStore.readFile(chunkPath);
      chunks.push(await chunkBlob.arrayBuffer());
      
      loadedCount++;
      if (onProgress) {
        onProgress((loadedCount / manifest.chunks.length) * 100);
      }
    }

    // 3. Assemble
    const compressedBlob = new Blob(chunks);

    // 4. Decompress
    const originalBytes = await this.compressionService.decompress(new Uint8Array(await compressedBlob.arrayBuffer()), 'gzip' as any);
    // @ts-ignore - ArrayBufferLike strictness
    const originalBlob = new Blob([originalBytes]);
    
    // Restore type
    return new Blob([originalBlob], { type: manifest.mimeType });
  }

  /**
   * Save Metadata Record
   */
  async saveRecord(collection: string, data: any): Promise<string> {
    const id = data.id || crypto.randomUUID();
    const path = `records/${collection}/${id}.json`;
    await this.coldStore.writeFile(path, JSON.stringify(data));
    return id;
  }

  /**
   * Load Metadata Record
   */
  async loadRecord(collection: string, id: string): Promise<any> {
    const path = `records/${collection}/${id}.json`;
    const json = await this.coldStore.readFileAsText(path);
    return JSON.parse(json);
  }
}

