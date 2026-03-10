'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  metricsCollector, 
  PerformanceMetricsSnapshot, 
  MetricsAlert,
  subscribeToMetrics,
  getCurrentMetrics,
  exportMetricsJSON,
  generateDebugReport
} from '@/lib/performance/metrics-collector';

interface PerformanceDashboardProps {
  className?: string;
  compact?: boolean;
}

export function PerformanceDashboard({ className = '', compact = false }: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetricsSnapshot | null>(null);
  const [alerts, setAlerts] = useState<MetricsAlert[]>([]);
  const [history, setHistory] = useState<PerformanceMetricsSnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Start collection
    metricsCollector.startCollection(1000);
    
    // Subscribe to updates
    const unsubscribe = subscribeToMetrics((event, data) => {
      if (event === 'metrics') {
        setMetrics(data);
      } else if (event === 'alert') {
        setAlerts(metricsCollector.getActiveAlerts());
      }
    });

    // Get initial state
    setMetrics(getCurrentMetrics());
    setAlerts(metricsCollector.getActiveAlerts());

    return () => {
      unsubscribe();
      metricsCollector.stopCollection();
    };
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatNumber = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toFixed(0);
  };

  const handleExport = () => {
    const json = exportMetricsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = () => {
    const report = generateDebugReport();
    navigator.clipboard.writeText(report);
  };

  if (!metrics) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-800 rounded w-1/4" />
          <div className="h-20 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  const memoryUsagePercent = (metrics.memory.heapUsed / metrics.memory.heapLimit) * 100;

  return (
    <div className={`bg-gray-900 rounded-lg p-6 text-white ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Performance Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
          <button
            onClick={handleCopyReport}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
          >
            Copy Report
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg flex items-center gap-2 ${
                alert.severity === 'critical' ? 'bg-red-900/50' : 'bg-yellow-900/50'
              }`}
            >
              <span>{alert.severity === 'critical' ? '🚨' : '⚠️'}</span>
              <span className="text-sm">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* FPS */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">FPS</div>
          <div className={`text-2xl font-bold ${
            metrics.execution.fps >= 50 ? 'text-green-400' :
            metrics.execution.fps >= 30 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {metrics.execution.fps.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500">
            {metrics.execution.frameTimeMs.toFixed(1)}ms/frame
          </div>
        </div>

        {/* Memory */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Memory</div>
          <div className={`text-2xl font-bold ${
            memoryUsagePercent < 70 ? 'text-green-400' :
            memoryUsagePercent < 90 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {formatBytes(metrics.memory.heapUsed)}
          </div>
          <div className="text-xs text-gray-500">
            {memoryUsagePercent.toFixed(0)}% of {formatBytes(metrics.memory.heapLimit)}
          </div>
        </div>

        {/* Network */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Network</div>
          <div className={`text-2xl font-bold ${
            metrics.network.latencyMs < 100 ? 'text-green-400' :
            metrics.network.latencyMs < 300 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {metrics.network.latencyMs.toFixed(0)}ms
          </div>
          <div className="text-xs text-gray-500">
            {(metrics.network.cacheHitRate * 100).toFixed(0)}% cache hit
          </div>
        </div>

        {/* Tier */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Execution Tier</div>
          <div className="text-2xl font-bold text-blue-400 uppercase">
            {metrics.tier}
          </div>
          <div className="text-xs text-gray-500">
            {metrics.mesh.peerCount} mesh peers
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Execution Details */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Execution</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">JIT Time</span>
                <span>{metrics.execution.jitTimeMs.toFixed(0)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Compile Time</span>
                <span>{metrics.execution.compileTimeMs.toFixed(0)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Instructions</span>
                <span>{formatNumber(metrics.execution.instructionCount)}</span>
              </div>
            </div>
          </div>

          {/* Memory Details */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Memory</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Heap Total</span>
                <span>{formatBytes(metrics.memory.heapTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">GC Pause</span>
                <span>{metrics.memory.gcPauseMs.toFixed(0)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">External</span>
                <span>{formatBytes(metrics.memory.externalMemory)}</span>
              </div>
            </div>
          </div>

          {/* Network Details */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Network</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Requests</span>
                <span>{metrics.network.requestCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Errors</span>
                <span className={metrics.network.errorCount > 0 ? 'text-red-400' : ''}>
                  {metrics.network.errorCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Response</span>
                <span>{metrics.network.avgResponseTime.toFixed(0)}ms</span>
              </div>
            </div>
          </div>

          {/* Mesh Details */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Mesh Network</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Avg RTT</span>
                <span>{metrics.mesh.avgRttMs.toFixed(0)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Tasks</span>
                <span>{metrics.mesh.activeTasks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Success Rate</span>
                <span className={metrics.mesh.offloadSuccessRate < 0.8 ? 'text-yellow-400' : ''}>
                  {(metrics.mesh.offloadSuccessRate * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Graph */}
      {showHistory && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">FPS History (last 60s)</h3>
          <FPSGraph className="h-32" />
        </div>
      )}
    </div>
  );
}

// FPS Graph Component
function FPSGraph({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToMetrics((event, data) => {
      if (event === 'metrics') {
        setHistory(prev => {
          const newHistory = [...prev, data.execution.fps];
          return newHistory.slice(-60); // Keep last 60 samples
        });
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    if (history.length < 2) return;

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw FPS line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const maxFPS = 120;
    const step = width / 59;

    for (let i = 0; i < history.length; i++) {
      const x = i * step;
      const y = height - (history[i] / maxFPS) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw 60 FPS line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    const y60 = height - (60 / maxFPS) * height;
    ctx.beginPath();
    ctx.moveTo(0, y60);
    ctx.lineTo(width, y60);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [history]);

  return <canvas ref={canvasRef} className={`w-full ${className}`} />;
}

// Minimal overlay for in-game display
export function PerformanceOverlay({ className = '' }: { className?: string }) {
  const [metrics, setMetrics] = useState<PerformanceMetricsSnapshot | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToMetrics((event, data) => {
      if (event === 'metrics') {
        setMetrics(data);
      }
    });

    return unsubscribe;
  }, []);

  if (!metrics) return null;

  const memoryPercent = (metrics.memory.heapUsed / metrics.memory.heapLimit) * 100;

  return (
    <div className={`bg-black/70 text-white text-xs font-mono p-2 rounded ${className}`}>
      <div className="flex gap-4">
        <span className={metrics.execution.fps < 30 ? 'text-red-400' : ''}>
          {metrics.execution.fps.toFixed(0)} FPS
        </span>
        <span className={memoryPercent > 90 ? 'text-red-400' : ''}>
          {memoryPercent.toFixed(0)}% MEM
        </span>
        <span className={metrics.network.latencyMs > 300 ? 'text-red-400' : ''}>
          {metrics.network.latencyMs.toFixed(0)}ms
        </span>
        <span className="uppercase">{metrics.tier}</span>
      </div>
    </div>
  );
}

export default PerformanceDashboard;