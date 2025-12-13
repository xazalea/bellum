"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Globe, PackagePlus } from "lucide-react";
import { detectAppType, addInstalledApp, type InstalledApp } from "@/lib/apps/apps-service";
import { chunkedUploadFile } from "@/lib/storage/chunked-upload";
import { publishArchive, subscribePublicArchives, type ArchiveEntry } from "@/lib/archives/archives-service";
import { promoteClusterFileToPublic } from "@/lib/storage/chunked-download";
import { getCachedUsername } from "@/lib/auth/nacho-auth";

function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)} MB`;
  const kb = 1024;
  if (bytes >= kb) return `${(bytes / kb).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function Archives() {
  const username = getCachedUsername();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<ArchiveEntry[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribePublicArchives(setItems);
  }, []);

  const publishFile = async (file: File) => {
    if (!username) {
      setError("Sign in required to publish archives.");
      return;
    }
    setError(null);
    setIsPublishing(true);
    setProgress(0);
    try {
      const res = await chunkedUploadFile(file, {
        compressChunks: true,
        onProgress: (p) => setProgress(Math.round((p.uploadedBytes / p.totalBytes) * 100)),
      });

      // Make it accessible via public file endpoints.
      await promoteClusterFileToPublic(res.fileId);

      const entry = {
        name: file.name.replace(/\.(apk|exe|msi)$/i, ""),
        originalName: file.name,
        type: detectAppType(file.name),
        fileId: res.fileId,
        originalBytes: file.size,
        storedBytes: res.storedBytes,
        publisherUid: username,
        compression: "gzip-chunked" as const,
      };
      await publishArchive(entry);
      setProgress(100);
    } catch (e: any) {
      setError(e?.message || "Publish failed");
    } finally {
      setIsPublishing(false);
      setTimeout(() => setProgress(0), 700);
    }
  };

  const addToApps = async (item: ArchiveEntry) => {
    if (!username) {
      setError("Sign in required to add to Apps.");
      return;
    }
    const app: Omit<InstalledApp, "id"> = {
      name: item.name,
      originalName: item.originalName,
      type: item.type,
      scope: "public",
      originalBytes: item.originalBytes,
      storedBytes: item.storedBytes,
      fileId: item.fileId,
      installedAt: Date.now(),
      compression: item.compression,
    };
    await addInstalledApp(username, app);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Globe className="text-blue-400" />
            Archives
          </h2>
          <p className="text-white/40">{items.length} public items</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".apk,.exe,.msi"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void publishFile(f);
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="bellum-btn-secondary px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35"
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              Publish
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bellum-card p-4 mb-6 border-2 border-red-400/30 bg-red-500/10 text-red-200">
          {error}
        </div>
      )}

      {isPublishing && (
        <div className="bellum-card p-4 mb-6 border-2 border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70 font-mono">Publishing…</span>
            <span className="text-white/70 font-mono">{progress}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((it, i) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className="bellum-card p-6 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center font-bold text-xl">
                {it.name.slice(0, 1).toUpperCase()}
              </div>
              <button
                type="button"
                onClick={() => void addToApps(it)}
                className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 text-white text-xs font-bold inline-flex items-center gap-2"
                title="Add to Apps"
              >
                <PackagePlus size={14} />
                Add
              </button>
            </div>

            <div>
              <div className="font-bold text-lg">{it.name}</div>
              <div className="text-xs text-white/40 mt-1 font-mono">
                {it.type.toUpperCase()} • stored {formatBytes(it.storedBytes)}
              </div>
            </div>

            <div className="pt-4 mt-auto border-t border-white/5 flex justify-between text-xs font-mono text-white/40">
              <span>original {formatBytes(it.originalBytes)}</span>
              <span className="text-white/50">{it.publisherUid.slice(0, 6)}…</span>
            </div>
          </motion.div>
        ))}

        {items.length === 0 && (
          <div className="bellum-card p-10 border-2 border-white/10 col-span-full text-center text-white/50">
            No public archives yet. Publish one to get started.
          </div>
        )}
      </div>
    </div>
  );
}


