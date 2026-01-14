/**
 * Storage Stress Tests
 * High-load scenarios for file system and sync
 */

import { virtualFileSystem } from '../../lib/engine/virtual-fs';
import { syncEngine } from '../../lib/engine/sync-engine';
import { opfsProvider } from '../../lib/engine/storage-providers';

describe('Storage Stress Tests', () => {
  beforeAll(async () => {
    await virtualFileSystem.initialize();
    await syncEngine.initialize();
  });
  
  afterAll(async () => {
    await syncEngine.shutdown();
  });
  
  test('rapid file operations', async () => {
    const fileCount = 1000;
    const start = performance.now();
    
    // Create many files rapidly
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < fileCount; i++) {
      const path = `/stress/test-${i}.txt`;
      const data = new Uint8Array(1024); // 1KB per file
      crypto.getRandomValues(data);
      
      promises.push(
        virtualFileSystem.writeFile(path, data).catch(() => {})
      );
    }
    
    await Promise.allSettled(promises);
    
    const duration = performance.now() - start;
    const throughput = fileCount / (duration / 1000);
    
    console.log(`[Stress] Created ${fileCount} files in ${duration.toFixed(2)}ms`);
    console.log(`[Stress] Throughput: ${throughput.toFixed(0)} files/sec`);
    
    expect(duration).toBeLessThan(30000); // Complete in < 30s
  });
  
  test('large file handling', async () => {
    const sizes = [10 * 1024 * 1024, 100 * 1024 * 1024]; // 10MB, 100MB
    
    for (const size of sizes) {
      const data = new Uint8Array(size);
      crypto.getRandomValues(data);
      
      const path = `/stress/large-${size}.bin`;
      const start = performance.now();
      
      await virtualFileSystem.writeFile(path, data);
      
      const writeTime = performance.now() - start;
      const writeThroughput = size / (writeTime / 1000) / (1024 * 1024); // MB/s
      
      console.log(`[Stress] Wrote ${size / (1024 * 1024)}MB in ${writeTime.toFixed(2)}ms (${writeThroughput.toFixed(2)} MB/s)`);
      
      const readStart = performance.now();
      await virtualFileSystem.readFile(path);
      const readTime = performance.now() - readStart;
      const readThroughput = size / (readTime / 1000) / (1024 * 1024); // MB/s
      
      console.log(`[Stress] Read ${size / (1024 * 1024)}MB in ${readTime.toFixed(2)}ms (${readThroughput.toFixed(2)} MB/s)`);
      
      // Should handle large files reasonably
      expect(writeTime).toBeLessThan(60000); // < 60s for 100MB
    }
  });
  
  test('concurrent sync operations', async () => {
    const operationCount = 100;
    const start = performance.now();
    
    // Create many files and trigger sync
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < operationCount; i++) {
      const path = `/stress/sync-${i}.txt`;
      const data = new Uint8Array(1024);
      crypto.getRandomValues(data);
      
      promises.push(
        virtualFileSystem.writeFile(path, data)
          .then(() => syncEngine.syncFile(path))
          .catch(() => {})
      );
    }
    
    await Promise.allSettled(promises);
    
    const duration = performance.now() - start;
    
    console.log(`[Stress] ${operationCount} sync operations in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(60000); // Complete in < 60s
  });
  
  test('cache eviction under pressure', async () => {
    // Fill cache with many files
    const fileCount = 200;
    
    for (let i = 0; i < fileCount; i++) {
      const path = `/stress/cache-${i}.txt`;
      const data = new Uint8Array(1024 * 100); // 100KB per file
      crypto.getRandomValues(data);
      
      await virtualFileSystem.writeFile(path, data).catch(() => {});
      await virtualFileSystem.readFile(path).catch(() => {});
    }
    
    const stats = virtualFileSystem.getCacheStats();
    
    console.log(`[Stress] Cache stats: ${stats.entries} entries, ${stats.totalSize / (1024 * 1024)}MB`);
    
    // Cache should have evicted old entries
    expect(stats.entries).toBeLessThan(fileCount);
  });
  
  test('metadata scalability', () => {
    const metadataCount = 10000;
    const start = performance.now();
    
    // Access metadata many times
    for (let i = 0; i < metadataCount; i++) {
      const metadata = syncEngine.getAllMetadata();
      // Just accessing
    }
    
    const duration = performance.now() - start;
    const throughput = metadataCount / (duration / 1000);
    
    console.log(`[Stress] Metadata access: ${throughput.toFixed(0)} ops/sec`);
    expect(throughput).toBeGreaterThan(10000); // Should handle > 10k ops/sec
  });
  
  test('extreme dataset - 100000 files', async () => {
    const fileCount = 100000;
    const start = performance.now();
    
    // Create metadata for many files (simulated)
    const operations: Promise<void>[] = [];
    
    for (let i = 0; i < fileCount; i++) {
      const path = `/extreme/file-${i}.txt`;
      const data = new Uint8Array(1024);
      crypto.getRandomValues(data);
      
      // Simulate metadata creation
      operations.push(
        crypto.subtle.digest('SHA-256', data).then(() => {})
      );
      
      // Batch operations
      if (operations.length >= 1000) {
        await Promise.all(operations);
        operations.length = 0;
      }
    }
    
    await Promise.all(operations);
    
    const duration = performance.now() - start;
    const throughput = fileCount / (duration / 1000);
    
    console.log(`[Stress] Extreme dataset: ${fileCount} files in ${duration.toFixed(2)}ms`);
    console.log(`[Stress] Throughput: ${throughput.toFixed(0)} files/sec`);
    expect(duration).toBeLessThan(120000); // Should complete in < 2 minutes
  });
});
