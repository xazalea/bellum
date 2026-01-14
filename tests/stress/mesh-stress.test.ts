/**
 * Mesh Stress Tests
 * High-load scenarios for P2P compute mesh
 */

import { meshScheduler } from '../../lib/fabric/mesh-scheduler';
import { remoteExecution } from '../../lib/fabric/remote-execution';
import type { ComputeJob } from '../../lib/fabric/compute';

describe('Mesh Stress Tests', () => {
  beforeEach(() => {
    // Reset state
  });
  
  afterAll(() => {
    meshScheduler.shutdown();
  });
  
  test('high concurrent job load', async () => {
    const jobCount = 1000;
    const jobs: ComputeJob[] = [];
    
    // Create large batch of jobs
    for (let i = 0; i < jobCount; i++) {
      jobs.push({
        id: crypto.randomUUID(),
        type: 'COMPILE_CHUNK',
        payload: {
          code: new Uint8Array(1024 * 10), // 10KB per job
          arch: 'x86',
        },
        priority: Math.random(),
        deadline: Date.now() + 60000, // 1 minute deadline
      });
    }
    
    const start = performance.now();
    
    // Schedule all jobs concurrently
    const results = await Promise.allSettled(
      jobs.map(job => meshScheduler.scheduleJob(job))
    );
    
    const duration = performance.now() - start;
    
    console.log(`[Stress] Scheduled ${jobCount} jobs in ${duration.toFixed(2)}ms`);
    console.log(`[Stress] Success rate: ${results.filter(r => r.status === 'fulfilled').length / jobCount * 100}%`);
    
    // Should handle load gracefully
    expect(duration).toBeLessThan(30000); // Complete in < 30s
  });
  
  test('rapid peer capability updates', () => {
    const updates = 10000;
    const start = performance.now();
    
    // Simulate rapid capability updates
    for (let i = 0; i < updates; i++) {
      const peers = meshScheduler.getPeerCapabilities();
      // Access triggers internal updates
    }
    
    const duration = performance.now() - start;
    const throughput = updates / (duration / 1000);
    
    console.log(`[Stress] Capability update throughput: ${throughput.toFixed(0)} updates/sec`);
    expect(throughput).toBeGreaterThan(10000); // Should handle > 10k updates/sec
  });
  
  test('memory pressure with many scheduled tasks', () => {
    const taskCount = 10000;
    
    // Create many tasks (will fail without peers, but tests memory)
    for (let i = 0; i < taskCount; i++) {
      const job: ComputeJob = {
        id: crypto.randomUUID(),
        type: 'COMPILE_CHUNK',
        payload: {
          code: new Uint8Array(1024),
          arch: 'x86',
        },
        priority: Math.random(),
      };
      
      meshScheduler.scheduleJob(job).catch(() => {});
    }
    
    const tasks = meshScheduler.getScheduledTasks();
    
    console.log(`[Stress] Tracked ${tasks.length} tasks`);
    
    // Should not crash or leak memory excessively
    expect(tasks.length).toBeLessThanOrEqual(taskCount);
  });
  
  test('remote execution retry storm', async () => {
    const job: ComputeJob = {
      id: crypto.randomUUID(),
      type: 'COMPILE_CHUNK',
      payload: {
        code: new Uint8Array(1024),
        arch: 'x86',
      },
      priority: 0.9,
    };
    
    // Job will fail (no peers), but should handle retries gracefully
    const start = performance.now();
    
    try {
      await remoteExecution.executeJob(job, true); // With local fallback
    } catch {
      // Expected
    }
    
    const duration = performance.now() - start;
    
    console.log(`[Stress] Retry handling: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(5000); // Should timeout/fallback quickly
  });
  
  test('extreme load - 50000 jobs', async () => {
    const jobCount = 50000;
    const jobs: ComputeJob[] = [];
    
    for (let i = 0; i < jobCount; i++) {
      jobs.push({
        id: crypto.randomUUID(),
        type: 'COMPILE_CHUNK',
        payload: {
          code: new Uint8Array(1024),
          arch: 'x86',
        },
        priority: Math.random(),
      });
    }
    
    const start = performance.now();
    
    // Schedule in batches to avoid overwhelming
    const batchSize = 1000;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(job => meshScheduler.scheduleJob(job, 'scored'))
      );
    }
    
    const duration = performance.now() - start;
    const throughput = jobCount / (duration / 1000);
    
    console.log(`[Stress] Extreme load: ${jobCount} jobs in ${duration.toFixed(2)}ms`);
    console.log(`[Stress] Throughput: ${throughput.toFixed(0)} jobs/sec`);
    expect(duration).toBeLessThan(300000); // Should complete in < 5 minutes
  });
});
