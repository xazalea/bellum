/**
 * Deduplication Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ChunkGraph } from '../dedupe/chunk-graph';
import { hashChunk, verifyChunkHash } from '../dedupe/content-hash';

describe('Deduplication', () => {
  describe('Content Hashing', () => {
    it('should generate consistent hashes', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash1 = hashChunk(data);
      const hash2 = hashChunk(data);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different data', () => {
      const data1 = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([4, 5, 6]);
      
      const hash1 = hashChunk(data1);
      const hash2 = hashChunk(data2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should verify chunk hashes correctly', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash = hashChunk(data);
      
      expect(verifyChunkHash(data, hash)).toBe(true);
      expect(verifyChunkHash(new Uint8Array([6, 7, 8]), hash)).toBe(false);
    });
  });

  describe('Chunk Graph', () => {
    let chunkGraph: ChunkGraph;

    beforeEach(() => {
      chunkGraph = new ChunkGraph();
    });

    it('should add chunks and track references', () => {
      const data = new Uint8Array([1, 2, 3]);
      const hash1 = chunkGraph.addChunk(data, 'local', 'chunk1');
      const hash2 = chunkGraph.addChunk(data, 'local', 'chunk2'); // Same data
      
      expect(hash1).toBe(hash2); // Same hash for same data
      
      const chunk = chunkGraph.getChunk(hash1);
      expect(chunk?.refCount).toBe(2); // Referenced twice
    });

    it('should split data into chunks', async () => {
      const data = new Uint8Array(100 * 1024); // 100KB
      data.fill(42);
      
      const chunks = await chunkGraph.splitIntoChunks(data);
      
      expect(chunks.length).toBeGreaterThan(1);
      
      // Verify chunks can be reassembled
      const reassembled = new Uint8Array(data.length);
      let offset = 0;
      for (const chunk of chunks) {
        reassembled.set(chunk, offset);
        offset += chunk.length;
      }
      
      expect(reassembled).toEqual(data);
    });

    it('should register and retrieve files', () => {
      const fileId = 'test-file';
      const chunks = ['hash1', 'hash2', 'hash3'];
      
      chunkGraph.registerFile(fileId, chunks, 1000, 32768);
      
      const file = chunkGraph.getFile(fileId);
      expect(file).toBeDefined();
      expect(file?.chunks).toEqual(chunks);
      expect(file?.metadata.originalSize).toBe(1000);
    });

    it('should perform garbage collection', () => {
      const data = new Uint8Array([1, 2, 3]);
      const hash = chunkGraph.addChunk(data, 'local', 'chunk1');
      
      const chunk = chunkGraph.getChunk(hash);
      if (chunk) {
        chunk.refCount = 0; // Simulate unreferenced chunk
      }
      
      const removed = chunkGraph.garbageCollect();
      expect(removed).toBe(1);
      expect(chunkGraph.getChunk(hash)).toBeUndefined();
    });

    it('should calculate statistics', () => {
      const data1 = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([4, 5, 6]);
      
      chunkGraph.addChunk(data1, 'local', 'chunk1');
      chunkGraph.addChunk(data2, 'local', 'chunk2');
      chunkGraph.registerFile('file1', ['hash1', 'hash2'], 1000, 32768);
      
      const stats = chunkGraph.getStats();
      expect(stats.totalChunks).toBeGreaterThan(0);
      expect(stats.totalFiles).toBe(1);
    });
  });
});
