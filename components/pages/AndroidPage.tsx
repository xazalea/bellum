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
import { APKLoader } from "@/lib/engine/loaders/apk-loader";
import { chunkedUploadFile } from "@/lib/storage/chunked-upload";
import { downloadClusterFile } from "@/lib/storage/chunked-download";

type RuntimeState = "idle" | "uploading" | "launching" | "running" | "error";

export function AndroidPage() {
  const [uid, setUid] = useState<string>("");
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [state, setState] = useState<RuntimeState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const runnerRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<APKLoader | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  const sortedApps = useMemo(
    () => [...apps].sort((a, b) => b.installedAt - a.installedAt),
    [apps]
  );

  useEffect(() => {
    void bootstrap();
    return () => {
      stopRuntime();
    };
  }, []);

  async function bootstrap() {
    try {
      const identity = await authService.ensureIdentity();
      setUid(identity.uid);
      await refreshApps(identity.uid);
    } catch (e: any) {
      setError(e?.message || "Failed to initialize Android runner");
    }
  }

  async function refreshApps(nextUid: string) {
    const all = await listInstalledApps(nextUid);
    setApps(all.filter((app) => app.type === "android" || app.originalName.toLowerCase().endsWith(".apk")));
  }

  function stopRuntime() {
    loaderRef.current?.stop();
    loaderRef.current = null;
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    setActiveAppId(null);
    if (state !== "uploading") {
      setState("idle");
      setStatus("Ready");
    }
  }

  async function uploadAndInstall(file: File) {
    if (!uid) return;
    if (!file.name.toLowerCase().endsWith(".apk")) {
      setError("Only .apk files are supported on this page");
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
        name: file.name.replace(/\.apk$/i, ""),
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
    if (!runnerRef.current) return;

    stopRuntime();
    setError(null);
    setState("launching");
    setStatus(`Preparing ${app.originalName}`);
    setActiveAppId(app.id);

    try {
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
      const objectUrl = URL.createObjectURL(
        new Blob([copy.buffer], { type: "application/vnd.android.package-archive" })
      );
      activeObjectUrlRef.current = objectUrl;

      const loader = new APKLoader();
      loader.onStatusUpdate = (nextStatus, detail) => {
        setStatus(detail ? `${nextStatus}: ${detail}` : nextStatus);
      };
      loaderRef.current = loader;

      await loader.load(runnerRef.current, objectUrl);
      setState("running");
      setStatus(`Running ${app.name}`);
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
      if (activeAppId === app.id) stopRuntime();
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
              <h1 className="text-2xl font-semibold md:text-3xl">Android Runner</h1>
              <p className="mt-2 text-sm text-foreground/70">
                Upload APKs to your storage backend, install to your account, then launch through the Android runtime.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                className="hidden"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) void uploadAndInstall(file);
                  e.currentTarget.value = "";
                }}
              />
              <Button onClick={() => fileInputRef.current?.click()}>Upload APK</Button>
              <Button variant="outline" onClick={stopRuntime}>
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
          <div className="surface p-3 md:p-4">
            <div
              ref={runnerRef}
              className="min-h-[460px] w-full overflow-hidden rounded-xl border border-black/10 bg-black"
            />
          </div>

          <div className="surface p-4 md:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">Installed Android Apps</h2>
            <div className="mt-3 space-y-2">
              {sortedApps.length === 0 ? (
                <p className="rounded-xl border border-dashed border-black/10 bg-white/60 p-3 text-sm text-foreground/70">
                  No APKs installed yet.
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
