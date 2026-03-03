"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type RunState = "idle" | "loading" | "running" | "error";

interface LogEntry {
  timestamp: number;
  message: string;
  level: "info" | "warn" | "error" | "success";
}

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════

function WindowsIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  );
}

function UploadIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

function StopIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function WindowsPage() {
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [perfStats, setPerfStats] = useState<{
    instructions: number;
    fps: number;
    memory: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<any>(null);

  // Add log entry
  const addLog = useCallback(
    (message: string, level: LogEntry["level"] = "info") => {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: Date.now(),
          message,
          level,
        },
      ]);
    },
    [],
  );

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Stop execution
  const stop = useCallback(() => {
    try {
      if (runtimeRef.current?.stop) {
        runtimeRef.current.stop();
      }
    } catch (err) {
      console.error("Shutdown error:", err);
    }
    runtimeRef.current = null;
    setState("idle");
    setFileName(null);
    setFileSize(0);
    setPerfStats(null);
    addLog("Runtime stopped", "info");
  }, [addLog]);

  // Run EXE
  const runEXE = useCallback(
    async (file: File) => {
      try {
        setError(null);
        setLogs([]);
        setPerfStats(null);
        setFileName(file.name);
        setFileSize(file.size);
        setState("loading");

        addLog(
          `Loading ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
          "info",
        );

        // Validate file
        if (file.size < 1024) {
          throw new Error("File too small - may be corrupted");
        }
        if (file.size > 100 * 1024 * 1024) {
          throw new Error("File too large - max 100MB supported");
        }

        // Wait for canvas to be ready
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error("Canvas not available");
        }

        // Set canvas size
        canvas.width = canvas.clientWidth || 800;
        canvas.height = canvas.clientHeight || 600;

        addLog("Initializing Windows Runtime (NTR)...", "info");

        // Try to load Windows runtime
        let WebGPUContext, WindowsRuntime;
        try {
          const gpuModule = await import("@/lib/challenger/gpu/webgpu");
          const winModule = await import("@/lib/challenger/windows/runtime");
          WebGPUContext = gpuModule.WebGPUContext;
          WindowsRuntime = winModule.WindowsRuntime;
          addLog("Windows runtime module loaded", "success");
        } catch (importErr: any) {
          console.error("Failed to load Windows runtime:", importErr);
          addLog("Windows runtime not available", "error");
          throw new Error(
            "Windows runtime not available. This feature is still in development.",
          );
        }

        // Initialize WebGPU
        addLog("Initializing WebGPU...", "info");
        const gpu = new WebGPUContext(canvas);
        try {
          await gpu.initialize();
          addLog("WebGPU initialized successfully", "success");
        } catch (gpuErr) {
          addLog("WebGPU not available, using Canvas 2D fallback", "warn");
        }

        // Create runtime
        const runtime = new WindowsRuntime(gpu);
        runtime.setCanvas(canvas);
        runtimeRef.current = runtime;

        addLog("Booting Win32 subsystem...", "info");
        try {
          await runtime.boot();
          addLog("Kernel32 + User32 + GDI32 loaded", "success");
        } catch (bootErr: any) {
          addLog(`Boot failed: ${bootErr.message}`, "error");
          throw bootErr;
        }

        // Read file as ArrayBuffer
        addLog("Reading PE executable...", "info");
        const buffer = await file.arrayBuffer();

        addLog("Parsing PE headers...", "info");
        try {
          await runtime.loadPE(buffer);
          addLog("PE executable loaded successfully", "success");
          setState("running");

          // Start performance monitoring
          const interval = setInterval(() => {
            try {
              const stats = runtime.getPerformanceStats?.();
              if (stats) {
                setPerfStats(stats);
              }
            } catch {
              clearInterval(interval);
            }
          }, 1000);
        } catch (loadErr: any) {
          console.error("PE load error:", loadErr);
          addLog(`Load failed: ${loadErr.message}`, "error");
          throw loadErr;
        }
      } catch (err: any) {
        const msg = err?.message || "Failed to run EXE";
        console.error("EXE execution error:", err);
        setError(msg);
        setState("error");
        addLog(`Error: ${msg}`, "error");

        // Auto-reset after error
        setTimeout(() => {
          setState("idle");
          setError(null);
        }, 5000);
      }
    },
    [addLog],
  );

  // Handle file selection
  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".exe")) {
        setError("Only .exe files are supported");
        addLog("Invalid file type - expected .exe", "error");
        return;
      }
      void runEXE(file);
    },
    [runEXE, addLog],
  );

  // Drag and drop handlers
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onEnter = (e: DragEvent) => {
      prevent(e);
      setIsDragging(true);
    };

    const onLeave = (e: DragEvent) => {
      prevent(e);
      setIsDragging(false);
    };

    const onDrop = (e: DragEvent) => {
      prevent(e);
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) handleFile(file);
    };

    el.addEventListener("dragenter", onEnter);
    el.addEventListener("dragover", prevent);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);

    return () => {
      el.removeEventListener("dragenter", onEnter);
      el.removeEventListener("dragover", prevent);
      el.removeEventListener("dragleave", onLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, [handleFile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  const isActive = state === "loading" || state === "running";

  return (
    <div className="min-h-screen" style={{ background: "var(--cd-abyss)" }}>
      {/* Header */}
      <div
        className="border-b"
        style={{ borderColor: "var(--cd-border-default)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{
                  background: "var(--cd-cyan-muted)",
                  border: "1px solid var(--cd-cyan-border)",
                }}
              >
                <WindowsIcon
                  className="w-6 h-6"
                  style={{ color: "var(--cd-cyan)" }}
                />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ color: "var(--cd-text-primary)" }}
                >
                  Windows EXE Runner
                </h1>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--cd-text-muted)" }}
                >
                  Run Windows programs in your browser via NTR engine
                </p>
              </div>
            </div>

            {/* Controls */}
            {isActive && (
              <button onClick={stop} className="cd-btn cd-btn-danger">
                <StopIcon className="w-4 h-4" />
                Stop
              </button>
            )}
          </div>

          {/* Status Bar */}
          {isActive && (
            <div
              className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"
              style={{ color: "var(--cd-text-muted)" }}
            >
              {fileName && (
                <div className="cd-badge cd-badge-cyan">
                  <span className="font-semibold">File:</span> {fileName}
                </div>
              )}
              {fileSize > 0 && (
                <div className="cd-badge">
                  <span className="font-semibold">Size:</span>{" "}
                  {(fileSize / 1024).toFixed(1)} KB
                </div>
              )}
              <div className="cd-badge">
                <span className="font-semibold">Runtime:</span> NTR (x86 → WASM)
              </div>
              <div
                className="cd-badge"
                style={{
                  background:
                    state === "running"
                      ? "var(--cd-success)"
                      : "var(--cd-warning)",
                  color: "white",
                  borderColor: "transparent",
                }}
              >
                {state === "loading" ? "Loading..." : "Running"}
              </div>
              {perfStats && (
                <>
                  <div className="cd-badge cd-badge-success">
                    <span className="font-semibold">Instructions:</span>{" "}
                    {perfStats.instructions.toLocaleString()}
                  </div>
                  <div className="cd-badge">
                    <span className="font-semibold">FPS:</span> {perfStats.fps}
                  </div>
                  <div className="cd-badge">
                    <span className="font-semibold">Memory:</span>{" "}
                    {(perfStats.memory / 1024).toFixed(1)} KB
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="cd-alert cd-alert-error">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Execution Error</p>
              <p className="text-sm mt-1 opacity-80">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="cd-btn cd-btn-ghost text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Display Area */}
          <div>
            <div
              ref={dropRef}
              className="cd-card overflow-hidden relative"
              style={{
                background: isActive
                  ? "var(--cd-void)"
                  : isDragging
                    ? "var(--cd-elevated)"
                    : "var(--cd-surface)",
                borderColor: isDragging
                  ? "var(--cd-cyan-border)"
                  : "var(--cd-border-default)",
                borderWidth: isDragging ? "2px" : "1px",
                borderStyle: isDragging ? "dashed" : "solid",
                minHeight: "600px",
                padding: 0,
              }}
            >
              {/* Canvas (always mounted) */}
              <canvas
                ref={canvasRef}
                className={`w-full ${isActive ? "h-full min-h-[600px]" : "hidden"}`}
                style={{
                  background: "var(--cd-void)",
                  imageRendering: "pixelated",
                }}
              />

              {/* Upload Zone (visible when idle) */}
              {!isActive && (
                <div className="flex flex-col items-center justify-center p-12 min-h-[600px]">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                    style={{
                      background: isDragging
                        ? "var(--cd-cyan-muted)"
                        : "var(--cd-elevated)",
                      border: `2px ${isDragging ? "solid" : "dashed"} var(--cd-border-default)`,
                    }}
                  >
                    {isDragging ? (
                      <UploadIcon
                        className="w-10 h-10"
                        style={{ color: "var(--cd-cyan)" }}
                      />
                    ) : (
                      <WindowsIcon
                        className="w-10 h-10"
                        style={{ color: "var(--cd-cyan)" }}
                      />
                    )}
                  </div>

                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: "var(--cd-text-primary)" }}
                  >
                    {isDragging ? "Drop EXE here" : "Upload Windows Executable"}
                  </h3>

                  <p
                    className="text-sm text-center mb-6 max-w-md"
                    style={{ color: "var(--cd-text-secondary)" }}
                  >
                    Drag and drop an EXE file, or click to browse. The
                    executable will be parsed and run through the NTR engine
                    with x86 to WebAssembly translation.
                  </p>

                  <label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".exe"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                        e.currentTarget.value = "";
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="cd-btn cd-btn-primary"
                    >
                      <UploadIcon className="w-4 h-4" />
                      Choose EXE File
                    </button>
                  </label>

                  <div
                    className="mt-8 text-xs"
                    style={{ color: "var(--cd-text-muted)" }}
                  >
                    Maximum file size: 100 MB
                  </div>
                </div>
              )}
            </div>

            {/* Info Cards (when idle) */}
            {!isActive && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <InfoCard
                  icon="📄"
                  title="Parse PE"
                  description="Extract PE headers, sections, and resolve Win32 imports"
                />
                <InfoCard
                  icon="⚙️"
                  title="Decode x86"
                  description="Interpret x86 instructions through NTR engine cycle"
                />
                <InfoCard
                  icon="🎨"
                  title="Render GDI"
                  description="Translate GDI/DirectX calls to WebGPU for display"
                />
              </div>
            )}
          </div>

          {/* Log Panel */}
          <div
            className="cd-card flex flex-col"
            style={{ padding: 0, maxHeight: "600px" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "var(--cd-border-default)" }}
            >
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--cd-text-primary)" }}
              >
                Execution Log
              </h3>
              <span
                className="text-xs font-mono px-2 py-1 rounded"
                style={{
                  background: "var(--cd-elevated)",
                  color: "var(--cd-text-muted)",
                }}
              >
                {logs.length}
              </span>
            </div>

            <div
              className="flex-1 overflow-y-auto p-4 space-y-1"
              style={{ background: "var(--cd-deep)" }}
            >
              {logs.length === 0 ? (
                <div
                  className="text-center py-12"
                  style={{ color: "var(--cd-text-muted)" }}
                >
                  <p className="text-sm">No logs yet</p>
                  <p className="text-xs mt-1">Upload an EXE to begin</p>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className="font-mono text-xs leading-relaxed"
                    style={{
                      color:
                        log.level === "error"
                          ? "var(--cd-error)"
                          : log.level === "warn"
                            ? "var(--cd-warning)"
                            : log.level === "success"
                              ? "var(--cd-success)"
                              : "var(--cd-text-secondary)",
                    }}
                  >
                    <span style={{ color: "var(--cd-text-muted)" }}>
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>{" "}
                    {log.message}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INFO CARD
// ═══════════════════════════════════════════════════════════

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="cd-card">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h4
          className="font-semibold text-sm"
          style={{ color: "var(--cd-text-primary)" }}
        >
          {title}
        </h4>
      </div>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "var(--cd-text-secondary)" }}
      >
        {description}
      </p>
    </div>
  );
}
