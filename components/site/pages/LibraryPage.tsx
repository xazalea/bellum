/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/firebase/auth-service';
import { addInstalledApp, detectAppType, removeInstalledAppWithCleanup, type InstalledApp } from '@/lib/apps/apps-service';
import { chunkedUploadFile } from '@/lib/storage/chunked-upload';
import { opfsHas } from '@/lib/storage/local-opfs';
import { useInstalledApps } from '../hooks/useInstalledApps';
import { Card } from '@/components/nacho-ui/Card';
import { Button } from '@/components/nacho-ui/Button';
import { GlobalSearch } from '@/components/nacho-ui/GlobalSearch';
import { StatusIndicator } from '@/components/nacho-ui/StatusIndicator';
import { Cloud, Search, Play, Settings, Trash2, Plus, Smartphone, Monitor, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)} MB`;
  const kb = 1024;
  if (bytes >= kb) return `${(bytes / kb).toFixed(0)} KB`;
  return `${bytes} B`;
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
    <div className="flex flex-col gap-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pt-10">
        <div className="space-y-4">
          <StatusIndicator status="active" label="Cluster Connected" />
          <div>
            <h1 className="text-5xl font-black font-display tracking-tight text-white">My Library</h1>
            <div className="text-3xl font-bold tracking-tight text-nacho-primary">Games & Binaries</div>
          </div>
        </div>

        {/* Stats Card */}
        <Card className="w-full md:w-[340px] !p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-wider text-nacho-subtext/60 mb-1">STORAGE</div>
              <div className="font-display text-3xl font-extrabold text-white">
                {(totals.storedBytes / (1024 * 1024 * 1024)).toFixed(1)}
                <span className="text-sm font-semibold text-nacho-subtext ml-1">GB</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-wider text-nacho-subtext/60 mb-1">ITEMS</div>
              <div className="font-display text-3xl font-extrabold text-white">{totals.count}</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-nacho-primary flex items-center justify-center text-nacho-bg shadow-glow">
              <Cloud size={24} strokeWidth={2.5} />
            </div>
          </div>
        </Card>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full items-center gap-1 rounded-full border border-nacho-border bg-nacho-card p-1 md:w-auto">
          {[
            { label: 'All Items', value: 'all' as const },
            { label: 'Games', value: 'games' as const },
            { label: 'Binaries', value: 'binaries' as const },
            { label: 'Favorites', value: 'favorites' as const },
          ].map((x) => (
            <button
              key={x.value}
              type="button"
              onClick={() => setTab(x.value)}
              className={cn(
                "h-10 rounded-full px-5 text-xs font-semibold transition-all duration-200",
                tab === x.value 
                  ? "bg-white text-nacho-bg shadow-sm" 
                  : "text-nacho-subtext hover:text-white hover:bg-white/5"
              )}
            >
              {x.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-[360px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-nacho-subtext group-focus-within:text-nacho-primary transition-colors" />
          <input
            className="w-full h-12 pl-10 pr-4 rounded-full bg-nacho-card border border-nacho-border text-sm font-medium text-white placeholder:text-nacho-subtext/50 focus:outline-none focus:border-nacho-primary/50 focus:bg-nacho-card-hover transition-all"
            placeholder="Search library..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
          <div className="md:col-span-3 rounded-[1.75rem] border border-red-500/20 bg-red-500/10 p-5 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        {installing && (
          <Card className="md:col-span-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Installing...</span>
            <span className="font-mono text-nacho-primary">{installProgress}%</span>
          </Card>
        )}

        {/* Add New Item Card */}
        <Card className="relative overflow-hidden group border-dashed border-2 bg-transparent hover:bg-nacho-card-hover transition-colors">
          <div className="flex flex-col h-full justify-between gap-6">
            <div>
              <div className="h-14 w-14 rounded-2xl bg-nacho-card border border-nacho-border flex items-center justify-center text-nacho-subtext mb-6 group-hover:text-white group-hover:border-nacho-primary/50 transition-colors">
                <Plus size={28} />
              </div>
              <div className="font-display text-2xl font-bold text-white">Add New Item</div>
              <p className="mt-2 text-sm font-medium text-nacho-subtext leading-relaxed">
                Upload a native binary or install a new game from the global grid.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button onClick={handlePick} className="w-full">
                Install File
              </Button>
              <Button variant="secondary" onClick={() => router.push('/')} className="w-full">
                Open Full Library
              </Button>
            </div>
          </div>
        </Card>

        {filtered.map((app) => {
          const cached = !!cacheMap[app.id];
          const status = cached ? 'info' : 'active';
          const label = cached ? 'Cached' : 'Ready';
          const Icon = app.type === 'android' ? Smartphone : app.type === 'windows' ? Monitor : Grid;

          return (
            <Card key={app.id} className="group relative overflow-hidden hover:border-nacho-primary/30">
              <div className="flex items-start justify-between mb-6">
                <div className="h-14 w-14 rounded-2xl bg-nacho-card-hover border border-nacho-border flex items-center justify-center text-white">
                  <Icon size={24} />
                </div>
                <StatusIndicator status={status as any} label={label} />
              </div>

              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-white mb-1 truncate">{app.name}</h3>
                <div className="text-xs font-medium text-nacho-subtext truncate">
                  {app.originalName} • {formatBytes(app.storedBytes)}
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => router.push(`/play?appId=${encodeURIComponent(app.id)}`)}
                  className="w-full gap-2"
                >
                  <Play size={16} fill="currentColor" /> Run
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" size="sm" onClick={() => router.push(`/play?appId=${encodeURIComponent(app.id)}`)}>
                    <Settings size={14} /> Details
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(app)} className="hover:text-red-400 hover:border-red-400/30">
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-2xl border-nacho-border-strong">
            <h2 className="font-display text-2xl font-bold text-white mb-2">Delete app</h2>
            <p className="text-sm text-nacho-subtext mb-6">
              This removes <span className="text-white font-semibold">{confirmDelete.name}</span> from your library and clears the local cache.
            </p>
            
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button 
                className="bg-red-500 hover:bg-red-600 text-white border-none shadow-none"
                onClick={async () => {
                  const u = user ?? (await authService.ensureIdentity());
                  const app = confirmDelete;
                  setConfirmDelete(null);
                  await removeInstalledAppWithCleanup(u.uid, app);
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
