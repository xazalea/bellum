/**
 * Google Compute Metrics
 * Track and monitor Google compute usage and performance
 */

import type { GoogleComputeMetrics, TaskResult } from './types';

export interface MetricsSnapshot {
  timestamp: number;
  metrics: GoogleComputeMetrics;
}

export interface PerformanceData {
  provider: 'google' | 'cluster';
  executionTime: number;
  success: boolean;
  timestamp: number;
}

export class MetricsCollector {
  private metrics: GoogleComputeMetrics = {
    tasksRouted: 0,
    tasksSucceeded: 0,
    tasksFailed: 0,
    averageExecutionTime: 0,
    rateLimitIncidents: 0,
    costSavings: 0,
    timestamp: Date.now(),
  };

  private performanceHistory: PerformanceData[] = [];
  private maxHistorySize: number = 1000;
  private snapshots: MetricsSnapshot[] = [];
  private maxSnapshots: number = 100;

  /**
   * Record task result
   */
  recordTaskResult(result: TaskResult): void {
    this.metrics.tasksRouted++;

    if (result.success) {
      this.metrics.tasksSucceeded++;
    } else {
      this.metrics.tasksFailed++;
    }

    // Update average execution time
    const totalTasks = this.metrics.tasksSucceeded + this.metrics.tasksFailed;
    this.metrics.averageExecutionTime =
      (this.metrics.averageExecutionTime * (totalTasks - 1) + result.executionTime) /
      totalTasks;

    // Record performance data
    this.performanceHistory.push({
      provider: result.provider,
      executionTime: result.executionTime,
      success: result.success,
      timestamp: Date.now(),
    });

    // Trim history
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }

    // Calculate cost savings (estimate)
    if (result.provider === 'google' && result.success) {
      // Assume $0.10 per CPU hour, task execution time in ms
      const cpuHours = result.executionTime / (1000 * 60 * 60);
      const estimatedCost = cpuHours * 0.1;
      this.metrics.costSavings += estimatedCost;
    }

    this.metrics.timestamp = Date.now();
  }

  /**
   * Record rate limit incident
   */
  recordRateLimitIncident(): void {
    this.metrics.rateLimitIncidents++;
    this.metrics.timestamp = Date.now();
  }

  /**
   * Get current metrics
   */
  getMetrics(): GoogleComputeMetrics {
    return { ...this.metrics };
  }

  /**
   * Take snapshot of current metrics
   */
  takeSnapshot(): void {
    const snapshot: MetricsSnapshot = {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
    };

    this.snapshots.push(snapshot);

    // Trim snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  /**
   * Get snapshots
   */
  getSnapshots(): MetricsSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): PerformanceData[] {
    return [...this.performanceHistory];
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    const total = this.metrics.tasksSucceeded + this.metrics.tasksFailed;
    if (total === 0) return 0;
    return this.metrics.tasksSucceeded / total;
  }

  /**
   * Get average execution time by provider
   */
  getAverageExecutionTimeByProvider(): {
    google: number;
    cluster: number;
  } {
    const googleTasks = this.performanceHistory.filter((p) => p.provider === 'google');
    const clusterTasks = this.performanceHistory.filter(
      (p) => p.provider === 'cluster'
    );

    const googleAvg =
      googleTasks.length > 0
        ? googleTasks.reduce((sum, p) => sum + p.executionTime, 0) /
          googleTasks.length
        : 0;

    const clusterAvg =
      clusterTasks.length > 0
        ? clusterTasks.reduce((sum, p) => sum + p.executionTime, 0) /
          clusterTasks.length
        : 0;

    return {
      google: googleAvg,
      cluster: clusterAvg,
    };
  }

  /**
   * Get task distribution
   */
  getTaskDistribution(): {
    google: number;
    cluster: number;
  } {
    const googleTasks = this.performanceHistory.filter(
      (p) => p.provider === 'google'
    ).length;
    const clusterTasks = this.performanceHistory.filter(
      (p) => p.provider === 'cluster'
    ).length;

    return {
      google: googleTasks,
      cluster: clusterTasks,
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      tasksRouted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      rateLimitIncidents: 0,
      costSavings: 0,
      timestamp: Date.now(),
    };
    this.performanceHistory = [];
    this.snapshots = [];
  }

  /**
   * Export metrics data
   */
  exportData(): {
    metrics: GoogleComputeMetrics;
    history: PerformanceData[];
    snapshots: MetricsSnapshot[];
  } {
    return {
      metrics: this.getMetrics(),
      history: this.getPerformanceHistory(),
      snapshots: this.getSnapshots(),
    };
  }
}

// Singleton instance
let instance: MetricsCollector | null = null;

export function getMetricsCollector(): MetricsCollector {
  if (!instance) {
    instance = new MetricsCollector();
  }
  return instance;
}
