/**
 * Boot Time Benchmarks
 * Measures boot performance for Windows and Android
 * 
 * Target: <1s boot time
 */

import { fastBootManager } from '../../lib/engine/fast-boot';
import { windowsBoot } from '../../lib/nexus/os/windows-boot';
import { androidBootManager } from '../../lib/nexus/os/android-boot';

export interface BootBenchmarkResult {
  osType: 'windows' | 'android';
  coldBootTime: number;
  warmBootTime: number;
  resumeTime: number;
  targetMet: boolean;
}

export class BootTimeBenchmark {
  /**
   * Run Windows boot benchmarks
   */
  async benchmarkWindows(): Promise<BootBenchmarkResult> {
    console.log('[Benchmark] Starting Windows boot benchmarks...');

    const canvas = document.createElement('canvas');
    const container = document.createElement('div');

    // Cold boot
    const coldStart = performance.now();
    await fastBootManager.coldBoot('windows', canvas, container);
    const coldBootTime = performance.now() - coldStart;

    // Cleanup
    await windowsBoot.shutdown();

    // Warm boot
    const warmStart = performance.now();
    await fastBootManager.warmBoot('windows', canvas, container);
    const warmBootTime = performance.now() - warmStart;

    // Cleanup
    await windowsBoot.shutdown();

    // Instant resume
    const resumeStart = performance.now();
    await fastBootManager.instantResume('windows');
    const resumeTime = performance.now() - resumeStart;

    const result: BootBenchmarkResult = {
      osType: 'windows',
      coldBootTime,
      warmBootTime,
      resumeTime,
      targetMet: warmBootTime < 1000,
    };

    console.log('[Benchmark] Windows results:', result);
    return result;
  }

  /**
   * Run Android boot benchmarks
   */
  async benchmarkAndroid(): Promise<BootBenchmarkResult> {
    console.log('[Benchmark] Starting Android boot benchmarks...');

    const container = document.createElement('div');
    const canvas = document.createElement('canvas');

    // Cold boot
    const coldStart = performance.now();
    await fastBootManager.coldBoot('android', canvas, container);
    const coldBootTime = performance.now() - coldStart;

    // Cleanup
    await androidBootManager.shutdown();

    // Warm boot
    const warmStart = performance.now();
    await fastBootManager.warmBoot('android', canvas, container);
    const warmBootTime = performance.now() - warmStart;

    // Cleanup
    await androidBootManager.shutdown();

    // Instant resume
    const resumeStart = performance.now();
    await fastBootManager.instantResume('android');
    const resumeTime = performance.now() - resumeStart;

    const result: BootBenchmarkResult = {
      osType: 'android',
      coldBootTime,
      warmBootTime,
      resumeTime,
      targetMet: warmBootTime < 1000,
    };

    console.log('[Benchmark] Android results:', result);
    return result;
  }

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<BootBenchmarkResult[]> {
    const results = [
      await this.benchmarkWindows(),
      await this.benchmarkAndroid(),
    ];

    this.printReport(results);
    return results;
  }

  /**
   * Print benchmark report
   */
  private printReport(results: BootBenchmarkResult[]): void {
    console.log('\n=== Boot Time Benchmark Report ===');
    
    for (const result of results) {
      console.log(`\n${result.osType.toUpperCase()}:`);
      console.log(`  Cold Boot: ${result.coldBootTime.toFixed(2)}ms`);
      console.log(`  Warm Boot: ${result.warmBootTime.toFixed(2)}ms`);
      console.log(`  Resume:    ${result.resumeTime.toFixed(2)}ms`);
      console.log(`  Target (<1s): ${result.targetMet ? '✓ PASS' : '✗ FAIL'}`);
    }

    console.log('\n=====================================\n');
  }
}

export const bootTimeBenchmark = new BootTimeBenchmark();
