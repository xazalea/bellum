/**
 * Performance Lab Dashboard
 * Real-time performance monitoring and control
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { perfController } from '../lib/engine/perf-controller';
import { metricsBus } from '../lib/engine/metrics-bus';
import type { PerformanceMetrics, PerformanceControl } from '../lib/engine/perf-controller';

interface ChartData {
  time: number;
  value: number;
}

interface RegressionSnapshot {
  id: string;
  timestamp: number;
  metrics: PerformanceMetrics;
  control: PerformanceControl;
  label?: string;
}

export function PerformanceLab() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [control, setControl] = useState<PerformanceControl | null>(null);
  const [fpsHistory, setFpsHistory] = useState<ChartData[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<ChartData[]>([]);
  const [backpressureHistory, setBackpressureHistory] = useState<ChartData[]>([]);
  const [snapshots, setSnapshots] = useState<RegressionSnapshot[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<number | null>(null);
  const [showDrilldown, setShowDrilldown] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxHistory = 120; // 2 seconds at 60fps
  
  useEffect(() => {
    // Subscribe to metrics updates
    const unsubscribeMetrics = perfController.onMetricsUpdate((m) => {
      setMetrics(m);
      
      const now = Date.now();
      setFpsHistory(prev => [...prev.slice(-maxHistory + 1), { time: now, value: m.fps }]);
      setMemoryHistory(prev => [...prev.slice(-maxHistory + 1), { time: now, value: m.memoryUsage / (1024 * 1024) }]);
      setBackpressureHistory(prev => [...prev.slice(-maxHistory + 1), { time: now, value: m.backpressureLevel * 100 }]);
    });
    
    const unsubscribeControl = perfController.onControlUpdate((c) => {
      setControl(c);
    });
    
    // Get initial values
    setMetrics(perfController.getMetrics());
    setControl(perfController.getControl());
    
    return () => {
      unsubscribeMetrics();
      unsubscribeControl();
    };
  }, []);
  
  // Draw charts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || fpsHistory.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw FPS chart
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const fpsData = fpsHistory.slice(-60); // Last 60 frames
    fpsData.forEach((point, i) => {
      const x = (i / (fpsData.length - 1)) * width;
      const y = height - (point.value / 60) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw target FPS line
    ctx.strokeStyle = '#60a5fa';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height * 0.9);
    ctx.lineTo(width, height * 0.9);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [fpsHistory]);
  
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  
  const getThermalColor = (state: string): string => {
    switch (state) {
      case 'critical': return 'text-red-500';
      case 'serious': return 'text-orange-500';
      case 'fair': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };
  
  const captureSnapshot = () => {
    if (!metrics || !control) return;
    
    const snapshot: RegressionSnapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      metrics: { ...metrics },
      control: { ...control },
      label: `Snapshot ${snapshots.length + 1}`,
    };
    
    setSnapshots(prev => [...prev, snapshot].slice(-10)); // Keep last 10
  };
  
  const compareWithSnapshot = (snapshot: RegressionSnapshot) => {
    if (!metrics) return null;
    
    return {
      fpsDelta: metrics.fps - snapshot.metrics.fps,
      frameTimeDelta: metrics.frameTime - snapshot.metrics.frameTime,
      memoryDelta: metrics.memoryUsage - snapshot.metrics.memoryUsage,
      backpressureDelta: metrics.backpressureLevel - snapshot.metrics.backpressureLevel,
    };
  };
  
  const getProcessFrameTimeStats = (processId: number) => {
    // Would call perfController.getProcessFrameTimeStats(processId)
    return null;
  };
  
  return (
    <div className="w-full h-full p-6 bg-black text-white font-mono text-sm overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-green-400">Performance Lab</h1>
        <div className="flex gap-2">
          <button
            onClick={captureSnapshot}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
          >
            Capture Snapshot
          </button>
          <button
            onClick={() => setShowDrilldown(!showDrilldown)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            {showDrilldown ? 'Hide' : 'Show'} Drilldown
          </button>
        </div>
      </div>
      
      {/* Regression Snapshots */}
      {snapshots.length > 0 && (
        <div className="mb-6 bg-gray-900 p-4 rounded border border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Regression Snapshots</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {snapshots.map((snapshot) => {
              const comparison = metrics ? compareWithSnapshot(snapshot) : null;
              return (
                <div key={snapshot.id} className="bg-gray-800 p-2 rounded border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">
                    {new Date(snapshot.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-xs font-bold mb-1">{snapshot.label}</div>
                  {comparison && (
                    <div className="text-xs space-y-0.5">
                      <div className={comparison.fpsDelta < 0 ? 'text-red-400' : 'text-green-400'}>
                        FPS: {comparison.fpsDelta > 0 ? '+' : ''}{comparison.fpsDelta.toFixed(1)}
                      </div>
                      <div className={comparison.frameTimeDelta > 0 ? 'text-red-400' : 'text-green-400'}>
                        Frame: {comparison.frameTimeDelta > 0 ? '+' : ''}{comparison.frameTimeDelta.toFixed(2)}ms
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Process Drilldown */}
      {showDrilldown && (
        <div className="mb-6 bg-gray-900 p-4 rounded border border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Per-Process Analysis</h2>
          <div className="text-sm text-gray-400">
            Select a process to view detailed frame time distribution and performance metrics.
          </div>
          {/* Would show process list and allow selection */}
        </div>
      )}
      
      {metrics && (
        <div className="space-y-6">
          {/* FPS Chart */}
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Frame Rate</h2>
              <span className="text-2xl font-bold text-green-400">{metrics.fps.toFixed(1)} FPS</span>
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full border border-gray-700 bg-gray-950"
            />
            <div className="mt-2 text-xs text-gray-400">
              Frame Time: {metrics.frameTime.toFixed(2)}ms | Target: 16.67ms
            </div>
          </div>
          
          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">CPU Time</div>
              <div className="text-xl font-bold">{metrics.cpuTime.toFixed(2)}ms</div>
            </div>
            
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">GPU Time</div>
              <div className="text-xl font-bold">{metrics.gpuTime.toFixed(2)}ms</div>
            </div>
            
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Memory</div>
              <div className="text-xl font-bold">{formatBytes(metrics.memoryUsage)}</div>
              <div className="text-xs text-gray-500 mt-1">
                Pressure: {(metrics.memoryPressure * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Backpressure</div>
              <div className="text-xl font-bold">{(metrics.backpressureLevel * 100).toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">
                Thermal: <span className={getThermalColor(metrics.thermalState)}>{metrics.thermalState}</span>
              </div>
            </div>
          </div>
          
          {/* JIT Compilation Stats */}
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <h2 className="text-lg font-semibold mb-3">JIT Compilation</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Total Compilations</div>
                <div className="text-xl font-bold">{metrics.jitCompilations}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">WASM Blocks</div>
                <div className="text-xl font-bold">{metrics.wasmCompiledBlocks}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">GPU Blocks</div>
                <div className="text-xl font-bold">{metrics.gpuCompiledBlocks}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">Queue Depth</div>
                <div className="text-xl font-bold">{metrics.compilationQueueDepth}</div>
              </div>
            </div>
          </div>
          
          {/* Execution Tiers */}
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <h2 className="text-lg font-semibold mb-3">Execution Tiers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Cold Blocks</div>
                <div className="text-xl font-bold text-blue-400">{metrics.coldBlocks}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">Warm Blocks</div>
                <div className="text-xl font-bold text-yellow-400">{metrics.warmBlocks}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">Hot Blocks</div>
                <div className="text-xl font-bold text-orange-400">{metrics.hotBlocks}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">Critical Blocks</div>
                <div className="text-xl font-bold text-red-400">{metrics.criticalBlocks}</div>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-gray-400">
              Thresholds: Warm ≥ {metrics.warmThreshold}, Hot ≥ {metrics.hotThreshold}, Critical ≥ {metrics.criticalThreshold}
            </div>
          </div>
          
          {/* Control Panel */}
          {control && (
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h2 className="text-lg font-semibold mb-3">Control Panel</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">JIT Compilation</span>
                  <span className={`text-sm font-bold ${control.enableJIT ? 'text-green-400' : 'text-red-400'}`}>
                    {control.enableJIT ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">GPU Acceleration</span>
                  <span className={`text-sm font-bold ${control.enableGPU ? 'text-green-400' : 'text-red-400'}`}>
                    {control.enableGPU ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Max Backpressure</span>
                  <span className="text-sm font-bold">{(control.maxBackpressure * 100).toFixed(0)}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Frame Time Budget</span>
                  <span className="text-sm font-bold">{control.frameTimeBudget.toFixed(2)}ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
