"use client";

import { useEffect, useRef, useState } from "react";
import { FrameMetrics } from "@/lib/engine/frame-scheduler";

export interface PerformanceOverlayProps {
  metrics: FrameMetrics | null;
  visible?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  compact?: boolean;
}

/**
 * Performance overlay showing FPS, frame time, and other metrics
 */
export function PerformanceOverlay({
  metrics,
  visible = true,
  position = "top-right",
  compact = false,
}: PerformanceOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<{
    fps: number[];
    frameTime: number[];
    maxSamples: number;
  }>({
    fps: [],
    frameTime: [],
    maxSamples: 60,
  });

  // Update graph data
  useEffect(() => {
    if (!metrics) return;

    setGraphData((prev) => {
      const fps = [...prev.fps, metrics.fps].slice(-prev.maxSamples);
      const frameTime = [...prev.frameTime, metrics.frameTimeMs].slice(-prev.maxSamples);
      return { ...prev, fps, frameTime };
    });
  }, [metrics]);

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || compact) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const { fps, frameTime } = graphData;

    // Clear
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, width, height);

    // Draw FPS graph
    if (fps.length > 1) {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 1;
      ctx.beginPath();

      const maxFPS = 120;
      for (let i = 0; i < fps.length; i++) {
        const x = (i / (graphData.maxSamples - 1)) * width;
        const y = height - (fps[i] / maxFPS) * height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw 60 FPS line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const y60 = height - (60 / maxFPS) * height;
      ctx.moveTo(0, y60);
      ctx.lineTo(width, y60);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw frame time graph
    if (frameTime.length > 1) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1;
      ctx.beginPath();

      const maxFrameTime = 50; // ms
      for (let i = 0; i < frameTime.length; i++) {
        const x = (i / (graphData.maxSamples - 1)) * width;
        const y = height - (frameTime[i] / maxFrameTime) * height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  }, [graphData, compact]);

  if (!visible) return null;

  const positionClasses = {
    "top-left": "top-2 left-2",
    "top-right": "top-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "bottom-right": "bottom-2 right-2",
  };

  const fps = metrics?.fps || 0;
  const frameTime = metrics?.frameTimeMs || 0;
  const quality = metrics?.qualityLevel || 1;
  const droppedFrames = metrics?.droppedFrames || 0;

  // Determine FPS color
  const getFPSColor = (fps: number) => {
    if (fps >= 55) return "#22c55e"; // Green
    if (fps >= 40) return "#f59e0b"; // Yellow
    return "#ef4444"; // Red
  };

  return (
    <div
      className={`absolute ${positionClasses[position]} z-50 pointer-events-none`}
      style={{
        fontFamily: "monospace",
        fontSize: compact ? "10px" : "12px",
      }}
    >
      {compact ? (
        // Compact view - just FPS
        <div
          className="px-2 py-1 rounded"
          style={{
            background: "rgba(0, 0, 0, 0.7)",
            color: getFPSColor(fps),
          }}
        >
          {fps.toFixed(0)} FPS
        </div>
      ) : (
        // Full view
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "rgba(0, 0, 0, 0.85)" }}
        >
          {/* Header */}
          <div
            className="px-3 py-1.5 flex items-center justify-between"
            style={{
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <span className="text-white font-semibold text-xs">Performance</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: quality >= 0.9 ? "#22c55e" : quality >= 0.5 ? "#f59e0b" : "#ef4444",
                color: "white",
              }}
            >
              {quality >= 0.9 ? "High" : quality >= 0.5 ? "Med" : "Low"}
            </span>
          </div>

          {/* Metrics */}
          <div className="p-3 space-y-2">
            {/* FPS */}
            <div className="flex items-center justify-between">
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>FPS</span>
              <span style={{ color: getFPSColor(fps), fontWeight: "bold" }}>
                {fps.toFixed(1)}
              </span>
            </div>

            {/* Frame Time */}
            <div className="flex items-center justify-between">
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Frame</span>
              <span style={{ color: "#f59e0b" }}>
                {frameTime.toFixed(2)} ms
              </span>
            </div>

            {/* CPU Time */}
            {metrics?.cpuTimeMs !== undefined && metrics.cpuTimeMs > 0 && (
              <div className="flex items-center justify-between">
                <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>CPU</span>
                <span style={{ color: "#3b82f6" }}>
                  {metrics.cpuTimeMs.toFixed(2)} ms
                </span>
              </div>
            )}

            {/* GPU Time */}
            {metrics?.gpuTimeMs !== undefined && metrics.gpuTimeMs > 0 && (
              <div className="flex items-center justify-between">
                <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>GPU</span>
                <span style={{ color: "#8b5cf6" }}>
                  {metrics.gpuTimeMs.toFixed(2)} ms
                </span>
              </div>
            )}

            {/* Dropped Frames */}
            <div className="flex items-center justify-between">
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Dropped</span>
              <span style={{ color: droppedFrames > 0 ? "#ef4444" : "#22c55e" }}>
                {droppedFrames}
              </span>
            </div>

            {/* Quality Level */}
            <div className="flex items-center justify-between">
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Quality</span>
              <span style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                {(quality * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Graph */}
          <div className="px-3 pb-3">
            <canvas
              ref={canvasRef}
              width={200}
              height={60}
              className="w-full rounded"
              style={{ background: "rgba(0, 0, 0, 0.5)" }}
            />
          </div>

          {/* Legend */}
          <div
            className="px-3 py-2 flex items-center gap-4 text-xs"
            style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "#22c55e" }}
              />
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>FPS</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "#f59e0b" }}
              />
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Frame</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PerformanceOverlay;