/**
 * Comprehensive Metrics Collector
 * Collects and aggregates performance metrics for observability
 */

import { performanceMonitor, PerformanceStats } from './monitor';

export interface ExecutionMetrics {
  fps: number;
  frameTimeMs: number;
  jitTimeMs: number;
  instructionCount: number;
  compileTimeMs: number;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  gcPauseMs: number;
  externalMemory: number;
}

export interface NetworkMetrics {
  latencyMs: number;
  bandwidthBps: number;
  cacheHitRate: number;
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
}

export interface MeshMetrics {
  peerCount: number;
  avgRttMs: number;
  offloadQueueSize: number;
  offloadSuccessRate: number;
  bytesTransferred: number;
  activeTasks: number;
}

export interface CacheMetrics {
  l1HitRate: number;
  l2HitRate: number;
  l3HitRate: number;
  totalHits: number;
  totalMisses: number;
  evictions: number;
  sizeBytes: number;
}

export interface PerformanceMetricsSnapshot {
  timestamp: number;
  execution: ExecutionMetrics;
  memory: MemoryMetrics;
  network: NetworkMetrics;
  mesh: MeshMetrics;
  cache: CacheMetrics;
  tier: string;
  sessionId: string;
}

export interface MetricsAlert {
  type: 'fps_low' | 'memory_high' | 'network_slow' | 'mesh_unstable' | 'cache_thrashing';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export type MetricsEventType = 'metrics' | 'alert' | 'tier_change';
export type MetricsCallback = (event: MetricsEventType, data: any) => void;

// Thresholds for alerts
const ALERT_THRESHOLDS = {
  fps_low_warning: 30,
  fps_low_critical: 20,
  memory_high_warning: 0.85, // 85% of budget
  memory_high_critical: 0.95,
  network_slow_warning: 500, // ms
  network_slow_critical: 1000,
  mesh_unstable_warning: 0.7, // 70% success rate
  mesh_unstable_critical: 0.5,
};

class MetricsCollector {
  private sessionId: string;
  private collectionInterval: number | null = null;
  private callbacks: Set<MetricsCallback> = new Set();
  
  // Current metrics
  private execution: ExecutionMetrics = this.defaultExecutionMetrics();
  private memory: MemoryMetrics = this.defaultMemoryMetrics();
  private network: NetworkMetrics = this.defaultNetworkMetrics();
  private mesh: MeshMetrics = this.defaultMeshMetrics();
  private cache: CacheMetrics = this.defaultCacheMetrics();
  
  // History for analysis
  private history: PerformanceMetricsSnapshot[] = [];
  private maxHistorySize = 3600; // 1 hour at 1-second intervals
  
  // Alert tracking
  private activeAlerts: Map<string, MetricsAlert> = new Map();
  private alertCooldowns: Map<string, number> = new Map();
  
  // Network tracking
  private networkRequests: Array<{ start: number; end?: number; error?: boolean }> = [];
  private pendingRequests: Map<string, { start: number }> = new Map();
  
  // GC tracking
  private lastGCTime = 0;
  private gcPauseAccumulator = 0;
  
  // Tier tracking
  private currentTier: string = 'tier2';

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private defaultExecutionMetrics(): ExecutionMetrics {
    return {
      fps: 60,
      frameTimeMs: 16.67,
      jitTimeMs: 0,
      instructionCount: 0,
      compileTimeMs: 0,
    };
  }

  private defaultMemoryMetrics(): MemoryMetrics {
    return {
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 2 * 1024 * 1024 * 1024, // 2GB default
      gcPauseMs: 0,
      externalMemory: 0,
    };
  }

  private defaultNetworkMetrics(): NetworkMetrics {
    return {
      latencyMs: 0,
      bandwidthBps: 0,
      cacheHitRate: 1,
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
    };
  }

  private defaultMeshMetrics(): MeshMetrics {
    return {
      peerCount: 0,
      avgRttMs: 0,
      offloadQueueSize: 0,
      offloadSuccessRate: 1,
      bytesTransferred: 0,
      activeTasks: 0,
    };
  }

  private defaultCacheMetrics(): CacheMetrics {
    return {
      l1HitRate: 0,
      l2HitRate: 0,
      l3HitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      evictions: 0,
      sizeBytes: 0,
    };
  }

