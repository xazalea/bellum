/**
 * Metrics Bus
 * Central event bus for performance and system metrics
 * 
 * Provides pub/sub for metrics updates across the system
 */

import type { PerformanceMetrics, PerformanceControl } from './perf-controller';
import type { ScheduledTask } from '../fabric/mesh-scheduler';
import type { RemoteExecutionResult } from '../fabric/remote-execution';
import type { SyncOperation } from './sync-engine';

export type MetricsEvent =
  | { type: 'performance'; metrics: PerformanceMetrics }
  | { type: 'control'; control: PerformanceControl }
  | { type: 'mesh_task'; task: ScheduledTask }
  | { type: 'remote_execution'; result: RemoteExecutionResult }
  | { type: 'sync_operation'; operation: SyncOperation }
  | { type: 'system_health'; health: SystemHealth };

export interface SystemHealth {
  runtime: 'healthy' | 'degraded' | 'critical';
  mesh: 'connected' | 'disconnected' | 'degraded';
  storage: 'healthy' | 'full' | 'error';
  sync: 'synced' | 'syncing' | 'error';
  overall: 'healthy' | 'degraded' | 'critical';
}

type MetricsCallback = (event: MetricsEvent) => void;

/**
 * Metrics Bus
 * Central pub/sub for metrics
 */
export class MetricsBus {
  private static instance: MetricsBus;
  
  private subscribers: Set<MetricsCallback> = new Set();
  private eventHistory: MetricsEvent[] = [];
  private readonly MAX_HISTORY = 1000;
  
  private constructor() {}
  
  public static getInstance(): MetricsBus {
    if (!MetricsBus.instance) {
      MetricsBus.instance = new MetricsBus();
    }
    return MetricsBus.instance;
  }
  
  /**
   * Publish metrics event
   */
  publish(event: MetricsEvent): void {
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.shift();
    }
    
    // Notify subscribers
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch (error) {
        console.error('[MetricsBus] Subscriber error:', error);
      }
    }
  }
  
  /**
   * Subscribe to metrics events
   */
  subscribe(callback: MetricsCallback): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  /**
   * Subscribe to specific event type
   */
  subscribeToType<T extends MetricsEvent['type']>(
    type: T,
    callback: (event: Extract<MetricsEvent, { type: T }>) => void
  ): () => void {
    const wrapper: MetricsCallback = (event) => {
      if (event.type === type) {
        callback(event as Extract<MetricsEvent, { type: T }>);
      }
    };
    
    return this.subscribe(wrapper);
  }
  
  /**
   * Get event history
   */
  getHistory(filter?: (event: MetricsEvent) => boolean): MetricsEvent[] {
    if (filter) {
      return this.eventHistory.filter(filter);
    }
    return [...this.eventHistory];
  }
  
  /**
   * Clear history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

// Export singleton
export const metricsBus = MetricsBus.getInstance();
