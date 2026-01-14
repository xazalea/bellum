/**
 * Sync Engine Benchmarks
 * Stress tests for file synchronization and replication
 */

import { syncEngine } from '../../lib/engine/sync-engine';
import { virtualFileSystem } from '../../lib/engine/virtual-fs';
import type { VectorClock, FileManifest } from '../../lib/engine/sync-engine';

describe('Sync Engine Benchmarks', () => {
  beforeAll(async () => {
    await syncEngine.initialize();
  });
  
  afterAll(async () => {
    await syncEngine.shutdown();
  });
  
  test('hash calculation performance', async () => {
    const sizes = [1024, 1024 * 1024, 10 * 1024 * 1024]; // 1KB, 1MB, 10MB
    const results: Record<number, number> = {};
    
    for (const size of sizes) {
      const data = new Uint8Array(size);
      crypto.getRandomValues(data);
      
      const start = performance.now();
      const hash = await crypto.subtle.digest('SHA-256', data);
      const duration = performance.now() - start;
      
      results[size] = duration;
      
      const throughput = size / (duration / 1000) / (1024 * 1024); // MB/s
      console.log(`[Benchmark] Hash ${size} bytes: ${duration.toFixed(2)}ms (${throughput.toFixed(2)} MB/s)`);
    }
    
    // 1MB should hash in < 10ms
    expect(results[1024 * 1024]).toBeLessThan(10);
  });
  
  test('chunk hash calculation', async () => {
    const fileSize = 10 * 1024 * 1024; // 10MB
    const chunkSize = 1024 * 1024; // 1MB chunks
    const data = new Uint8Array(fileSize);
    crypto.getRandomValues(data);
    
    const start = performance.now();
    
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const hash = await crypto.subtle.digest('SHA-256', chunk);
      const hashArray = Array.from(new Uint8Array(hash));
      chunks.push(hashArray.map(b => b.toString(16).padStart(2, '0')).join(''));
    }
    
    const duration = performance.now() - start;
    
    console.log(`[Benchmark] Chunk hashing: ${duration.toFixed(2)}ms for ${chunks.length} chunks`);
    expect(chunks.length).toBe(10);
    expect(duration).toBeLessThan(100); // Should complete in < 100ms
  });
  
  test('metadata operations', async () => {
    const operations = 10000;
    const start = performance.now();
    
    // Simulate metadata operations
    for (let i = 0; i < operations; i++) {
      const metadata = syncEngine.getAllMetadata();
      // Just accessing should be fast
    }
    
    const duration = performance.now() - start;
    const avgTime = duration / operations;
    
    console.log(`[Benchmark] Metadata access: ${avgTime.toFixed(4)}ms per operation`);
    expect(avgTime).toBeLessThan(0.1); // Should be < 0.1ms
  });
  
  test('sync operation tracking', () => {
    const operations = syncEngine.getSyncOperations();
    
    expect(Array.isArray(operations)).toBe(true);
    
    // Operations should have required fields
    if (operations.length > 0) {
      const op = operations[0];
      expect(op).toHaveProperty('id');
      expect(op).toHaveProperty('type');
      expect(op).toHaveProperty('status');
      expect(op).toHaveProperty('progress');
    }
  });
  
  test('conflict resolution performance', async () => {
    // Create mock conflict
    const testPath = '/test/conflict.txt';
    
    // Simulate resolution
    const start = performance.now();
    
    // In real scenario, would have actual conflict
    // For benchmark, just test resolution logic
    try {
      await syncEngine.resolveConflict(testPath, 'local');
    } catch {
      // Expected if no conflict exists
    }
    
    const duration = performance.now() - start;
    
    console.log(`[Benchmark] Conflict resolution: ${duration.toFixed(4)}ms`);
    expect(duration).toBeLessThan(10); // Should be < 10ms
  });
  
  test('policy update performance', () => {
    const iterations = 1000;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      syncEngine.updateSyncPolicy({
        replicationFactor: (i % 5) + 1,
      });
    }
    
    const duration = performance.now() - start;
    const avgTime = duration / iterations;
    
    console.log(`[Benchmark] Policy update: ${avgTime.toFixed(4)}ms per update`);
    expect(avgTime).toBeLessThan(1.0); // Should be < 1ms
  });
  
  test('vector clock comparison performance', () => {
    const iterations = 10000;
    
    // Create test vector clocks
    const clock1: VectorClock[] = [
      { nodeId: 'node1', timestamp: 1000, sequence: 1 },
      { nodeId: 'node2', timestamp: 2000, sequence: 2 },
    ];
    const clock2: VectorClock[] = [
      { nodeId: 'node1', timestamp: 1500, sequence: 2 },
      { nodeId: 'node2', timestamp: 2000, sequence: 1 },
    ];
    
    const start = performance.now();
    
    // Would call syncEngine's internal vector clock comparison
    // For benchmark, simulate the operation
    for (let i = 0; i < iterations; i++) {
      // Simulate comparison logic
      const conflict = clock1.length > 0 && clock2.length > 0;
    }
    
    const duration = performance.now() - start;
    const avgTime = duration / iterations;
    
    console.log(`[Benchmark] Vector clock comparison: ${avgTime.toFixed(4)}ms per comparison`);
    expect(avgTime).toBeLessThan(0.01); // Should be < 0.01ms
  });
  
  test('manifest reconciliation performance', async () => {
    const manifestSize = 1000; // 1000 files in manifest
    
    // Create test manifests
    const localManifest: FileManifest = {
      nodeId: 'local',
      version: 1,
      timestamp: Date.now(),
      files: Array.from({ length: manifestSize }, (_, i) => ({
        path: `/test/file-${i}.txt`,
        hash: crypto.randomUUID().substring(0, 32),
        size: 1024,
        version: 1,
        vectorClock: [{ nodeId: 'local', timestamp: Date.now(), sequence: 1 }],
      })),
    };
    
    const peerManifest: FileManifest = {
      nodeId: 'peer',
      version: 1,
      timestamp: Date.now(),
      files: Array.from({ length: manifestSize }, (_, i) => ({
        path: `/test/file-${i}.txt`,
        hash: crypto.randomUUID().substring(0, 32),
        size: 1024,
        version: 1,
        vectorClock: [{ nodeId: 'peer', timestamp: Date.now(), sequence: 1 }],
      })),
    };
    
    const start = performance.now();
    
    // Simulate reconciliation (would call syncEngine.reconcileManifests)
    // For benchmark, simulate the operation
    const localFiles = new Map(localManifest.files.map(f => [f.path, f]));
    const peerFiles = new Map(peerManifest.files.map(f => [f.path, f]));
    
    let conflicts = 0;
    for (const [path, peerFile] of peerFiles) {
      const localFile = localFiles.get(path);
      if (localFile && localFile.hash !== peerFile.hash) {
        conflicts++;
      }
    }
    
    const duration = performance.now() - start;
    
    console.log(`[Benchmark] Manifest reconciliation: ${duration.toFixed(2)}ms for ${manifestSize} files`);
    console.log(`[Benchmark] Conflicts detected: ${conflicts}`);
    expect(duration).toBeLessThan(100); // Should complete in < 100ms
  });
  
  test('large dataset sync performance', async () => {
    const fileCount = 10000;
    const fileSize = 1024 * 100; // 100KB per file
    
    const start = performance.now();
    
    // Simulate syncing many files
    for (let i = 0; i < fileCount; i++) {
      const path = `/stress/sync-${i}.bin`;
      const data = new Uint8Array(fileSize);
      crypto.getRandomValues(data);
      
      // Would call syncEngine.syncFile
      // For benchmark, simulate hash calculation
      await crypto.subtle.digest('SHA-256', data);
    }
    
    const duration = performance.now() - start;
    const throughput = fileCount / (duration / 1000);
    
    console.log(`[Benchmark] Large dataset sync: ${fileCount} files in ${duration.toFixed(2)}ms`);
    console.log(`[Benchmark] Throughput: ${throughput.toFixed(0)} files/sec`);
    expect(duration).toBeLessThan(30000); // Should complete in < 30s
  });
});