  /**
   * Start collecting metrics at specified interval
   */
  startCollection(intervalMs: number = 1000): void {
    if (this.collectionInterval !== null) {
      this.stopCollection();
    }

    this.collectionInterval = window.setInterval(() => {
      this.collect();
    }, intervalMs);

    // Collect immediately
    this.collect();
  }

  /**
   * Stop collecting metrics
   */
  stopCollection(): void {
    if (this.collectionInterval !== null) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  /**
   * Collect a snapshot of all metrics
   */
  private collect(): void {
    this.collectExecutionMetrics();
    this.collectMemoryMetrics();
    this.collectNetworkMetrics();

    const snapshot: PerformanceMetricsSnapshot = {
      timestamp: Date.now(),
      execution: { ...this.execution },
      memory: { ...this.memory },
      network: { ...this.network },
      mesh: { ...this.mesh },
      cache: { ...this.cache },
      tier: this.currentTier,
      sessionId: this.sessionId,
    };

    // Add to history
    this.history.push(snapshot);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Check for alerts
    this.checkAlerts(snapshot);

    // Notify callbacks
    this.notifyCallbacks('metrics', snapshot);
  }

  private collectExecutionMetrics(): void {
    // Get FPS from performance monitor if available
    if (performanceMonitor) {
      const stats = performanceMonitor.getFrameStats();
      this.execution.fps = stats.fps;
      this.execution.frameTimeMs = stats.avgFrameTime;
    }
  }

  private collectMemoryMetrics(): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as any).memory;
      this.memory.heapUsed = mem.usedJSHeapSize;
      this.memory.heapTotal = mem.totalJSHeapSize;
      this.memory.heapLimit = mem.jsHeapSizeLimit;
    }
  }

  private collectNetworkMetrics(): void {
    // Calculate average response time from recent requests
    const completedRequests = this.networkRequests.filter(r => r.end);
    if (completedRequests.length > 0) {
      const totalTime = completedRequests.reduce((sum, r) => sum + (r.end! - r.start), 0);
      this.network.avgResponseTime = totalTime / completedRequests.length;
      this.network.requestCount = completedRequests.length;
      this.network.errorCount = completedRequests.filter(r => r.error).length;
    }

    // Clean old requests (keep last 100)
    if (this.networkRequests.length > 100) {
      this.networkRequests = this.networkRequests.slice(-100);
    }
  }

  /**
   * Update execution metrics (called by runtime)
   */
  updateExecutionMetrics(updates: Partial<ExecutionMetrics>): void {
    Object.assign(this.execution, updates);
  }

  /**
   * Update memory metrics (called by runtime)
   */
  updateMemoryMetrics(updates: Partial<MemoryMetrics>): void {
    Object.assign(this.memory, updates);
  }

  /**
   * Update network metrics (called by network layer)
   */
  updateNetworkMetrics(updates: Partial<NetworkMetrics>): void {
    Object.assign(this.network, updates);
  }

  /**
   * Update mesh metrics (called by mesh layer)
   */
  updateMeshMetrics(updates: Partial<MeshMetrics>): void {
    Object.assign(this.mesh, updates);
  }

  /**
   * Update cache metrics (called by cache layer)
   */
  updateCacheMetrics(updates: Partial<CacheMetrics>): void {
    Object.assign(this.cache, updates);
  }

  /**
   * Record a network request
   */
  recordNetworkRequest(): () => void {
    const request: { start: number; end?: number; error?: boolean } = { start: performance.now() };
    this.networkRequests.push(request);

    return (error?: boolean) => {
      request.end = performance.now();
      request.error = error;
    };
  }

  /**
   * Record JIT compilation time
   */
  recordJITCompilation(durationMs: number): void {
    this.execution.jitTimeMs += durationMs;
    this.execution.compileTimeMs += durationMs;
  }

  /**
   * Record instruction execution
   */
  recordInstructions(count: number): void {
    this.execution.instructionCount += count;
  }

  /**
   * Record GC pause
   */
  recordGCPause(durationMs: number): void {
    this.gcPauseAccumulator += durationMs;
    this.memory.gcPauseMs = this.gcPauseAccumulator;
  }

  /**
   * Set current tier
   */
  setTier(tier: string): void {
    const oldTier = this.currentTier;
    this.currentTier = tier;
    
    if (oldTier !== tier) {
      this.notifyCallbacks('tier_change', { oldTier, newTier: tier });
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(snapshot: PerformanceMetricsSnapshot): void {
    const now = Date.now();

    // FPS alerts
    if (snapshot.execution.fps < ALERT_THRESHOLDS.fps_low_critical) {
      this.raiseAlert({
        type: 'fps_low',
        severity: 'critical',
        message: `FPS critically low: ${snapshot.execution.fps.toFixed(1)}`,
        value: snapshot.execution.fps,
        threshold: ALERT_THRESHOLDS.fps_low_critical,
        timestamp: now,
      });
    } else if (snapshot.execution.fps < ALERT_THRESHOLDS.fps_low_warning) {
      this.raiseAlert({
        type: 'fps_low',
        severity: 'warning',
        message: `FPS low: ${snapshot.execution.fps.toFixed(1)}`,
        value: snapshot.execution.fps,
        threshold: ALERT_THRESHOLDS.fps_low_warning,
        timestamp: now,
      });
    }

    // Memory alerts
    const memoryUsageRatio = snapshot.memory.heapUsed / snapshot.memory.heapLimit;
    if (memoryUsageRatio > ALERT_THRESHOLDS.memory_high_critical) {
      this.raiseAlert({
        type: 'memory_high',
        severity: 'critical',
        message: `Memory critically high: ${(memoryUsageRatio * 100).toFixed(1)}%`,
        value: memoryUsageRatio,
        threshold: ALERT_THRESHOLDS.memory_high_critical,
        timestamp: now,
      });
    } else if (memoryUsageRatio > ALERT_THRESHOLDS.memory_high_warning) {
      this.raiseAlert({
        type: 'memory_high',
        severity: 'warning',
        message: `Memory high: ${(memoryUsageRatio * 100).toFixed(1)}%`,
        value: memoryUsageRatio,
        threshold: ALERT_THRESHOLDS.memory_high_warning,
        timestamp: now,
      });
    }

    // Network alerts
    if (snapshot.network.latencyMs > ALERT_THRESHOLDS.network_slow_critical) {
      this.raiseAlert({
        type: 'network_slow',
        severity: 'critical',
        message: `Network critically slow: ${snapshot.network.latencyMs.toFixed(0)}ms`,
        value: snapshot.network.latencyMs,
        threshold: ALERT_THRESHOLDS.network_slow_critical,
        timestamp: now,
      });
    } else if (snapshot.network.latencyMs > ALERT_THRESHOLDS.network_slow_warning) {
      this.raiseAlert({
        type: 'network_slow',
        severity: 'warning',
        message: `Network slow: ${snapshot.network.latencyMs.toFixed(0)}ms`,
        value: snapshot.network.latencyMs,
        threshold: ALERT_THRESHOLDS.network_slow_warning,
        timestamp: now,
      });
    }

    // Mesh alerts
    if (snapshot.mesh.peerCount > 0 && snapshot.mesh.offloadSuccessRate < ALERT_THRESHOLDS.mesh_unstable_critical) {
      this.raiseAlert({
        type: 'mesh_unstable',
        severity: 'critical',
        message: `Mesh critically unstable: ${(snapshot.mesh.offloadSuccessRate * 100).toFixed(1)}% success`,
        value: snapshot.mesh.offloadSuccessRate,
        threshold: ALERT_THRESHOLDS.mesh_unstable_critical,
        timestamp: now,
      });
    }
  }

  private raiseAlert(alert: MetricsAlert): void {
    const key = `${alert.type}_${alert.severity}`;
    
    // Check cooldown (don't spam same alert)
    const lastAlert = this.alertCooldowns.get(key);
    if (lastAlert && Date.now() - lastAlert < 30000) {
      return;
    }

    this.activeAlerts.set(key, alert);
    this.alertCooldowns.set(key, Date.now());
    this.notifyCallbacks('alert', alert);
  }

  /**
   * Subscribe to metrics events
   */
  subscribe(callback: MetricsCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifyCallbacks(event: MetricsEventType, data: any): void {
    for (const callback of this.callbacks) {
      try {
        callback(event, data);
      } catch (e) {
        console.error('Metrics callback error:', e);
      }
    }
  }

  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics(): PerformanceMetricsSnapshot {
    return {
      timestamp: Date.now(),
      execution: { ...this.execution },
      memory: { ...this.memory },
      network: { ...this.network },
      mesh: { ...this.mesh },
      cache: { ...this.cache },
      tier: this.currentTier,
      sessionId: this.sessionId,
    };
  }

  /**
   * Get metrics history
   */
  getHistory(durationMs?: number): PerformanceMetricsSnapshot[] {
    if (!durationMs) {
      return [...this.history];
    }

    const cutoff = Date.now() - durationMs;
    return this.history.filter(s => s.timestamp >= cutoff);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): MetricsAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Clear an alert
   */
  clearAlert(type: MetricsAlert['type']): void {
    for (const [key, alert] of this.activeAlerts) {
      if (alert.type === type) {
        this.activeAlerts.delete(key);
      }
    }
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      current: this.getCurrentMetrics(),
      history: this.history.slice(-100), // Last 100 samples
      alerts: this.getActiveAlerts(),
    }, null, 2);
  }

  /**
   * Generate debug report
   */
  generateDebugReport(): string {
    const current = this.getCurrentMetrics();
    const alerts = this.getActiveAlerts();
    
    let report = `# Performance Debug Report\n`;
    report += `Session: ${this.sessionId}\n`;
    report += `Time: ${new Date().toISOString()}\n`;
    report += `Tier: ${current.tier}\n\n`;
    
    report += `## Execution\n`;
    report += `- FPS: ${current.execution.fps.toFixed(1)}\n`;
    report += `- Frame Time: ${current.execution.frameTimeMs.toFixed(2)}ms\n`;
    report += `- JIT Time: ${current.execution.jitTimeMs.toFixed(0)}ms\n`;
    report += `- Instructions: ${current.execution.instructionCount.toLocaleString()}\n\n`;
    
    report += `## Memory\n`;
    report += `- Heap Used: ${(current.memory.heapUsed / 1024 / 1024).toFixed(1)} MB\n`;
    report += `- Heap Total: ${(current.memory.heapTotal / 1024 / 1024).toFixed(1)} MB\n`;
    report += `- Heap Limit: ${(current.memory.heapLimit / 1024 / 1024).toFixed(1)} MB\n`;
    report += `- GC Pause: ${current.memory.gcPauseMs.toFixed(0)}ms\n\n`;
    
    report += `## Network\n`;
    report += `- Latency: ${current.network.latencyMs.toFixed(0)}ms\n`;
    report += `- Cache Hit Rate: ${(current.network.cacheHitRate * 100).toFixed(1)}%\n`;
    report += `- Requests: ${current.network.requestCount}\n`;
    report += `- Errors: ${current.network.errorCount}\n\n`;
    
    report += `## Mesh\n`;
    report += `- Peers: ${current.mesh.peerCount}\n`;
    report += `- Avg RTT: ${current.mesh.avgRttMs.toFixed(0)}ms\n`;
    report += `- Active Tasks: ${current.mesh.activeTasks}\n`;
    report += `- Success Rate: ${(current.mesh.offloadSuccessRate * 100).toFixed(1)}%\n\n`;
    
    if (alerts.length > 0) {
      report += `## Active Alerts\n`;
      for (const alert of alerts) {
        report += `- [${alert.severity.toUpperCase()}] ${alert.message}\n`;
      }
    }
    
    return report;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.execution = this.defaultExecutionMetrics();
    this.memory = this.defaultMemoryMetrics();
    this.network = this.defaultNetworkMetrics();
    this.mesh = this.defaultMeshMetrics();
    this.cache = this.defaultCacheMetrics();
    this.history = [];
    this.activeAlerts.clear();
    this.alertCooldowns.clear();
    this.networkRequests = [];
    this.gcPauseAccumulator = 0;
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

// Convenience exports
export function getCurrentMetrics(): PerformanceMetricsSnapshot {
  return metricsCollector.getCurrentMetrics();
}

export function subscribeToMetrics(callback: MetricsCallback): () => void {
  return metricsCollector.subscribe(callback);
}

export function exportMetricsJSON(): string {
  return metricsCollector.exportJSON();
}

export function generateDebugReport(): string {
  return metricsCollector.generateDebugReport();
}