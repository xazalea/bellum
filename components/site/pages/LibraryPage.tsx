/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/firebase/auth-service';
import { addInstalledApp, detectAppType, removeInstalledAppWithCleanup, type InstalledApp } from '@/lib/apps/apps-service';
import { chunkedUploadFile } from '@/lib/storage/chunked-upload';
import { opfsHas } from '@/lib/storage/local-opfs';
import { useInstalledApps } from '../hooks/useInstalledApps';

function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)} MB`;
  const kb = 1024;
  if (bytes >= kb) return `${(bytes / kb).toFixed(0)} KB`;
  return `${bytes} B`;
}

type CacheTone = 'ready' | 'cached';

function StatusPill({ tone, label }: { tone: CacheTone; label: string }) {
  const styles =
    tone === 'ready'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : tone === 'cached'
        ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
        : 'bg-amber-500/15 text-amber-200 border-amber-500/30';
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider ${styles}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
      {label.toUpperCase()}
    </span>
  );
}

function Segmented({ labels }: { labels: string[] }) {
  return (
    <div className="flex w-full items-center gap-2 rounded-full border border-white/12 bg-white/5 p-1 backdrop-blur md:w-auto">
      {labels.map((label, idx) => (
        <button
          key={label}
          type="button"
          className={`h-10 rounded-full px-5 text-xs font-semibold transition ${
            idx === 0 ? 'bg-white text-black shadow-[0_10px_18px_rgba(0,0,0,0.35)]' : 'text-white/70 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function LibraryPage() {
  const router = useRouter();
  const { user, apps } = useInstalledApps();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'games' | 'binaries' | 'favorites'>('all');
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<InstalledApp | null>(null);
  const [cacheMap, setCacheMap] = useState<Record<string, boolean>>({});

  const totals = useMemo(() => {
    const stored = apps.reduce((a, x) => a + (x.storedBytes || 0), 0);
    return { storedBytes: stored, count: apps.length };
  }, [apps]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pairs = await Promise.all(
        apps.slice(0, 60).map(async (a) => [a.id, await opfsHas(a.fileId)] as const),
      );
      if (cancelled) return;
      const next: Record<string, boolean> = {};
      for (const [id, ok] of pairs) next[id] = ok;
      setCacheMap(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [apps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...apps];
    if (tab === 'games') list = list.filter((a) => a.type === 'android');
    if (tab === 'binaries') list = list.filter((a) => a.type === 'windows' || a.type === 'unknown');
    if (q) list = list.filter((a) => a.name.toLowerCase().includes(q) || a.originalName.toLowerCase().includes(q));
    return list;
  }, [apps, query, tab]);

  const handlePick = () => inputRef.current?.click();

  const handleInstall = async (file: File) => {
    setError(null);
    setInstalling(true);
    setInstallProgress(0);
    try {
      const u = user ?? (await authService.ensureIdentity());
      const res = await chunkedUploadFile(file, {
        chunkBytes: 32 * 1024 * 1024,
        compressChunks: true,
        onProgress: (p) => setInstallProgress(Math.round((p.uploadedBytes / p.totalBytes) * 100)),
      });
      const type = detectAppType(file.name);
      const name = file.name.replace(/\.(apk|exe|msi)$/i, '');
      const app: Omit<InstalledApp, 'id'> = {
        name,
        originalName: file.name,
        type,
        scope: 'user',
        originalBytes: file.size,
        storedBytes: res.storedBytes,
        fileId: res.fileId,
        installedAt: Date.now(),
        compression: 'gzip-chunked',
      };
      await addInstalledApp(u.uid, app);
      setInstallProgress(100);
    } catch (e: any) {
      setError(e?.message || 'Install failed');
    } finally {
      setInstalling(false);
      setTimeout(() => setInstallProgress(0), 700);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-wide text-white/75">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />
            CLUSTER CONNECTED
          </div>
          <h1 className="mt-5 font-display text-6xl font-black tracking-tight text-white">My Library</h1>
          <div className="font-display text-3xl font-bold tracking-tight text-[#3b82f6]">Games &amp; Binaries</div>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-[340px]">
          <div className="rounded-[1.75rem] border-2 border-white/80 bg-[#070b16]/70 p-5 shadow-[0_26px_90px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-wider text-white/55">STORAGE</div>
                <div className="mt-1 font-display text-3xl font-extrabold text-white">
                  {(totals.storedBytes / (1024 * 1024 * 1024)).toFixed(1)}
                  <span className="text-sm font-semibold text-white/60">GB</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider text-white/55">ITEMS</div>
                <div className="mt-1 font-display text-3xl font-extrabold text-white">{totals.count}</div>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#3b82f6] shadow-[0_0_0_3px_rgba(255,255,255,0.85)]">
                <span className="material-symbols-outlined text-[22px] text-white">cloud</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full items-center gap-2 rounded-full border border-white/12 bg-white/5 p-1 backdrop-blur md:w-auto">
          {[
            { label: 'All Items', value: 'all' as const },
            { label: 'Games', value: 'games' as const },
            { label: 'Binaries', value: 'binaries' as const },
            { label: 'Favorites', value: 'favorites' as const },
          ].map((x, idx) => (
            <button
              key={x.value}
              type="button"
              onClick={() => setTab(x.value)}
              className={`h-10 rounded-full px-5 text-xs font-semibold transition ${
                tab === x.value ? 'bg-white text-black shadow-[0_10px_18px_rgba(0,0,0,0.35)]' : 'text-white/70 hover:text-white'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>

        <div className="flex w-full items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-3 backdrop-blur md:w-[360px]">
          <span className="material-symbols-outlined text-[18px] text-white/50">search</span>
          <input
            className="w-full bg-transparent text-sm font-medium text-white/85 placeholder:text-white/35 outline-none"
            placeholder="Search library..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".apk,.exe,.msi"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleInstall(f);
            e.currentTarget.value = '';
          }}
        />

        {error && (
          <div className="md:col-span-3 rounded-[1.75rem] border border-red-400/30 bg-red-500/10 p-5 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        {installing && (
          <div className="md:col-span-3 rounded-[1.75rem] border border-white/12 bg-white/5 p-5 text-sm font-semibold text-white/80">
            Installing… {installProgress}%
          </div>
        )}

        {filtered.map((app) => {
          const cached = !!cacheMap[app.id];
          const status = cached ? { label: 'Cached', tone: 'cached' as const } : { label: 'Ready', tone: 'ready' as const };
          const icon = app.type === 'android' ? 'smartphone' : app.type === 'windows' ? 'desktop_windows' : 'apps';

          return (
          <div
              key={app.id}
              className="overflow-hidden rounded-[2rem] border-2 border-white/80 bg-[#070b16]/60 p-6 shadow-[0_26px_90px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                  <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-white/10 ring-2 ring-white/15`}>
                    <span className="material-symbols-outlined text-[24px] text-white">{icon}</span>
                  </div>
                  <div>
                    <div className="font-display text-2xl font-bold text-white">{app.name}</div>
                    <div className="text-sm font-semibold text-white/55">
                      {app.originalName} • {formatBytes(app.storedBytes)}
                    </div>
                  </div>
              </div>
                <StatusPill tone={status.tone} label={status.label} />
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => router.push(`/play?appId=${encodeURIComponent(app.id)}`)}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-black shadow-[0_16px_30px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                Run
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                  onClick={() => router.push(`/play?appId=${encodeURIComponent(app.id)}`)}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    settings
                  </span>
                  Details
                </button>
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                  onClick={() => setConfirmDelete(app)}
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Delete
                </button>
              ))}
            </div>
          </div>
          );
        })}

        <div className="relative overflow-hidden rounded-[2rem] border-2 border-white/15 bg-[#070b16]/40 p-8 shadow-[0_26px_90px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/25 to-transparent" />
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center rounded-[1.6rem] border-2 border-dashed border-white/20 bg-white/5">
              <span className="material-symbols-outlined text-[34px] text-white/70">add</span>
            </div>
            <div className="mt-6 font-display text-2xl font-bold text-white">Add New Item</div>
            <div className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-white/55">
              Upload a native binary or install a new game from the global grid.
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePick}
                className="h-11 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
              >
                Install file
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="h-11 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Open full library
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#070b16]/85 p-6 backdrop-blur shadow-[0_26px_90px_rgba(0,0,0,0.65)]">
            <div className="font-display text-2xl font-bold text-white">Delete app</div>
            <div className="mt-2 text-sm font-semibold text-white/60">
              This removes <span className="text-white">{confirmDelete.name}</span> from your library and clears the local cache.
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="h-11 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-11 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
                onClick={async () => {
                  const u = user ?? (await authService.ensureIdentity());
                  const app = confirmDelete;
                  setConfirmDelete(null);
                  await removeInstalledAppWithCleanup(u.uid, app);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


