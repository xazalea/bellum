"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GPURenderer } from "@/lib/engine/gpu-renderer";
import { FrameScheduler, FrameMetrics } from "@/lib/engine/frame-scheduler";

export interface RunnerDisplayProps {
  type: "android" | "windows";
  onMetrics?: (metrics: FrameMetrics) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Unified display component for both APK and EXE runners
 * Uses WebGPU for rendering with Canvas 2D fallback
 */
export function RunnerDisplay({ type, onMetrics, onReady, onError }: RunnerDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GPURenderer | null>(null);
  const schedulerRef = useRef<FrameScheduler | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const initRenderer = async () => {
      try {
        // Get container dimensions
        const rect = container.getBoundingClientRect();
        const width = Math.floor(rect.width) || 800;
        const height = Math.floor(rect.height) || 600;
        
        setDimensions({ width, height });
        canvas.width = width;
        canvas.height = height;

        // Try WebGPU first
        if (navigator.gpu) {
          const renderer = new GPURenderer({ width, height });
          await renderer.initialize(canvas);
          rendererRef.current = renderer;
          
          // Set up metrics callback
          schedulerRef.current = new FrameScheduler({
            targetFPS: 60,
            adaptiveQuality: true,
            onMetrics: (metrics) => {
              onMetrics?.(metrics);
            },
          });

          setIsInitialized(true);
          setUseFallback(false);
          onReady?.();
          console.log(`[RunnerDisplay] WebGPU initialized: ${width}x${height}`);
        } else {
          throw new Error("WebGPU not supported");
        }
      } catch (error) {
        console.warn("[RunnerDisplay] WebGPU failed, using Canvas 2D fallback:", error);
        setUseFallback(true);
        setIsInitialized(true);
        onReady?.();
      }
    };

    initRenderer();

    return () => {
      rendererRef.current?.destroy();
      schedulerRef.current?.stop();
    };
  }, [onReady, onMetrics]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.floor(entry.contentRect.width);
        const height = Math.floor(entry.contentRect.height);
        
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
          
          if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
          }
          
          rendererRef.current?.resize(width, height);
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Render placeholder content
  const renderPlaceholder = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = dimensions;
    
    // Background
    ctx.fillStyle = type === "android" ? "#1a1a2e" : "#0078D4";
    ctx.fillRect(0, 0, width, height);

    // Center content
    const centerX = width / 2;
    const centerY = height / 2;

    // Icon
    ctx.font = "64px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(type === "android" ? "🤖" : "⊞", centerX, centerY - 60);

    // Title
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(
      type === "android" ? "Android Runtime" : "Windows Runtime",
      centerX,
      centerY + 20
    );

    // Status
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText(
      isInitialized ? "Ready" : "Initializing...",
      centerX,
      centerY + 55
    );

    // WebGPU status
    ctx.font = "12px monospace";
    ctx.fillStyle = useFallback ? "#FFA500" : "#22c55e";
    ctx.fillText(
      useFallback ? "Canvas 2D Fallback" : "WebGPU Accelerated",
      centerX,
      centerY + 85
    );
  }, [type, dimensions, isInitialized, useFallback]);

  // Fallback rendering
  useEffect(() => {
    if (!useFallback || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    renderPlaceholder(ctx);
  }, [useFallback, renderPlaceholder]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Forward to runtime
      console.log(`[RunnerDisplay] Key down: ${e.key}`);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      console.log(`[RunnerDisplay] Key up: ${e.key}`);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Handle mouse input
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Forward to runtime
  }, []);

  const handleMouseClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log(`[RunnerDisplay] Click at: (${x}, ${y})`);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{ background: type === "android" ? "#1a1a2e" : "#0078D4" }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          imageRendering: useFallback ? "auto" : "pixelated",
          cursor: "default",
        }}
        onMouseMove={handleMouseMove}
        onClick={handleMouseClick}
      />

      {/* Loading overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-white text-sm">Initializing WebGPU...</span>
          </div>
        </div>
      )}

      {/* Resolution badge */}
      {isInitialized && (
        <div
          className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-mono"
          style={{
            background: "rgba(0, 0, 0, 0.5)",
            color: "rgba(255, 255, 255, 0.7)",
          }}
        >
          {dimensions.width}x{dimensions.height}
        </div>
      )}
    </div>
  );
}

export default RunnerDisplay;