"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { Button } from "@/components/ui/button";
import {
  addInstalledApp,
  detectAppType,
  listInstalledApps,
  removeInstalledAppWithCleanup,
  type InstalledApp,
} from "@/lib/apps/apps-service";
import { authService } from "@/lib/firebase/auth-service";
import { executionPipeline } from "@/lib/engine/execution-pipeline";
import { chunkedUploadFile } from "@/lib/storage/chunked-upload";
import { downloadClusterFile } from "@/lib/storage/chunked-download";

type RuntimeState = "idle" | "uploading" | "launching" | "running" | "error";

export function WindowsPage() {
  const [uid, setUid] = useState<string>("");
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [state, setState] = useState<RuntimeState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [activePid, setActivePid] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<{ cpuTime: number; memoryUsage: number; instructionsExecuted: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const metricsTimerRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const sortedApps = useMemo(
    () => [...apps].sort((a, b) => b.installedAt - a.installedAt),
    [apps]
  );

  useEffect(() => {
    void bootstrap();
    return () => {
      void stopRuntime();
    };
  }, []);

  async function bootstrap() {
    try {
      const identity = await authService.ensureIdentity();
      setUid(identity.uid);
      await refreshApps(identity.uid);
    } catch (e: any) {
      setError(e?.message || "Failed to initialize Windows runner");
    }
  }

  async function refreshApps(nextUid: string) {
    const all = await listInstalledApps(nextUid);
    setApps(
      all.filter(
        (app) => app.type === "windows" || /\.(exe|msi)$/i.test(app.originalName)
      )
    );
  }

  async function ensurePipelineInitialized() {
    if (initializedRef.current) return;
    const gpu = (navigator as any).gpu;
    if (!gpu) throw new Error("WebGPU is required for the Windows execution pipeline");

    const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) throw new Error("No compatible GPU adapter found");

    const device = await adapter.requestDevice();
    await executionPipeline.initialize(device);
    initializedRef.current = true;
  }

  function startMetricsPolling(pid: number) {
    if (metricsTimerRef.current !== null) {
      window.clearInterval(metricsTimerRef.current);
    }

    metricsTimerRef.current = window.setInterval(() => {
      const m = executionPipeline.getProcessMetrics(pid);
      if (!m) return;
      setMetrics({
        cpuTime: m.cpuTime,
        memoryUsage: m.memoryUsage,
        instructionsExecuted: m.instructionsExecuted,
      });
    }, 1000);
  }

  async function stopRuntime() {
    if (metricsTimerRef.current !== null) {
      window.clearInterval(metricsTimerRef.current);
      metricsTimerRef.current = null;
    }

    if (initializedRef.current) {
      await executionPipeline.shutdown().catch(() => {});
      initializedRef.current = false;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setActivePid(null);
    setActiveAppId(null);
    setMetrics(null);
    if (state !== "uploading") {
      setState("idle");
      setStatus("Ready");
    }
  }

  async function uploadAndInstall(file: File) {
    if (!uid) return;
    if (!/\.(exe|msi)$/i.test(file.name)) {
      setError("Only .exe or .msi files are supported on this page");
      return;
    }

    setError(null);
    setState("uploading");
    setProgress(0);
    setStatus(`Uploading ${file.name}`);

    try {
      const uploaded = await chunkedUploadFile(file, {
        compressChunks: true,
        onProgress: ({ uploadedBytes, totalBytes }) => {
          setProgress(Math.round((uploadedBytes / Math.max(totalBytes, 1)) * 100));
        },
      });

      await addInstalledApp(uid, {
        name: file.name.replace(/\.(exe|msi)$/i, ""),
        originalName: file.name,
        type: detectAppType(file.name),
        scope: "user",
        originalBytes: file.size,
        storedBytes: uploaded.storedBytes,
        fileId: uploaded.fileId,
        installedAt: Date.now(),
        compression: "gzip-chunked",
      });

      await refreshApps(uid);
      setStatus(`Installed ${file.name}`);
      setState("idle");
      setProgress(0);
    } catch (e: any) {
      setState("error");
      setError(e?.message || "Upload failed");
    }
  }

  async function launchApp(app: InstalledApp) {
    setError(null);
    setState("launching");
    setStatus(`Preparing ${app.originalName}`);
    setActiveAppId(app.id);
    setProgress(0);

    try {
      await stopRuntime();

      const downloaded = await downloadClusterFile(app.fileId, {
        scope: app.scope ?? "user",
        compressedChunks: app.compression === "gzip-chunked",
        onProgress: ({ chunkIndex, totalChunks }) => {
          const pct = Math.round(((chunkIndex + 1) / Math.max(totalChunks, 1)) * 100);
          setProgress(pct);
          setStatus(`Downloading app ${pct}%`);
        },
      });

      const copy = new Uint8Array(downloaded.bytes.byteLength);
      copy.set(downloaded.bytes);
      const objectUrl = URL.createObjectURL(new Blob([copy.buffer], { type: "application/octet-stream" }));
      objectUrlRef.current = objectUrl;

      setStatus("Initializing execution pipeline");
      await ensurePipelineInitialized();

      setStatus("Executing Windows binary");
      const process = await executionPipeline.executeWindows(objectUrl, {
        enableProfiling: true,
        enableMetrics: true,
      });

      setActivePid(process.pid);
      startMetricsPolling(process.pid);
      setState("running");
      setStatus(`Running ${app.name} (PID ${process.pid})`);
    } catch (e: any) {
      setState("error");
      setError(e?.message || "Launch failed");
      setStatus("Launch failed");
      setActiveAppId(null);
    }
  }

  async function removeApp(app: InstalledApp) {
    if (!uid) return;
    try {
      await removeInstalledAppWithCleanup(uid, app);
      if (activeAppId === app.id) {
        await stopRuntime();
      }
      await refreshApps(uid);
    } catch (e: any) {
      setError(e?.message || "Failed to remove app");
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <section className="surface p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold md:text-3xl">Windows Runner</h1>
              <p className="mt-2 text-sm text-foreground/70">
                Upload EXE/MSI binaries, install to your account, and execute them through the Windows pipeline.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".exe,.msi,application/octet-stream"
                className="hidden"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) void uploadAndInstall(file);
                  e.currentTarget.value = "";
                }}
              />
              <Button onClick={() => fileInputRef.current?.click()}>Upload EXE/MSI</Button>
              <Button variant="outline" onClick={() => void stopRuntime()}>
                Stop Runtime
              </Button>
            </div>
          </div>
          <p className="mt-4 text-xs uppercase tracking-wide text-foreground/60">
            State: {state} {progress > 0 && progress < 100 ? `(${progress}%)` : ""}
          </p>
          <p className="mt-1 text-sm text-foreground/70">{status}</p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="surface p-4 md:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">Runtime Diagnostics</h2>
            <div className="mt-3 space-y-2 text-sm text-foreground/75">
              <p>Active PID: {activePid ?? "none"}</p>
              <p>Active App: {activeAppId ?? "none"}</p>
              <p>CPU Time: {metrics ? metrics.cpuTime.toFixed(2) : "0.00"} ms</p>
              <p>Memory Usage: {metrics ? metrics.memoryUsage : 0} bytes</p>
              <p>Instructions: {metrics ? metrics.instructionsExecuted : 0}</p>
            </div>
          </div>

          <div className="surface p-4 md:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">Installed Windows Apps</h2>
            <div className="mt-3 space-y-2">
              {sortedApps.length === 0 ? (
                <p className="rounded-xl border border-dashed border-black/10 bg-white/60 p-3 text-sm text-foreground/70">
                  No EXE/MSI apps installed yet.
                </p>
              ) : (
                sortedApps.map((app) => (
                  <div key={app.id} className="rounded-xl border border-black/10 bg-white/80 p-3">
                    <p className="text-sm font-medium">{app.name}</p>
                    <p className="mt-1 text-xs text-foreground/60">{app.originalName}</p>
                    <p className="mt-1 text-xs text-foreground/60">
                      {(app.originalBytes / (1024 * 1024)).toFixed(2)} MB original • {app.fileId}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => void launchApp(app)}>
                        Launch
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void removeApp(app)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
