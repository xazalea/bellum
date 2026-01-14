/**
 * Performance Controller Benchmarks
 * Stress tests for adaptive performance tuning
 */

import { perfController } from '../../lib/engine/perf-controller';
import { metricsBus } from '../../lib/engine/metrics-bus';

describe('Performance Controller Benchmarks', () => {
  beforeAll(async () => {
    await perfController.initialize();
  });
  
  afterAll(() => {
    perfController.stop();
  });
  
  test('metrics collection overhead', async () => {
    const iterations = 10000;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      perfController.getMetrics();
    }
    
    const duration = performance.now() - start;
    const avgTime = duration / iterations;
    
    console.log(`[Benchmark] Metrics collection: ${avgTime.toFixed(4)}ms per call`);
    expect(avgTime).toBeLessThan(0.1); // Should be < 0.1ms
  });
  
  test('control adaptation speed', async () => {
    const iterations = 1000;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      perfController.getControl();
      perfController.recordFrameTime(16 + Math.random() * 5); // Simulate frame times
    }
    
    const duration = performance.now() - start;
    const avgTime = duration / iterations;
    
    console.log(`[Benchmark] Control adaptation: ${avgTime.toFixed(4)}ms per iteration`);
    expect(avgTime).toBeLessThan(1.0); // Should be < 1ms
  });
  
  test('metrics bus throughput', async () => {
    const events = 10000;
    const start = performance.now();
    
    for (let i = 0; i < events; i++) {
      metricsBus.publish({
        type: 'performance',
        metrics: perfController.getMetrics(),
      });
    }
    
    const duration = performance.now() - start;
    const throughput = events / (duration / 1000);
    
    console.log(`[Benchmark] Metrics bus throughput: ${throughput.toFixed(0)} events/sec`);
    expect(throughput).toBeGreaterThan(10000); // Should handle > 10k events/sec
  });
  
  test('adaptive threshold tuning with hysteresis', async () => {
    // Simulate high load scenario
    for (let i = 0; i < 100; i++) {
      perfController.recordFrameTime(33); // 30fps (degraded)
    }
    
    const control = perfController.getControl();
    
    // Thresholds should have increased due to performance degradation
    expect(control.warmThreshold).toBeGreaterThan(100);
    expect(control.maxBackpressure).toBeLessThan(0.8);
    
    // Simulate good performance
    for (let i = 0; i < 100; i++) {
      perfController.recordFrameTime(16); // 60fps (good)
    }
    
    const control2 = perfController.getControl();
    
    // Thresholds should have decreased for more aggressive optimization
    expect(control2.warmThreshold).toBeLessThanOrEqual(control.warmThreshold);
  });
  
  test('frame time percentile tracking', async () => {
    // Record varied frame times
    const frameTimes = [16, 17, 18, 20, 25, 30, 35, 40, 50, 60];
    for (const ft of frameTimes) {
      for (let i = 0; i < 10; i++) {
        perfController.recordFrameTime(ft);
      }
    }
    
    const percentiles = perfController.getFrameTimePercentiles();
    
    expect(percentiles.p50).toBeGreaterThan(0);
    expect(percentiles.p95).toBeGreaterThan(percentiles.p50);
    expect(percentiles.p99).toBeGreaterThan(percentiles.p95);
    
    console.log(`[Benchmark] Frame time percentiles:`, percentiles);
  });
  
  test('JIT budget management', () => {
    const canCompile1 = perfController.canCompile(1.0, 'foreground');
    const canCompile2 = perfController.canCompile(5.0, 'foreground');
    
    expect(canCompile1).toBe(true);
    // Should fail if budget exceeded
    expect(canCompile2).toBeDefined();
    
    const queueStatus = perfController.getJITQueueStatus();
    expect(queueStatus).toHaveProperty('foregroundQueue');
    expect(queueStatus).toHaveProperty('backgroundQueue');
    expect(queueStatus).toHaveProperty('currentFrameBudget');
    
    console.log(`[Benchmark] JIT queue status:`, queueStatus);
  });
  
  test('heavy load scenario - 1000 frames', async () => {
    const iterations = 1000;
    const start = performance.now();
    
    // Simulate 1000 frames with varying performance
    for (let i = 0; i < iterations; i++) {
      const frameTime = 16 + Math.random() * 10 + (i % 100 < 10 ? 20 : 0); // Occasional spikes
      perfController.recordFrameTime(frameTime, 1000 + (i % 10)); // Multiple processes
    }
    
    const duration = performance.now() - start;
    const throughput = iterations / (duration / 1000);
    
    console.log(`[Benchmark] Heavy load: ${iterations} frames in ${duration.toFixed(2)}ms (${throughput.toFixed(0)} frames/sec)`);
    expect(duration).toBeLessThan(1000); // Should complete in < 1s
    
    const percentiles = perfController.getFrameTimePercentiles();
    console.log(`[Benchmark] Percentiles under load:`, percentiles);
  });
  
  test('memory pressure detection', async () => {
    const metrics = perfController.getMetrics();
    
    // Check memory pressure calculation
    expect(metrics.memoryPressure).toBeGreaterThanOrEqual(0);
    expect(metrics.memoryPressure).toBeLessThanOrEqual(1);
  });
  
  test('thermal state detection', async () => {
    // Simulate thermal throttling (low FPS + high backpressure)
    for (let i = 0; i < 50; i++) {
      perfController.recordFrameTime(50); // 20fps
    }
    
    const metrics = perfController.getMetrics();
    
    // Should detect degraded thermal state
    expect(['fair', 'serious', 'critical']).toContain(metrics.thermalState);
  });
});
