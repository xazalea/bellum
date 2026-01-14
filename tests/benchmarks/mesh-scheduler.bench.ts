/**
 * Mesh Scheduler Benchmarks
 * Stress tests for P2P task routing and scheduling
 */

import { meshScheduler } from '../../lib/fabric/mesh-scheduler';
import { remoteExecution } from '../../lib/fabric/remote-execution';
import type { ComputeJob } from '../../lib/fabric/compute';

describe('Mesh Scheduler Benchmarks', () => {
  beforeAll(() => {
    // Initialize scheduler
  });
  
  afterAll(() => {
    meshScheduler.shutdown();
  });
  
  test('peer selection performance', async () => {
    const jobs: ComputeJob[] = [];
    
    // Create 1000 jobs
    for (let i = 0; i < 1000; i++) {
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
    
    // Schedule all jobs (will fail without peers, but tests routing logic)
    const results = await Promise.allSettled(
      jobs.map(job => meshScheduler.scheduleJob(job, 'balanced'))
    );
    
    const duration = performance.now() - start;
    const avgTime = duration / jobs.length;
    
    console.log(`[Benchmark] Peer selection: ${avgTime.toFixed(4)}ms per job`);
    expect(avgTime).toBeLessThan(10); // Should be < 10ms per job
  });
  
  test('routing strategy comparison', async () => {
    const job: ComputeJob = {
      id: crypto.randomUUID(),
      type: 'COMPILE_CHUNK',
      payload: {
        code: new Uint8Array(1024 * 1024), // 1MB
        arch: 'x86',
      },
      priority: 0.8,
    };
    
    const strategies = ['latency', 'bandwidth', 'capacity', 'balanced'];
    const results: Record<string, number> = {};
    
    for (const strategy of strategies) {
      const start = performance.now();
      await meshScheduler.scheduleJob(job, strategy).catch(() => {});
      const duration = performance.now() - start;
      results[strategy] = duration;
    }
    
    console.log('[Benchmark] Routing strategy timings:', results);
    
    // Balanced should be reasonable
    expect(results['balanced']).toBeLessThan(100);
  });
  
  test('concurrent job scheduling', async () => {
    const concurrentJobs = 100;
    const jobs: ComputeJob[] = [];
    
    for (let i = 0; i < concurrentJobs; i++) {
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
    
    await Promise.allSettled(
      jobs.map(job => meshScheduler.scheduleJob(job))
    );
    
    const duration = performance.now() - start;
    
    console.log(`[Benchmark] Concurrent scheduling: ${duration.toFixed(2)}ms for ${concurrentJobs} jobs`);
    expect(duration).toBeLessThan(5000); // Should complete in < 5s
  });
  
  test('remote execution statistics', () => {
    const stats = remoteExecution.getStatistics();
    
    expect(stats).toHaveProperty('totalJobs');
    expect(stats).toHaveProperty('successfulJobs');
    expect(stats).toHaveProperty('failedJobs');
    expect(stats).toHaveProperty('avgDuration');
    
    console.log('[Benchmark] Remote execution stats:', stats);
  });
  
  test('capability heartbeat overhead', () => {
    const iterations = 1000;
    const start = performance.now();
    
    // Simulate capability updates
    for (let i = 0; i < iterations; i++) {
      const peers = meshScheduler.getPeerCapabilities();
      // Just accessing should be fast
    }
    
    const duration = performance.now() - start;
    const avgTime = duration / iterations;
    
    console.log(`[Benchmark] Capability access: ${avgTime.toFixed(4)}ms per access`);
    expect(avgTime).toBeLessThan(0.1); // Should be < 0.1ms
  });
  
  test('peer scoring performance', async () => {
    const job: ComputeJob = {
      id: crypto.randomUUID(),
      type: 'COMPILE_CHUNK',
      payload: {
        code: new Uint8Array(1024),
        arch: 'x86',
      },
      priority: 0.8,
    };
    
    const iterations = 100;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await meshScheduler.scheduleJob(job, 'scored').catch(() => {});
    }
    
    const duration = performance.now() - start;
    const avgTime = duration / iterations;
    
    console.log(`[Benchmark] Peer scoring: ${avgTime.toFixed(4)}ms per job`);
    expect(avgTime).toBeLessThan(50); // Should be < 50ms
  });
  
  test('batch processing throughput', async () => {
    const batchSize = 100;
    const jobs: ComputeJob[] = [];
    
    for (let i = 0; i < batchSize; i++) {
      jobs.push({
        id: crypto.randomUUID(),
        type: 'COMPILE_CHUNK',
        payload: {
          code: new Uint8Array(1024),
          arch: 'x86',
        },
        priority: 0.3, // Low priority for batching
      });
    }
    
    const start = performance.now();
    
    // Schedule all as batch
    await Promise.allSettled(
      jobs.map(job => meshScheduler.scheduleJob(job, 'balanced', undefined, { batch: true }))
    );
    
    const duration = performance.now() - start;
    const throughput = batchSize / (duration / 1000);
    
    console.log(`[Benchmark] Batch throughput: ${throughput.toFixed(0)} jobs/sec`);
    expect(throughput).toBeGreaterThan(100); // Should handle > 100 jobs/sec
  });
  
  test('heavy load - 10000 concurrent jobs', async () => {
    const jobCount = 10000;
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
    
    const results = await Promise.allSettled(
      jobs.map(job => meshScheduler.scheduleJob(job, 'scored'))
    );
    
    const duration = performance.now() - start;
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const successRate = (successCount / jobCount) * 100;
    
    console.log(`[Benchmark] Heavy load: ${jobCount} jobs in ${duration.toFixed(2)}ms`);
    console.log(`[Benchmark] Success rate: ${successRate.toFixed(1)}%`);
    
    expect(duration).toBeLessThan(60000); // Should complete in < 60s
  });
});
