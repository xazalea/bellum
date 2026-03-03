"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type OSType = "android" | "windows" | null;
type BootState = "idle" | "booting" | "running" | "error";

interface LogEntry {
  message: string;
  level: "info" | "warn" | "error" | "success";
}

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════

function ServerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function AndroidIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.44-.68-3.05-1.06-4.47-1.06-1.42 0-3.03.38-4.47 1.06L5.65 5.67c-.19-.29-.54-.38-.84-.23-.31.16-.42.54-.26.85L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
    </svg>
  );
}

function WindowsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
    </svg>
  );
}

function PowerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
    </svg>
  );
}

function StopIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
    </svg>
  );
}

function TerminalIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function GamepadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function VirtualMachinesPage() {
  const [selectedOS, setSelectedOS] = useState<OSType>(null);
  const [bootState, setBootState] = useState<BootState>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const displayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const bootManagerRef = useRef<any>(null);

  // Add log entry
  const addLog = useCallback((message: string, level: LogEntry["level"] = "info") => {
    setLogs((prev) => [...prev, { message, level }]);
  }, []);

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Shutdown
  const shutdown = useCallback(async () => {
    try {
      await bootManagerRef.current?.shutdown?.();
    } catch {
      // Ignore
    }
    bootManagerRef.current = null;
    setBootState("idle");
    setSelectedOS(null);
    setElapsed(null);
    addLog("System shut down", "info");
  }, [addLog]);

  // Boot Android
  const bootAndroid = useCallback(async () => {
    try {
      setError(null);
      setLogs([]);
      setElapsed(null);
      setSelectedOS("android");
      setBootState("booting");

      const startTime = performance.now();
      addLog("Initializing Android 14...", "info");

      await new Promise((r) => requestAnimationFrame(r));

      const display = displayRef.current;
      if (!display) throw new Error("Display container unavailable");
      display.innerHTML = "";

      addLog("Loading Android boot manager...", "info");

      // Try to load the real boot manager
      try {
        const { androidBootManager } = await import("@/lib/nexus/os/android-boot");
        bootManagerRef.current = androidBootManager;

        addLog("Stage 1: WebGPU + Persistent Kernels", "info");
        addLog("Stage 2: Linux Kernel (init, zygote)", "info");
        addLog("Stage 3: Android Framework services", "info");
        addLog("Stage 4: SystemUI (launcher, status bar)", "info");

        await androidBootManager.boot(display);

        const ms = performance.now() - startTime;
        setElapsed(ms);
        addLog(`Android 14 booted in ${ms.toFixed(0)}ms`, "success");
        setBootState("running");
      } catch (importError) {
        // Demo mode if boot manager not available
        addLog("Boot manager not available - demo mode", "warn");
        
        // Simulate boot
        await new Promise((r) => setTimeout(r, 500));
        addLog("Stage 1: WebGPU + Persistent Kernels", "info");
        await new Promise((r) => setTimeout(r, 300));
        addLog("Stage 2: Linux Kernel (init, zygote)", "info");
        await new Promise((r) => setTimeout(r, 400));
        addLog("Stage 3: Android Framework services", "info");
        await new Promise((r) => setTimeout(r, 300));
        addLog("Stage 4: SystemUI (launcher, status bar)", "info");
        await new Promise((r) => setTimeout(r, 200));

        // Create demo display
        display.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #1a1a2e; color: #00d9ff; font-family: monospace;">
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
              <div style="font-size: 24px;">Android 14</div>
              <div style="font-size: 14px; color: #8b949e; margin-top: 8px;">Demo Mode - ART Runtime</div>
            </div>
          </div>
        `;

        const ms = performance.now() - startTime;
        setElapsed(ms);
        addLog(`Android 14 booted in ${ms.toFixed(0)}ms (demo)`, "success");
        setBootState("running");
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to boot Android";
      setError(msg);
      setBootState("error");
      addLog(`Error: ${msg}`, "error");
    }
  }, [addLog]);

  // Boot Windows
  const bootWindows = useCallback(async () => {
    try {
      setError(null);
      setLogs([]);
      setElapsed(null);
      setSelectedOS("windows");
      setBootState("booting");

      const startTime = performance.now();
      addLog("Initializing Windows NT...", "info");

      await new Promise((r) => requestAnimationFrame(r));

      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas unavailable");
      canvas.width = canvas.clientWidth || 1024;
      canvas.height = canvas.clientHeight || 768;

      addLog("Loading Win32 subsystem...", "info");

      // Try to load the real runtime
      try {
        const { WebGPUContext } = await import("@/lib/challenger/gpu/webgpu");
        const { WindowsRuntime } = await import("@/lib/challenger/windows/runtime");

        const gpu = new WebGPUContext(canvas);
        try {
          await gpu.initialize();
          addLog("WebGPU initialized", "success");
        } catch {
          addLog("WebGPU unavailable — using Canvas 2D fallback", "warn");
        }

        const runtime = new WindowsRuntime(gpu);
        runtime.setCanvas(canvas);
        bootManagerRef.current = runtime;

        addLog("Booting Win32 subsystem (Kernel32 + User32 + GDI)...", "info");
        await runtime.boot();
        addLog("Kernel32 · User32 · GDI loaded", "success");

        const ms = performance.now() - startTime;
        setElapsed(ms);
        addLog(`Windows booted in ${ms.toFixed(0)}ms`, "success");
        setBootState("running");
      } catch (importError) {
        // Demo mode if runtime not available
        addLog("Runtime not available - demo mode", "warn");

        // Simulate boot
        await new Promise((r) => setTimeout(r, 500));
        addLog("Loading Kernel32.dll...", "info");
        await new Promise((r) => setTimeout(r, 300));
        addLog("Loading User32.dll...", "info");
        await new Promise((r) => setTimeout(r, 400));
        addLog("Loading GDI32.dll...", "info");
        await new Promise((r) => setTimeout(r, 300));
        addLog("Initializing DirectX → WebGPU translation", "info");
        await new Promise((r) => setTimeout(r, 200));

        // Draw demo on canvas
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#001d3d";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.fillStyle = "#00d9ff";
          ctx.font = "24px monospace";
          ctx.textAlign = "center";
          ctx.fillText("Windows NT", canvas.width / 2, canvas.height / 2 - 20);
          
          ctx.fillStyle = "#8b949e";
          ctx.font = "14px monospace";
          ctx.fillText("Demo Mode - NTR Engine", canvas.width / 2, canvas.height / 2 + 20);
        }

        const ms = performance.now() - startTime;
        setElapsed(ms);
        addLog(`Windows NT booted in ${ms.toFixed(0)}ms (demo)`, "success");
        setBootState("running");
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to boot Windows";
      setError(msg);
      setBootState("error");
      addLog(`Error: ${msg}`, "error");
    }
  }, [addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shutdown();
    };
  }, [shutdown]);

  const isActive = bootState === "booting" || bootState === "running";

  return (
    <div className="min-h-screen" style={{ background: "var(--cd-abyss)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--cd-border-default)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{
                  background: "var(--cd-cyan-muted)",
                  border: "1px solid var(--cd-cyan-border)"
                }}
              >
                <ServerIcon className="w-6 h-6" style={{ color: "var(--cd-cyan)" }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--cd-text-primary)" }}>
                  Virtual Machines
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--cd-text-muted)" }}>
                  Boot full operating systems in your browser
                </p>
              </div>
            </div>

            {isActive && (
              <button
                onClick={shutdown}
                className="cd-btn cd-btn-danger flex items-center gap-2"
              >
                <StopIcon className="w-4 h-4" />
                Shut Down
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="cd-alert cd-alert-error">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Boot Error</p>
              <p className="text-sm mt-1 opacity-80">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="cd-btn cd-btn-ghost text-xs">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Status Bar */}
      {isActive && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="cd-card flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: "var(--cd-text-muted)" }}>OS:</span>
              <span className="text-sm font-medium" style={{ color: "var(--cd-text-primary)" }}>
                {selectedOS === "android" ? "Android 14" : "Windows NT"}
              </span>
            </div>
            {elapsed !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "var(--cd-text-muted)" }}>Boot:</span>
                <span className="text-sm font-medium" style={{ color: "var(--cd-text-primary)" }}>
                  {elapsed.toFixed(0)}ms
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: "var(--cd-text-muted)" }}>Status:</span>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: bootState === "running" ? "rgba(63, 185, 80, 0.1)" : "rgba(210, 153, 34, 0.1)",
                  color: bootState === "running" ? "var(--cd-success)" : "var(--cd-warning)"
                }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${bootState === "running" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`}
                />
                {bootState === "booting" ? "Booting..." : "Running"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isActive ? (
          /* OS Selection */
          <div className="space-y-8">
            {/* Main OS Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Android Card */}
              <div
                className="cd-card group cursor-pointer overflow-hidden"
                style={{ padding: 0 }}
                onClick={bootAndroid}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: "rgba(0, 230, 184, 0.1)", border: "1px solid rgba(0, 230, 184, 0.2)" }}
                    >
                      <AndroidIcon className="w-8 h-8" style={{ color: "var(--cd-emerald)" }} />
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: "rgba(0, 230, 184, 0.1)", border: "1px solid rgba(0, 230, 184, 0.2)", color: "var(--cd-emerald)" }}
                    >
                      ART Runtime
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-2" style={{ color: "var(--cd-text-primary)" }}>
                    Android 14
                  </h3>
                  <p className="text-sm mb-4" style={{ color: "var(--cd-text-secondary)" }}>
                    Full AOSP framework with SystemUI, SurfaceFlinger compositing, Binder IPC, and Dalvik JIT compilation.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {["Android Framework", "ART JIT → WASM", "SurfaceFlinger", "Binder IPC"].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded text-xs"
                        style={{ background: "var(--cd-elevated)", color: "var(--cd-text-muted)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button className="cd-btn cd-btn-primary w-full flex items-center justify-center gap-2">
                    <PowerIcon className="w-4 h-4" />
                    Boot Android
                  </button>
                </div>
              </div>

              {/* Windows Card */}
              <div
                className="cd-card group cursor-pointer overflow-hidden"
                style={{ padding: 0 }}
                onClick={bootWindows}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: "var(--cd-cyan-muted)", border: "1px solid var(--cd-cyan-border)" }}
                    >
                      <WindowsIcon className="w-8 h-8" style={{ color: "var(--cd-cyan)" }} />
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: "var(--cd-cyan-muted)", border: "1px solid var(--cd-cyan-border)", color: "var(--cd-cyan)" }}
                    >
                      NTR Engine
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-2" style={{ color: "var(--cd-text-primary)" }}>
                    Windows NT
                  </h3>
                  <p className="text-sm mb-4" style={{ color: "var(--cd-text-secondary)" }}>
                    Win32 subsystem with Kernel32, User32, GDI32, and DirectX→WebGPU translation layer.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {["Win32 Subsystem", "Kernel32 + GDI", "DirectX → WebGPU", "PE Loader"].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded text-xs"
                        style={{ background: "var(--cd-elevated)", color: "var(--cd-text-muted)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button className="cd-btn cd-btn-primary w-full flex items-center justify-center gap-2">
                    <PowerIcon className="w-4 h-4" />
                    Boot Windows
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--cd-text-primary)" }}>
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  href="/android"
                  className="cd-card group flex items-center gap-4 hover:border-[var(--cd-emerald)] transition-colors"
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: "rgba(0, 230, 184, 0.1)" }}
                  >
                    <AndroidIcon className="w-5 h-5" style={{ color: "var(--cd-emerald)" }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm" style={{ color: "var(--cd-text-primary)" }}>
                      Run APK Directly
                    </h4>
                    <p className="text-xs" style={{ color: "var(--cd-text-muted)" }}>
                      Skip the full OS
                    </p>
                  </div>
                  <ArrowRightIcon className="w-4 h-4" style={{ color: "var(--cd-text-muted)" }} />
                </Link>

                <Link
                  href="/windows"
                  className="cd-card group flex items-center gap-4 hover:border-[var(--cd-cyan)] transition-colors"
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: "var(--cd-cyan-muted)" }}
                  >
                    <WindowsIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm" style={{ color: "var(--cd-text-primary)" }}>
                      Run EXE Directly
                    </h4>
                    <p className="text-xs" style={{ color: "var(--cd-text-muted)" }}>
                      Skip the full OS
                    </p>
                  </div>
                  <ArrowRightIcon className="w-4 h-4" style={{ color: "var(--cd-text-muted)" }} />
                </Link>

                <Link
                  href="/games"
                  className="cd-card group flex items-center gap-4 hover:border-[var(--cd-purple)] transition-colors"
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: "var(--cd-purple-muted)" }}
                  >
                    <GamepadIcon className="w-5 h-5" style={{ color: "var(--cd-purple)" }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm" style={{ color: "var(--cd-text-primary)" }}>
                      Browse Games
                    </h4>
                    <p className="text-xs" style={{ color: "var(--cd-text-muted)" }}>
                      20,000+ games ready
                    </p>
                  </div>
                  <ArrowRightIcon className="w-4 h-4" style={{ color: "var(--cd-text-muted)" }} />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Active VM Display */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
            {/* Display */}
            <div
              className="cd-card overflow-hidden"
              style={{ padding: 0 }}
            >
              {/* Status Bar */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: "var(--cd-border-muted)" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${bootState === "running" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`}
                  />
                  <span className="text-sm" style={{ color: "var(--cd-text-muted)" }}>
                    {bootState === "booting" ? "Booting..." : "Running"}
                  </span>
                  <span className="text-sm" style={{ color: "var(--cd-text-subtle)" }}>|</span>
                  <span className="text-sm" style={{ color: "var(--cd-text-muted)" }}>
                    {selectedOS === "android" ? "Android 14" : "Windows NT"}
                  </span>
                </div>
                <span
                  className="text-xs font-mono"
                  style={{ color: "var(--cd-text-subtle)" }}
                >
                  {selectedOS === "android" ? "ART Runtime" : "NTR Engine"}
                </span>
              </div>

              {/* Display Area */}
              <div className="relative bg-black">
                {selectedOS === "android" && (
                  <div
                    ref={displayRef}
                    className="w-full"
                    style={{ height: "60vh", minHeight: "400px" }}
                  />
                )}
                {selectedOS === "windows" && (
                  <canvas
                    ref={canvasRef}
                    className="w-full"
                    style={{ height: "60vh", minHeight: "400px" }}
                  />
                )}
              </div>
            </div>

            {/* Log Panel */}
            <div
              className="cd-card flex flex-col"
              style={{ padding: 0 }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: "var(--cd-border-muted)" }}
              >
                <div className="flex items-center gap-2">
                  <TerminalIcon className="w-4 h-4" style={{ color: "var(--cd-cyan)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--cd-text-primary)" }}>
                    Boot Log
                  </span>
                </div>
                <span
                  className="text-xs font-mono"
                  style={{ color: "var(--cd-text-subtle)" }}
                >
                  {logs.length} entries
                </span>
              </div>
              <div
                className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1"
                style={{ height: "60vh", minHeight: "400px" }}
              >
                {logs.length === 0 ? (
                  <div style={{ color: "var(--cd-text-muted)" }}>Waiting for boot sequence...</div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      style={{
                        color: log.level === "error"
                          ? "var(--cd-error)"
                          : log.level === "warn"
                          ? "var(--cd-warning)"
                          : log.level === "success"
                          ? "var(--cd-success)"
                          : "var(--cd-text-muted)"
                      }}
                    >
                      <span style={{ color: "var(--cd-text-subtle)" }}>
                        [{new Date().toLocaleTimeString()}]
                      </span>{" "}
                      {log.message}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}