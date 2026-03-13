'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

// Types for history data
interface FPSHistoryPoint {
  timestamp: number;
  value: number;
}

interface MemoryHistoryPoint {
  timestamp: number;
  used: number;
  total: number;
  percent: number;
}

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  duration: number;
  size: number;
  timestamp: number;
}

// Collapsible section component
function CollapsibleSection({ 
  title, 
  defaultOpen = true, 
  children,
  badge,
  alertLevel
}: { 
  title: string; 
  defaultOpen?: boolean; 
  children: React.ReactNode;
  badge?: string;
  alertLevel?: 'healthy' | 'warning' | 'critical';
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const alertColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500'
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {alertLevel && (
            <span className={`w-2 h-2 rounded-full ${alertColors[alertLevel]}`} />
          )}
          <h3 className="text-sm font-medium text-gray-200">{title}</h3>
          {badge && (
            <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Health status indicator
function HealthIndicator({ status, label }: { status: 'healthy' | 'warning' | 'critical'; label: string }) {
  const config = {
    healthy: { color: 'text-green-400', bg: 'bg-green-400/10', icon: '✓' },
    warning: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: '⚠' },
    critical: { color: 'text-red-400', bg: 'bg-red-400/10', icon: '✕' }
  };

  const { color, bg, icon } = config[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded ${bg}`}>
      <span className={color}>{icon}</span>
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  );
}

// FPS Graph with smooth animations and color-coded thresholds
function FPSGraph({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [history, setHistory] = useState<FPSHistoryPoint[]>([]);
  const animationRef = useRef<number>();
  const targetHistoryRef = useRef<FPSHistoryPoint[]>([]);
  const displayHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToMetrics((event, data) => {
      if (event === 'metrics') {
        const now = Date.now();
        setHistory(prev => {
          const newHistory = [...prev, { timestamp: now, value: data.execution.fps }];
          // Keep last 60 samples (60 seconds at 1 sample/sec)
          return newHistory.slice(-60);
        });
      }
    });

    return unsubscribe;
  }, []);

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Clear
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, width, height);

      if (history.length < 2) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

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

      const maxFPS = 120;
      const step = width / 59;

      // Draw threshold zones
      // Critical zone (< 15 FPS)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(0, height - (15 / maxFPS) * height, width, (15 / maxFPS) * height);
      
      // Warning zone (15-30 FPS)
      ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
      ctx.fillRect(0, height - (30 / maxFPS) * height, width, (15 / maxFPS) * height);

      // Draw 60 FPS target line
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      const y60 = height - (60 / maxFPS) * height;
      ctx.beginPath();
      ctx.moveTo(0, y60);
      ctx.lineTo(width, y60);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw 30 FPS line
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      const y30 = height - (30 / maxFPS) * height;
      ctx.beginPath();
      ctx.moveTo(0, y30);
      ctx.lineTo(width, y30);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw FPS line with gradient based on value
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < history.length; i++) {
        const x1 = (i - 1) * step;
        const x2 = i * step;
        const y1 = height - (history[i - 1].value / maxFPS) * height;
        const y2 = height - (history[i].value / maxFPS) * height;

        // Color based on FPS value
        let color: string;
        if (history[i].value >= 50) {
          color = '#22c55e'; // green
        } else if (history[i].value >= 30) {
          color = '#eab308'; // yellow
        } else {
          color = '#ef4444'; // red
        }

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Draw current value indicator
      if (history.length > 0) {
        const lastPoint = history[history.length - 1];
        const x = (history.length - 1) * step;
        const y = height - (lastPoint.value / maxFPS) * height;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = lastPoint.value >= 50 ? '#22c55e' : lastPoint.value >= 30 ? '#eab308' : '#ef4444';
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [history]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className={`w-full ${className}`} />
      <div className="absolute bottom-1 right-2 text-xs text-gray-500">
        Target: 60 FPS
      </div>
    </div>
  );
}

// Memory usage graph with warning indicators
function MemoryGraph({ className = '', heapUsed, heapLimit }: { className?: string; heapUsed: number; heapLimit: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [history, setHistory] = useState<MemoryHistoryPoint[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const unsubscribe = subscribeToMetrics((event, data) => {
      if (event === 'metrics') {
        const now = Date.now();
        setHistory(prev => {
          const newHistory = [...prev, {
            timestamp: now,
            used: data.memory.heapUsed,
            total: data.memory.heapTotal,
            percent: (data.memory.heapUsed / data.memory.heapLimit) * 100
          }];
          return newHistory.slice(-60);
        });
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Clear
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, width, height);

      if (history.length < 2) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

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

      // Draw warning threshold (80%)
      ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
      ctx.fillRect(0, 0, width, height * 0.2);

      // Draw critical threshold (90%)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(0, 0, width, height * 0.1);

      // Draw 80% line
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      const y80 = height * 0.2;
      ctx.beginPath();
      ctx.moveTo(0, y80);
      ctx.lineTo(width, y80);
      ctx.stroke();
      ctx.setLineDash([]);

      const step = width / 59;

      // Draw memory line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < history.length; i++) {
        const x = i * step;
        const y = height - (history[i].percent / 100) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Draw current value indicator
      if (history.length > 0) {
        const lastPoint = history[history.length - 1];
        const x = (history.length - 1) * step;
        const y = height - (lastPoint.percent / 100) * height;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = lastPoint.percent > 90 ? '#ef4444' : lastPoint.percent > 80 ? '#eab308' : '#3b82f6';
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [history]);

  const currentPercent = history.length > 0 ? history[history.length - 1].percent : 0;

  return (
    <div className="relative">
      <canvas ref={canvasRef} className={`w-full ${className}`} />
      <div className="absolute bottom-1 right-2 text-xs text-gray-500">
        {currentPercent.toFixed(0)}% used
      </div>
    </div>
  );
}

// Network activity monitor
function NetworkMonitor({ className = '' }: { className?: string }) {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Track fetch requests
    const originalFetch = window.fetch;
    let reqId = 0;

    window.fetch = async (...args) => {
      const id = `req-${++reqId}`;
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      const method = (args[1]?.method || 'GET').toUpperCase();
      const startTime = Date.now();

      try {
        const response = await originalFetch(...args);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Estimate size from content-length header
        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength, 10) : 0;

        setRequests(prev => {
          const newRequests = [...prev, {
            id,
            url,
            method,
            status: response.status,
            duration,
            size,
            timestamp: startTime
          }];
          // Keep last 20 requests
          return newRequests.slice(-20);
        });

        setTotalBytes(prev => prev + size);

        if (!response.ok) {
          setErrorCount(prev => prev + 1);
        }

        return response;
      } catch (error) {
        const endTime = Date.now();
        setRequests(prev => [...prev.slice(-19), {
          id,
          url,
          method,
          status: 0,
          duration: endTime - startTime,
          size: 0,
          timestamp: startTime
        }]);
        setErrorCount(prev => prev + 1);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-2 text-xs text-gray-400">
        <span>Total: {formatBytes(totalBytes)}</span>
        <span className={errorCount > 0 ? 'text-red-400' : ''}>
          {errorCount} errors
        </span>
      </div>
      <div className="max-h-32 overflow-y-auto space-y-1">
        {requests.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-2">No requests yet</div>
        ) : (
          requests.slice().reverse().map(req => (
            <div 
              key={req.id} 
              className={`text-xs p-2 rounded ${req.status >= 400 || req.status === 0 ? 'bg-red-900/30' : 'bg-gray-700/50'}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-mono text-gray-300 truncate max-w-[60%]">
                  {req.method} {req.url.split('/').pop()}
                </span>
                <span className={req.status >= 400 || req.status === 0 ? 'text-red-400' : 'text-green-400'}>
                  {req.status || 'ERR'}
                </span>
              </div>
              <div className="flex gap-3 text-gray-500 mt-1">
                <span>{formatDuration(req.duration)}</span>
                <span>{formatBytes(req.size)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PerformanceDashboard({ className = '', compact = false }: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetricsSnapshot | null>(null);
  const [alerts, setAlerts] = useState<MetricsAlert[]>([]);
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

  const handleExportJSON = () => {
    const json = exportMetricsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!metrics) return;

    const headers = [
      'Timestamp',
      'FPS',
      'Frame Time (ms)',
      'Memory Used (bytes)',
      'Memory Total (bytes)',
      'Memory Limit (bytes)',
      'Memory Percent',
      'Network Latency (ms)',
      'Network Requests',
      'Network Errors',
      'Cache Hit Rate',
      'Execution Tier',
      'Mesh Peers',
      'JIT Time (ms)',
      'Compile Time (ms)',
      'Instruction Count'
    ];

    const row = [
      new Date().toISOString(),
      metrics.execution.fps.toFixed(2),
      metrics.execution.frameTimeMs.toFixed(2),
      metrics.memory.heapUsed.toString(),
      metrics.memory.heapTotal.toString(),
      metrics.memory.heapLimit.toString(),
      ((metrics.memory.heapUsed / metrics.memory.heapLimit) * 100).toFixed(2),
      metrics.network.latencyMs.toFixed(2),
      metrics.network.requestCount.toString(),
      metrics.network.errorCount.toString(),
      (metrics.network.cacheHitRate * 100).toFixed(2),
      metrics.tier,
      metrics.mesh.peerCount.toString(),
      metrics.execution.jitTimeMs.toFixed(2),
      metrics.execution.compileTimeMs.toFixed(2),
      metrics.execution.instructionCount.toString()
    ];

    const csv = [headers.join(','), row.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = () => {
    const report = generateDebugReport();
    navigator.clipboard.writeText(report);
  };

  // Calculate overall health status
  const getHealthStatus = useCallback(() => {
    if (!metrics) return { fps: 'healthy' as const, memory: 'healthy' as const, network: 'healthy' as const };
    
    const memoryPercent = (metrics.memory.heapUsed / metrics.memory.heapLimit) * 100;
    
    return {
      fps: metrics.execution.fps >= 50 ? 'healthy' as const : 
           metrics.execution.fps >= 30 ? 'warning' as const : 'critical' as const,
      memory: memoryPercent < 70 ? 'healthy' as const : 
              memoryPercent < 90 ? 'warning' as const : 'critical' as const,
      network: metrics.network.latencyMs < 100 ? 'healthy' as const : 
               metrics.network.latencyMs < 300 ? 'warning' as const : 'critical' as const
    };
  }, [metrics]);

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
  const health = getHealthStatus();

  // Determine overall health
  const overallHealth: 'healthy' | 'warning' | 'critical' = 
    Object.values(health).includes('critical') ? 'critical' :
    Object.values(health).includes('warning') ? 'warning' : 'healthy';

  return (
    <div className={`bg-gray-900 rounded-lg p-6 text-white ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Performance Dashboard</h2>
          <HealthIndicator 
            status={overallHealth} 
            label={overallHealth === 'healthy' ? 'Healthy' : overallHealth === 'warning' ? 'Warning' : 'Critical'} 
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
          >
            {showHistory ? 'Hide Graphs' : 'Show Graphs'}
          </button>
          <button
            onClick={handleCopyReport}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
          >
            Copy Report
          </button>
          <div className="relative group">
            <button
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
            >
              Export ▾
            </button>
            <div className="absolute right-0 mt-1 w-28 bg-gray-800 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={handleExportJSON}
                className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-700 rounded-t"
              >
                Export JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-700 rounded-b"
              >
                Export CSV
              </button>
            </div>
          </div>
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
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">FPS</span>
            <span className={`w-2 h-2 rounded-full ${
              health.fps === 'healthy' ? 'bg-green-500' : 
              health.fps === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
          </div>
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
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Memory</span>
            <span className={`w-2 h-2 rounded-full ${
              health.memory === 'healthy' ? 'bg-green-500' : 
              health.memory === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
          </div>
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
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Network</span>
            <span className={`w-2 h-2 rounded-full ${
              health.network === 'healthy' ? 'bg-green-500' : 
              health.network === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
          </div>
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

      {/* Graphs Section */}
      {showHistory && (
        <div className="mb-6 space-y-4">
          <CollapsibleSection 
            title="FPS History" 
            badge="Last 60s"
            alertLevel={health.fps}
          >
            <FPSGraph className="h-32" />
          </CollapsibleSection>

          <CollapsibleSection 
            title="Memory Usage" 
            badge={`${memoryUsagePercent.toFixed(0)}%`}
            alertLevel={health.memory}
          >
            <MemoryGraph 
              className="h-32" 
              heapUsed={metrics.memory.heapUsed}
              heapLimit={metrics.memory.heapLimit}
            />
          </CollapsibleSection>

          <CollapsibleSection 
            title="Network Activity" 
            badge={`${metrics.network.requestCount} requests`}
            alertLevel={health.network}
          >
            <NetworkMonitor />
          </CollapsibleSection>
        </div>
      )}

      {/* Detailed Metrics */}
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CollapsibleSection title="Execution Details" defaultOpen={false}>
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
          </CollapsibleSection>

          <CollapsibleSection title="Memory Details" defaultOpen={false}>
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
          </CollapsibleSection>

          <CollapsibleSection title="Network Details" defaultOpen={false}>
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
          </CollapsibleSection>

          <CollapsibleSection title="Mesh Network" defaultOpen={false}>
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
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
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