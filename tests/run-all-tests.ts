/**
 * Main Test Runner
 * Executes all benchmarks and integration tests
 */

import { bootTimeBenchmark } from './benchmarks/boot-time.bench';
import { windowsAppTests } from './integration/windows-apps.test';
import { androidAppTests } from './integration/android-apps.test';

export class TestRunner {
  async runAll(): Promise<void> {
    console.log('\n🚀 Starting Complete Test Suite...\n');
    console.log('=====================================');

    try {
      // Boot time benchmarks
      console.log('\n📊 Running Boot Time Benchmarks...');
      await bootTimeBenchmark.runAll();

      // Windows app tests
      console.log('\n🪟 Running Windows App Tests...');
      await windowsAppTests.runAll();

      // Android app tests
      console.log('\n🤖 Running Android App Tests...');
      await androidAppTests.runAll();

      console.log('\n✅ All tests completed!\n');
    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
      throw error;
    }
  }
}

export const testRunner = new TestRunner();

// Run if executed directly
if (typeof window !== 'undefined') {
  (window as any).runAllTests = () => testRunner.runAll();
  console.log('💡 Run tests with: runAllTests()');
}
