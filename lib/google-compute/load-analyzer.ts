/**
 * Load Analyzer
 * Analyze cluster load to make offload decisions
 */

import type { ClusterMetrics } from './routing-strategy';

export interface LoadSample {
  timestamp: number;
  utilizationPercent: number;
  activeNodes: number;
  queueLength: number;
  averageLatency: number;
}

export interface LoadTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number;
  confidence: number;
}

export class LoadAnalyzer {
  private samples: LoadSample[] = [];
  private maxSamples: number = 100;
  private sampleInterval: number = 1000; // 1 second

  /**
   * Add a load sample
   */
  addSample(metrics: ClusterMetrics): void {
    const sample: LoadSample = {
      timestamp: Date.now(),
      utilizationPercent: metrics.utilizationPercent,
      activeNodes: metrics.activeNodes,
      queueLength: metrics.queueLength,
      averageLatency: metrics.averageLatency,
    };

    this.samples.push(sample);

    // Keep only recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * Get current load metrics
   */
  getCurrentLoad(): ClusterMetrics | null {
    if (this.samples.length === 0) {
      return null;
    }

    const latest = this.samples[this.samples.length - 1];

    return {
      totalNodes: latest.activeNodes,
      activeNodes: latest.activeNodes,
      utilizationPercent: latest.utilizationPercent,
      averageLatency: latest.averageLatency,
      queueLength: latest.queueLength,
    };
  }

  /**
   * Analyze load trend
   */
  analyzeTrend(timeWindowMs: number = 30000): LoadTrend {
    const now = Date.now();
    const recentSamples = this.samples.filter(
      (s) => now - s.timestamp < timeWindowMs
    );

    if (recentSamples.length < 3) {
      return {
        direction: 'stable',
        rate: 0,
        confidence: 0.3,
      };
    }

    // Calculate linear regression
    const n = recentSamples.length;
    const sumX = recentSamples.reduce((sum, s, i) => sum + i, 0);
    const sumY = recentSamples.reduce((sum, s) => sum + s.utilizationPercent, 0);
    const sumXY = recentSamples.reduce(
      (sum, s, i) => sum + i * s.utilizationPercent,
      0
    );
    const sumX2 = recentSamples.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Determine direction
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.1) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    // Calculate confidence based on sample size and consistency
    const confidence = Math.min(n / 30, 1.0) * 0.8 + 0.2;

    return {
      direction,
      rate: slope,
      confidence,
    };
  }

  /**
   * Predict future load
   */
  predictLoad(secondsAhead: number): number {
    const trend = this.analyzeTrend();
    const current = this.getCurrentLoad();

    if (!current) {
      return 50; // Default assumption
    }

    if (trend.direction === 'stable') {
      return current.utilizationPercent;
    }

    // Project based on trend
    const prediction =
      current.utilizationPercent + trend.rate * secondsAhead * trend.confidence;

    return Math.max(0, Math.min(100, prediction));
  }

  /**
   * Check if offload is recommended
   */
  shouldOffload(threshold: number): boolean {
    const current = this.getCurrentLoad();
    if (!current) {
      return false;
    }

    // Current load exceeds threshold
    if (current.utilizationPercent > threshold * 100) {
      return true;
    }

    // Predict load in next 10 seconds
    const predicted = this.predictLoad(10);
    if (predicted > threshold * 100) {
      return true;
    }

    return false;
  }

  /**
   * Get load statistics
   */
  getStatistics(timeWindowMs: number = 60000): {
    min: number;
    max: number;
    average: number;
    current: number;
  } {
    const now = Date.now();
    const recentSamples = this.samples.filter(
      (s) => now - s.timestamp < timeWindowMs
    );

    if (recentSamples.length === 0) {
      return { min: 0, max: 0, average: 0, current: 0 };
    }

    const values = recentSamples.map((s) => s.utilizationPercent);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const current = values[values.length - 1];

    return { min, max, average, current };
  }

  /**
   * Clear samples
   */
  clear(): void {
    this.samples = [];
  }

  /**
   * Get sample count
   */
  getSampleCount(): number {
    return this.samples.length;
  }
}

// Singleton instance
let instance: LoadAnalyzer | null = null;

export function getLoadAnalyzer(): LoadAnalyzer {
  if (!instance) {
    instance = new LoadAnalyzer();
  }
  return instance;
}
