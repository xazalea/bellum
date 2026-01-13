'use client';

/**
 * Performance Profiler UI
 * Real-time visualization of system performance
 * 
 * Features:
 * - CPU profile with flame graph
 * - GPU profile timeline
 * - Memory usage charts
 * - FPS counter and frame time graph
 * - Hot path identification
 * - JIT compilation statistics
 */

import { useState, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

interface CPUProfile {
  functionName: string;
  executionTime: number;
  callCount: number;
  children: CPUProfile[];
}

interface GPUProfile {
  shaderName: string;
  gpuTime: number;
  dispatches: number;
}

interface MemoryProfile {
  totalAllocated: number;
  totalUsed: number;
  heapUsed: number;
  gpuMemoryUsed: number;
}

interface FrameData {
  timestamp: number;
  frameTime: number;
  fps: number;
}

interface ProfilerState {
  isProfiling: boolean;
  cpuProfile: CPUProfile | null;
  gpuProfile: GPUProfile[];
  memoryProfile: MemoryProfile;
  frameHistory: FrameData[];
  hotPaths: Array<{ id: string; count: number; time: number }>;
  jitStats: {
    compilations: number;
    cacheHits: number;
    averageCompileTime: number;
  };
}

// ============================================================================
// Performance Profiler UI Component
// ============================================================================

export function PerformanceProfilerUI() {
  const [state, setState] = useState<ProfilerState>({
    isProfiling: false,
    cpuProfile: null,
    gpuProfile: [],
    memoryProfile: {
      totalAllocated: 0,
      totalUsed: 0,
      heapUsed: 0,
      gpuMemoryUsed: 0,
    },
    frameHistory: [],
    hotPaths: [],
    jitStats: {
      compilations: 0,
      cacheHits: 0,
      averageCompileTime: 0,
    },
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update profiling data
  useEffect(() => {
    if (!state.isProfiling) return;

    const interval = setInterval(() => {
      updateProfilingData();
    }, 100);

    return () => clearInterval(interval);
  }, [state.isProfiling]);

  // Draw flame graph
  useEffect(() => {
    if (state.cpuProfile && canvasRef.current) {
      drawFlameGraph(canvasRef.current, state.cpuProfile);
    }
  }, [state.cpuProfile]);

  const updateProfilingData = () => {
    // Simulate profiling data updates
    // In real implementation, would fetch from profiler service

    const newFrame: FrameData = {
      timestamp: Date.now(),
      frameTime: Math.random() * 16 + 8, // 8-24ms
      fps: Math.random() * 20 + 50, // 50-70 fps
    };

    setState(prev => ({
      ...prev,
      frameHistory: [...prev.frameHistory.slice(-100), newFrame],
      memoryProfile: {
        totalAllocated: Math.random() * 1000 * 1024 * 1024,
        totalUsed: Math.random() * 500 * 1024 * 1024,
        heapUsed: Math.random() * 64 * 1024 * 1024,
        gpuMemoryUsed: Math.random() * 256 * 1024 * 1024,
      },
      jitStats: {
        compilations: Math.floor(Math.random() * 1000),
        cacheHits: Math.floor(Math.random() * 5000),
        averageCompileTime: Math.random() * 50 + 10,
      },
    }));
  };

  const drawFlameGraph = (canvas: HTMLCanvasElement, profile: CPUProfile) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawFrame = (
      node: CPUProfile,
      x: number,
      y: number,
      width: number,
      depth: number
    ) => {
      const height = 20;
      const hue = (depth * 137) % 360;

      ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
      ctx.fillRect(x, y, width, height);
      
      ctx.strokeStyle = '#333';
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = '#000';
      ctx.font = '12px monospace';
      ctx.fillText(
        `${node.functionName} (${node.executionTime.toFixed(2)}ms)`,
        x + 4,
        y + 14
      );

      let childX = x;
      for (const child of node.children) {
        const childWidth = (child.executionTime / node.executionTime) * width;
        drawFrame(child, childX, y + height + 2, childWidth, depth + 1);
        childX += childWidth;
      }
    };

    if (profile) {
      drawFrame(profile, 0, 0, canvas.width, 0);
    }
  };

  const toggleProfiling = () => {
    setState(prev => ({ ...prev, isProfiling: !prev.isProfiling }));
  };

  const captureProfile = () => {
    // Simulate capturing a CPU profile
    const mockProfile: CPUProfile = {
      functionName: 'main',
      executionTime: 100,
      callCount: 1,
      children: [
        {
          functionName: 'renderFrame',
          executionTime: 60,
          callCount: 60,
          children: [
            {
              functionName: 'updateGeometry',
              executionTime: 30,
              callCount: 60,
              children: [],
            },
            {
              functionName: 'drawCalls',
              executionTime: 30,
              callCount: 60,
              children: [],
            },
          ],
        },
        {
          functionName: 'processInput',
          executionTime: 20,
          callCount: 60,
          children: [],
        },
        {
          functionName: 'updatePhysics',
          executionTime: 20,
          callCount: 60,
          children: [],
        },
      ],
    };

    setState(prev => ({ ...prev, cpuProfile: mockProfile }));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="fixed top-4 right-4 w-96 bg-black/90 text-green-400 p-4 rounded-lg border border-green-500 font-mono text-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">⚡ Performance Profiler</h2>
        <button
          onClick={toggleProfiling}
          className={`px-3 py-1 rounded ${
            state.isProfiling
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {state.isProfiling ? '⏸ Pause' : '▶ Start'}
        </button>
      </div>

      {/* FPS Counter */}
      <div className="mb-4">
        <div className="text-xs text-green-300 mb-1">FPS</div>
        <div className="text-2xl font-bold">
          {state.frameHistory.length > 0
            ? state.frameHistory[state.frameHistory.length - 1].fps.toFixed(1)
            : '0.0'}
        </div>
        <div className="text-xs text-green-600">
          Frame Time:{' '}
          {state.frameHistory.length > 0
            ? state.frameHistory[state.frameHistory.length - 1].frameTime.toFixed(2)
            : '0.00'}
          ms
        </div>
      </div>

      {/* Frame Time Graph */}
      <div className="mb-4">
        <div className="text-xs text-green-300 mb-1">Frame Time (ms)</div>
        <div className="h-16 bg-black/50 border border-green-700 relative">
          {state.frameHistory.slice(-50).map((frame, i) => (
            <div
              key={i}
              className="absolute bottom-0 bg-green-500"
              style={{
                left: `${(i / 50) * 100}%`,
                width: '2%',
                height: `${Math.min((frame.frameTime / 33) * 100, 100)}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Memory Usage */}
      <div className="mb-4">
        <div className="text-xs text-green-300 mb-1">Memory Usage</div>
        <div className="space-y-1 text-xs">
          <div>
            Heap: {formatBytes(state.memoryProfile.heapUsed)} /{' '}
            {formatBytes(state.memoryProfile.totalAllocated)}
          </div>
          <div>GPU: {formatBytes(state.memoryProfile.gpuMemoryUsed)}</div>
        </div>
      </div>

      {/* JIT Stats */}
      <div className="mb-4">
        <div className="text-xs text-green-300 mb-1">JIT Compiler</div>
        <div className="space-y-1 text-xs">
          <div>Compilations: {state.jitStats.compilations}</div>
          <div>Cache Hits: {state.jitStats.cacheHits}</div>
          <div>Avg Compile: {state.jitStats.averageCompileTime.toFixed(2)}ms</div>
        </div>
      </div>

      {/* Flame Graph */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs text-green-300">CPU Flame Graph</div>
          <button
            onClick={captureProfile}
            className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 rounded"
          >
            Capture
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={350}
          height={200}
          className="border border-green-700 bg-black"
        />
      </div>

      {/* Hot Paths */}
      <div>
        <div className="text-xs text-green-300 mb-1">Hot Paths</div>
        <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
          {state.hotPaths.length === 0 && (
            <div className="text-green-600">No hot paths identified</div>
          )}
          {state.hotPaths.map((path, i) => (
            <div key={i} className="flex justify-between">
              <span>{path.id}</span>
              <span className="text-green-600">{path.count}x</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PerformanceProfilerUI;
