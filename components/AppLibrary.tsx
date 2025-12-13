"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Link as LinkIcon, ExternalLink, MoreVertical, Smartphone, Monitor, Play, Trash2 } from "lucide-react";
import { authService } from "@/lib/firebase/auth-service";
import { addInstalledApp, detectAppType, removeInstalledAppWithCleanup, type InstalledApp, subscribeInstalledApps } from "@/lib/apps/apps-service";
import { chunkedUploadFile } from "@/lib/storage/chunked-upload";

function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)} MB`;
  const kb = 1024;
  if (bytes >= kb) return `${(bytes / kb).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function AppLibrary({
  onRunApp,
}: {
  onRunApp?: (appId: string) => void;
}) {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState<string>("");

  const inputRef = useRef<HTMLInputElement | null>(null);

  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!user) return;
    return subscribeInstalledApps(user.uid, setApps);
  }, [user]);

  const installedCount = apps.length;

  const handlePick = () => inputRef.current?.click();

  const handleInstall = async (file: File) => {
    if (!user) {
      setError("Sign in required to install apps.");
      return;
    }
    setError(null);
    setIsInstalling(true);
    setInstallProgress(0);

    try {
      const res = await chunkedUploadFile(file, {
        chunkBytes: 32 * 1024 * 1024,
        compressChunks: true,
        onProgress: (p) => {
          setInstallProgress(Math.round((p.uploadedBytes / p.totalBytes) * 100));
        },
      });

      const type = detectAppType(file.name);
      const displayName = file.name.replace(/\.(apk|exe|msi)$/i, "");

      const app: Omit<InstalledApp, "id"> = {
        name: displayName,
        originalName: file.name,
        type,
        scope: "user",
        originalBytes: file.size,
        storedBytes: res.storedBytes,
        fileId: res.fileId,
        installedAt: Date.now(),
        compression: "gzip-chunked",
      };

      await addInstalledApp(user.uid, app);
      setInstallProgress(100);
    } catch (e: any) {
      setError(e?.message || "Install failed");
    } finally {
      setIsInstalling(false);
      setTimeout(() => setInstallProgress(0), 700);
    }
  };

  const handleInstallFromUrl = async () => {
    if (!user) {
      setError("Sign in required to install apps.");
      return;
    }
    setError(null);
    setIsInstalling(true);
    setInstallProgress(0);
    try {
      const url = new URL(urlInput.trim());
      // Many download links (like Softonic post-download pages) trigger a browser download
      // but cannot be fetched due to CORS. Prefer "download then pick file" flow.
      const triggerDownload = () => {
        const a = document.createElement("a");
        a.href = url.toString();
        a.target = "_blank";
        a.rel = "noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      };

      const showPicker =
        typeof window !== "undefined" &&
        "showOpenFilePicker" in window &&
        typeof (window as any).showOpenFilePicker === "function";

      // If the URL is same-origin, try direct fetch first (fast path).
      if (url.origin === window.location.origin) {
        const res = await fetch(url.toString(), { method: "GET" });
        if (!res.ok) throw new Error(`Download failed (${res.status})`);
        const ct = res.headers.get("content-type") || "";
        const guessedName = decodeURIComponent(url.pathname.split("/").pop() || "download.bin");
        const bytes = await res.arrayBuffer();
        const file = new File([bytes], guessedName, { type: ct || "application/octet-stream" });
        await handleInstall(file);
        return;
      }

      // Otherwise: start browser download and ask user to pick it from Downloads.
      triggerDownload();
      setInstallProgress(15);

      if (!showPicker) {
        throw new Error(
          "Download started in a new tab. When it finishes, click Install and choose the file from your Downloads folder.",
        );
      }

      setInstallProgress(25);
      const picker = (window as any).showOpenFilePicker as (opts: any) => Promise<any[]>;
      const handles = await picker({
        multiple: false,
        // Chromium supports starting in Downloads.
        startIn: "downloads",
        types: [
          {
            description: "Apps",
            accept: {
              "application/octet-stream": [".apk", ".exe", ".msi", ".xapk"],
            },
          },
        ],
        excludeAcceptAllOption: true,
      });
      const file = await handles[0].getFile();
      setInstallProgress(40);
      await handleInstall(file);
    } catch (e: any) {
      setError(e?.message || "Install from URL failed");
    } finally {
      setIsInstalling(false);
      setTimeout(() => setInstallProgress(0), 700);
    }
  };

  const officialApps = useMemo(
    () => [
      {
        name: "Roblox (Android)",
        url: "https://en.softonic.com/download/roblox/android/post-download?dt=internalDownload",
      },
      {
        name: "Minecraft: Bedrock Edition (Android)",
        url: "https://en.softonic.com/download/minecraft/android/post-download?dt=landingDownload",
      },
      {
        name: "Brawl Stars (Android)",
        url: "https://en.softonic.com/download/brawl-stars/android/post-download/v/55.211?dt=internalDownload",
      },
      {
        name: "Fortnite (Android)",
        url: "https://en.softonic.com/download/fortnite/android/post-download/v/35.10.0-42471790-android?dt=internalDownload",
      },
    ],
    [],
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold">Apps</h2>
          <p className="text-white/40">{installedCount} installed</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".apk,.exe,.msi"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleInstall(f);
              e.currentTarget.value = "";
            }}
          />

          <button
            type="button"
            onClick={handlePick}
            className="bellum-btn-secondary px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35"
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} />
              Install
            </span>
          </button>
        </div>
      </div>

      {/* Install from URL */}
      <div className="bellum-card p-6 mb-6 border-2 border-white/10">
        <div className="flex items-center justify-between gap-4 flex-col md:flex-row">
          <div className="w-full">
            <div className="text-sm font-bold text-white/90 mb-2 inline-flex items-center gap-2">
              <LinkIcon size={16} className="text-blue-300" />
              Install from URL
            </div>
            <input
              className="bellum-input"
              placeholder="https://… (download link or direct file)"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <div className="text-xs text-white/35 mt-2">
              Tip: if the link triggers a browser download, we’ll ask you to pick the downloaded file from Downloads.
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleInstallFromUrl()}
            className="px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm w-full md:w-auto"
          >
            Download → Pick → Install
          </button>
        </div>
      </div>

      {/* Official apps (links) */}
      <div className="bellum-card p-6 mb-8 border-2 border-white/10">
        <div className="text-sm font-bold text-white/90 mb-4 inline-flex items-center gap-2">
          <ExternalLink size={16} className="text-purple-300" />
          Official apps
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {officialApps.map((a) => (
            <div key={a.url} className="bg-white/5 border-2 border-white/10 rounded-xl p-4 flex flex-col gap-3">
              <div className="font-bold text-white">{a.name}</div>
              <div className="text-[11px] text-white/40 font-mono break-all">{a.url}</div>
              <div className="flex gap-2 mt-auto">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 text-xs font-bold inline-flex items-center gap-2"
                >
                  <ExternalLink size={14} />
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput(a.url);
                    void handleInstallFromUrl();
                  }}
                  className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 text-xs font-bold inline-flex items-center gap-2"
                  title="Start download, then pick the file to install"
                >
                  <Download size={14} />
                  Download & pick
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-white/35 mt-3">
          Note: these are third‑party download pages. We’ll open the download and then prompt you to pick the file from Downloads.
        </div>
      </div>

      {error && (
        <div className="bellum-card p-4 mb-6 border-2 border-red-400/30 bg-red-500/10 text-red-200">
          {error}
        </div>
      )}

      {isInstalling && (
        <div className="bellum-card p-4 mb-6 border-2 border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70 font-mono">Installing…</span>
            <span className="text-white/70 font-mono">{installProgress}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${installProgress}%` }} />
          </div>
        </div>
      )}

      {/* App Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {apps.map((app, i) => (
            <motion.div
                key={app.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bellum-card p-6 flex flex-col gap-4 group cursor-pointer relative"
            >
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold
                        ${app.type === 'android' ? 'bg-green-500/10 text-green-400' : app.type === 'windows' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-white/70'}`}>
                        {app.name.slice(0, 1).toUpperCase()}
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded">
                      <MoreVertical size={16} />
                    </button>
                </div>

                {/* Info */}
                <div>
                    <h3 className="font-bold text-lg group-hover:text-blue-300 transition-colors">{app.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                        {app.type === 'android' ? <Smartphone size={12} /> : <Monitor size={12} />}
                        <span className="uppercase">{app.type}</span>
                    </div>
                </div>

                {/* Actions (Slide up on hover) */}
                <div className="pt-4 mt-auto border-t border-white/5 flex items-center justify-between gap-3">
                  <div className="text-xs font-mono text-white/40">
                    <div>original {formatBytes(app.originalBytes)}</div>
                    <div>stored {formatBytes(app.storedBytes)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRunApp?.(app.id);
                      }}
                      className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 text-white text-xs font-bold inline-flex items-center gap-2"
                      title="Run"
                    >
                      <Play size={14} />
                      Run
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!user) return;
                        const ok = window.confirm(`Remove "${app.name}"?`);
                        if (!ok) return;
                        void removeInstalledAppWithCleanup(user.uid, app).catch((err: any) => {
                          setError(err?.message || "Remove failed");
                        });
                      }}
                      className="p-2 rounded-xl border-2 border-white/10 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 text-white/80"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
            </motion.div>
        ))}
        
        {/* Add New Card */}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bellum-card border-dashed border-white/10 flex flex-col items-center justify-center gap-4 min-h-[200px] hover:border-white/40 cursor-pointer"
            onClick={handlePick}
        >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Download size={24} className="text-white/60" />
            </div>
            <p className="font-medium text-white/60">Install local file</p>
        </motion.div>
      </div>
    </div>
  );
}
