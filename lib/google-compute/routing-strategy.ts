/**
 * Routing Strategy
 * Intelligent routing logic to decide when to offload to Google vs use cluster
 */

import type { ComputeTask, ComputeCapacity } from './types';

export interface RoutingDecision {
  provider: 'google' | 'cluster';
  reason: string;
  confidence: number;
}

export interface ClusterMetrics {
  totalNodes: number;
  activeNodes: number;
  utilizationPercent: number;
  averageLatency: number;
  queueLength: number;
}

export interface RoutingConfig {
  googleOffloadThreshold: number;
  clusterPreferredThreshold: number;
  latencySensitivityMs: number;
  enableGoogleFallback: boolean;
}

export class RoutingStrategy {
  private config: RoutingConfig;

  constructor(config: Partial<RoutingConfig> = {}) {
    this.config = {
      googleOffloadThreshold: config.googleOffloadThreshold ?? 0.7,
      clusterPreferredThreshold: config.clusterPreferredThreshold ?? 0.5,
      latencySensitivityMs: config.latencySensitivityMs ?? 100,
      enableGoogleFallback: config.enableGoogleFallback ?? true,
    };
  }

  /**
   * Decide where to route a task
   */
  routeTask(
    task: ComputeTask,
    clusterMetrics: ClusterMetrics,
    googleCapacity: ComputeCapacity
  ): RoutingDecision {
    // Priority 1: Check if Google can handle the task type
    if (!this._isGoogleSuitable(task)) {
      return {
        provider: 'cluster',
        reason: 'Task type not suitable for Google compute',
        confidence: 1.0,
      };
    }

    // Priority 2: Check latency requirements
    if (this._isLatencyCritical(task)) {
      return {
        provider: 'cluster',
        reason: 'Task requires low latency',
        confidence: 0.9,
      };
    }

    // Priority 3: Check Google availability
    if (!googleCapacity.available) {
      return {
        provider: 'cluster',
        reason: googleCapacity.rateLimited
          ? 'Google rate limited'
          : 'Google compute unavailable',
        confidence: 1.0,
      };
    }

    // Priority 4: Check cluster load
    const utilization = clusterMetrics.utilizationPercent / 100;

    if (utilization > this.config.googleOffloadThreshold) {
      return {
        provider: 'google',
        reason: `Cluster utilization high (${(utilization * 100).toFixed(1)}%)`,
        confidence: 0.8 + (utilization - this.config.googleOffloadThreshold) * 0.2,
      };
    }

    if (utilization < this.config.clusterPreferredThreshold) {
      return {
        provider: 'cluster',
        reason: `Cluster has capacity (${(utilization * 100).toFixed(1)}% used)`,
        confidence: 0.8,
      };
    }

    // Priority 5: Balanced decision based on multiple factors
    const score = this._calculateRoutingScore(task, clusterMetrics, googleCapacity);

    if (score > 0) {
      return {
        provider: 'google',
        reason: 'Routing score favors Google compute',
        confidence: Math.min(0.5 + score * 0.5, 0.95),
      };
    } else {
      return {
        provider: 'cluster',
        reason: 'Routing score favors cluster',
        confidence: Math.min(0.5 + Math.abs(score) * 0.5, 0.95),
      };
    }
  }

  /**
   * Check if task is suitable for Google compute
   */
  private _isGoogleSuitable(task: ComputeTask): boolean {
    // Only web-based tasks can run on Google
    const suitableTypes = ['web-app', 'javascript', 'rendering'];
    return suitableTypes.includes(task.type);
  }

  /**
   * Check if task is latency-critical
   */
  private _isLatencyCritical(task: ComputeTask): boolean {
    if (task.metadata?.latencyRequirement) {
      const required = task.metadata.latencyRequirement as number;
      return required < this.config.latencySensitivityMs;
    }
    return false;
  }

  /**
   * Calculate routing score (-1 to 1)
   * Positive = prefer Google, Negative = prefer cluster
   */
  private _calculateRoutingScore(
    task: ComputeTask,
    clusterMetrics: ClusterMetrics,
    googleCapacity: ComputeCapacity
  ): number {
    let score = 0;

    // Factor 1: Cluster load (weight: 0.4)
    const clusterLoadScore =
      (clusterMetrics.utilizationPercent / 100 - this.config.googleOffloadThreshold) * 2;
    score += clusterLoadScore * 0.4;

    // Factor 2: Task priority (weight: 0.2)
    if (task.priority > 5) {
      score -= 0.2; // High priority -> prefer cluster
    } else if (task.priority < 3) {
      score += 0.2; // Low priority -> prefer Google
    }

    // Factor 3: Google capacity (weight: 0.2)
    const googleUtilization = googleCapacity.utilizationPercent / 100;
    const googleCapacityScore = 1 - googleUtilization;
    score += googleCapacityScore * 0.2;

    // Factor 4: Cluster queue (weight: 0.2)
    if (clusterMetrics.queueLength > 10) {
      score += 0.2;
    } else if (clusterMetrics.queueLength === 0) {
      score -= 0.2;
    }

    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RoutingConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): RoutingConfig {
    return { ...this.config };
  }
}

// Singleton instance
let instance: RoutingStrategy | null = null;

export function getRoutingStrategy(config?: Partial<RoutingConfig>): RoutingStrategy {
  if (!instance) {
    instance = new RoutingStrategy(config);
  }
  return instance;
}
