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

function AndroidIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
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

export default function AndroidPage() {
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [perfStats, setPerfStats] = useState<{
    fps: number;
    memory: number;
    jitCompiles?: number;
    gpuKernels?: number;
  } | null>(null);

  const displayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<any>(null);

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
      if (loaderRef.current?.shutdown) {
        loaderRef.current.shutdown();
      }
    } catch (err) {
      console.error("Shutdown error:", err);
    }
    loaderRef.current = null;
    setState("idle");
    setFileName(null);
    setFileSize(0);
    setPerfStats(null);
    addLog("Runtime stopped", "info");
  }, [addLog]);

  // Run APK
  const runAPK = useCallback(
    async (file: File) => {
      try {
        setError(null);
        setLogs([]);
        setPerfStats(null);
        setFileName(file.name);
        setFileSize(file.size);
        setState("loading");

        addLog(
          `Loading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
          "info",
        );

        // Validate file
        if (file.size < 1024) {
          throw new Error("File too small - may be corrupted");
        }
        if (file.size > 500 * 1024 * 1024) {
          throw new Error("File too large - max 500MB supported");
        }

        // Wait for display to be ready
        await new Promise((resolve) => requestAnimationFrame(resolve));

        if (!displayRef.current) {
          throw new Error("Display container not available");
        }

        displayRef.current.innerHTML = "";

        addLog("Initializing Android Runtime (ART)...", "info");

        // Try to load APK loader
        let APKLoader;
        try {
          const module = await import("@/lib/engine/loaders/apk-loader");
          APKLoader = module.APKLoader;
          addLog("APK loader module loaded", "success");
        } catch (importErr: any) {
          console.error("Failed to load APK loader:", importErr);
          addLog("APK loader not available", "error");
          throw new Error(
            "APK runtime not available. This feature is still in development.",
          );
        }

        const loader = new APKLoader();
        loaderRef.current = loader;

        // Set up status callback
        loader.onStatusUpdate = (status: string, detail?: string) => {
          addLog(`${status}${detail ? ` - ${detail}` : ""}`, "info");
        };

        // Read file as ArrayBuffer
        addLog("Reading APK file...", "info");
        const arrayBuffer = await file.arrayBuffer();

        addLog("Booting Android framework...", "info");

        // Load and execute APK
        try {
          await loader.loadFromBuffer(
            displayRef.current,
            arrayBuffer,
            file.name,
          );
          addLog("APK loaded successfully", "success");
          setState("running");

          // Start performance monitoring
          const interval = setInterval(() => {
            try {
              const stats = loader.getPerformanceStats?.() as any;
              if (stats) {
                setPerfStats({
                  fps: stats.fps || 60,
                  memory: stats.memory || 0,
                  jitCompiles: stats.jitCompiles,
                  gpuKernels: stats.gpuKernels
                });
              }
            } catch {
              clearInterval(interval);
            }
          }, 1000);
        } catch (loadErr: any) {
          console.error("APK load error:", loadErr);
          addLog(`Load failed: ${loadErr.message}`, "error");
          throw loadErr;
        }
      } catch (err: any) {
        const msg = err?.message || "Failed to run APK";
        console.error("APK execution error:", err);
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
      if (!file.name.toLowerCase().endsWith(".apk")) {
        setError("Only .apk files are supported");
        addLog("Invalid file type - expected .apk", "error");
        return;
      }
      void runAPK(file);
    },
    [runAPK, addLog],
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
                <AndroidIcon
                  className="w-6 h-6"
                  style={{ color: "var(--cd-cyan)" }}
                />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ color: "var(--cd-text-primary)" }}
                >
                  Android APK Runner
                </h1>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--cd-text-muted)" }}
                >
                  Run Android apps in your browser via ART runtime
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
                  {(fileSize / 1024 / 1024).toFixed(2)} MB
                </div>
              )}
              <div className="cd-badge">
                <span className="font-semibold">Runtime:</span> ART + WebGPU
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
                    <span className="font-semibold">FPS:</span> {perfStats.fps}
                  </div>
                  <div className="cd-badge">
                    <span className="font-semibold">Memory:</span>{" "}
                    {(perfStats.memory / 1024).toFixed(1)} MB
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
              {/* Display Surface (always mounted) */}
              <div
                ref={displayRef}
                className={`w-full ${isActive ? "h-full min-h-[600px]" : "hidden"}`}
                style={{ background: "var(--cd-void)" }}
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
                      <AndroidIcon
                        className="w-10 h-10"
                        style={{ color: "var(--cd-cyan)" }}
                      />
                    )}
                  </div>

                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: "var(--cd-text-primary)" }}
                  >
                    {isDragging ? "Drop APK here" : "Upload Android APK"}
                  </h3>

                  <p
                    className="text-sm text-center mb-6 max-w-md"
                    style={{ color: "var(--cd-text-secondary)" }}
                  >
                    Drag and drop an APK file, or click to browse. The APK will
                    be executed through the Android Runtime (ART) with WebGPU
                    acceleration.
                  </p>

                  <label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".apk"
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
                      Choose APK File
                    </button>
                  </label>

                  <div
                    className="mt-8 text-xs"
                    style={{ color: "var(--cd-text-muted)" }}
                  >
                    Maximum file size: 500 MB
                  </div>
                </div>
              )}
            </div>

            {/* Info Cards (when idle) */}
            {!isActive && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <InfoCard
                  icon="📦"
                  title="Parse APK"
                  description="Extract and analyze DEX bytecode through ART runtime"
                />
                <InfoCard
                  icon="⚡"
                  title="JIT Compile"
                  description="Convert Dalvik opcodes to WebAssembly for native speed"
                />
                <InfoCard
                  icon="🎨"
                  title="Render UI"
                  description="Android framework renders through WebGPU acceleration"
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
                  <p className="text-xs mt-1">Upload an APK to begin</p>
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
