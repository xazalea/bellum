'use client';

import { Button } from '@/components/ui/Button';
import { discordDB, type InstalledApp, type UserProfile } from '@/lib/persistence/discord-db';
import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';
import { getProxiedGameUrl } from '@/lib/games-parser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppLibraryManager, type StoredApp } from '@/lib/storage/app-library';
import { puterClient } from '@/lib/storage/hiberfile';
import { RuntimeManager } from '@/lib/engine/runtime-manager';
import { buildStandaloneEmulatorFile, downloadTextFile } from '@/lib/packaging/standalone-emulator';

export default function LibraryPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apps, setApps] = useState<StoredApp[]>([]);
  const [launchingGame, setLaunchingGame] = useState<InstalledApp | null>(null);
  const [launchingLocal, setLaunchingLocal] = useState<StoredApp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [runnerStatus, setRunnerStatus] = useState<string>('Idle');
  const libraryRef = useRef<AppLibraryManager | null>(null);
  const runtimeRef = useRef<RuntimeManager | null>(null);
  const runContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const init = async () => {
      const timeout = setTimeout(() => {
        if (loading) {
          console.error('[Library] Initialization timed out');
          setError('Initialization timed out. Please refresh the page.');
          setLoading(false);
        }
      }, 10000);

      try {
        const fp = await getDeviceFingerprintId();
        const p = await discordDB.init(fp);
        setProfile(p);

        try {
          const lib = new AppLibraryManager(puterClient);
          await lib.init();
          libraryRef.current = lib;
          setApps([...lib.getApps()]);
        } catch (libErr) {
          console.error('[Library] AppLibraryManager failed:', libErr);
        }

        try {
          runtimeRef.current = RuntimeManager.getInstance();
        } catch (runtimeErr) {
          console.error('[Library] RuntimeManager failed:', runtimeErr);
        }
      } catch (err) {
        console.error('[Library] Failed to load library:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize library');
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    init();
  }, []);

  const installedGames = useMemo(() => {
    return (profile?.installedApps || []).filter((a) => a.type === 'game');
  }, [profile]);

  const refreshApps = () => {
    const lib = libraryRef.current;
    if (!lib) return;
    setApps([...lib.getApps()]);
  };

  const installLocal = async (file: File) => {
    const lib = libraryRef.current;
    if (!lib) return;
    try {
      setBusy('install');
      await lib.installApp(file);
      refreshApps();
    } finally {
      setBusy(null);
    }
  };

  const removeLocal = async (appId: string) => {
    const lib = libraryRef.current;
    if (!lib) return;
    if (!confirm('Remove this file from Library?')) return;
    try {
      setBusy(appId);
      await lib.deleteApp(appId);
      refreshApps();
    } finally {
      setBusy(null);
    }
  };

  const removeGame = async (appId: string) => {
    if (!confirm('Uninstall from Library?')) return;
    try {
      setBusy(appId);
      await discordDB.removeApp(appId);
      const updated = await discordDB.getProfile();
      setProfile(updated ? { ...updated } : null);
    } catch (err) {
      console.error('Uninstall failed', err);
      alert('Failed to update Discord account');
    } finally {
      setBusy(null);
    }
  };

  const downloadStandalone = async (app: StoredApp) => {
    const lib = libraryRef.current;
    if (!lib) return;
    try {
      setBusy(`download-${app.id}`);
      if (!app.isActive) {
        await lib.activateApp(app.id);
        refreshApps();
      }
      const freshApp = libraryRef.current?.getApps().find((a) => a.id === app.id) || app;
      const blob = await puterClient.readFile(freshApp.storagePath);
      const binary = await blob.arrayBuffer();
      const lowerName = freshApp.name.toLowerCase();
      const type = lowerName.endsWith('.apk') ? 'apk' : lowerName.endsWith('.exe') ? 'exe' : null;
      if (!type) {
        alert('Only APK or EXE files can be exported.');
        return;
      }
      const html = await buildStandaloneEmulatorFile({
        title: freshApp.name,
        binary,
        type,
      });
      downloadTextFile(`${freshApp.name}.html`, html);
    } catch (error) {
      console.error('Standalone export failed', error);
      alert('Failed to export standalone HTML.');
    } finally {
      setBusy(null);
    }
  };

  const runLocal = async (app: StoredApp) => {
    const lib = libraryRef.current;
    const runtime = runtimeRef.current;
    if (!lib || !runtime) return;

    try {
      setBusy('run');
      setLaunchingLocal(app);
      setRunnerStatus('Initializing…');
      await new Promise((r) => setTimeout(r, 0));

      if (!runContainerRef.current) throw new Error('missing_container');

      if (!app.isActive) {
        setRunnerStatus('Activating from archive…');
        await lib.activateApp(app.id);
        refreshApps();
      }

      const latest = lib.getApps().find((a) => a.id === app.id) || app;
      runContainerRef.current.innerHTML = '';

      runtime.setStatusCallback((status) => {
        setRunnerStatus(`${status.message}${status.detail ? ` (${status.detail})` : ''}`);
        if (status.state === 'error') {
          console.error('Runtime error:', status.detail);
        }
      });

      setRunnerStatus('Analyzing binary…');
      const { type, config } = await runtime.prepareRuntime(latest.storagePath);

      setRunnerStatus(`Launching ${type}…`);
      await runtime.launch(runContainerRef.current, type, latest.storagePath, config);

      const statsInterval = setInterval(() => {
        try {
          const stats = runtime.getStatistics();
          if (stats.instructionsExecuted > 0) {
            setRunnerStatus(
              `Running | ${stats.instructionsExecuted.toLocaleString()} instructions | ` +
              `${(stats.executionTime / 1000).toFixed(2)}s | ` +
              `${(stats.memoryUsed / 1024 / 1024).toFixed(1)} MB`
            );
          }
        } catch (e) {
          clearInterval(statsInterval);
        }
      }, 1000);

      (runtime as any)._statsInterval = statsInterval;
      setRunnerStatus('Running');
    } catch (e) {
      console.error('Failed to launch local app', e);
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Failed to launch file: ${errorMsg}`);
      setLaunchingLocal(null);
      setRunnerStatus(`Error: ${errorMsg}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 border-b border-ocean-border pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ocean-primary">Library</h1>
          <p className="text-sm text-ocean-secondary">Upload APK/EXE — decoded and executed through dedicated compilers.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ocean-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${profile ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <span>{profile ? 'Synced' : 'Offline'}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 p-4 border border-red-500/20 rounded-md flex items-center gap-3 text-sm text-red-400">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <p className="flex-1">{error}</p>
          <Button onClick={() => window.location.reload()} className="text-xs">Retry</Button>
        </div>
      )}

      {/* Runner Overlay */}
      {(launchingGame || launchingLocal) && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between border-b border-ocean-border bg-ocean-bg px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-ocean-primary">
                {launchingGame?.title || launchingLocal?.name}
              </div>
              <div className="text-[11px] text-ocean-muted">{launchingGame ? 'Game' : runnerStatus}</div>
            </div>
            <Button
              onClick={() => {
                try {
                  const runtime = runtimeRef.current;
                  if (runtime) {
                    const statsInterval = (runtime as any)._statsInterval;
                    if (statsInterval) {
                      clearInterval(statsInterval);
                      delete (runtime as any)._statsInterval;
                    }
                    runtime.stop();
                  }
                } catch (e) {
                  console.error('Error stopping runtime:', e);
                }
                setLaunchingGame(null);
                setLaunchingLocal(null);
                setRunnerStatus('Idle');
              }}
              className="border-rose-500/20 text-rose-300 text-xs"
            >
              <span className="material-symbols-outlined mr-1.5 text-[16px]">close</span>
              Close
            </Button>
          </div>
          <div className="flex-grow relative">
            {launchingGame ? (
              <iframe
                src={getProxiedGameUrl(
                  launchingGame.id.startsWith('http') ? launchingGame.id : `https://html5.gamedistribution.com/${launchingGame.id}/`
                )}
                className="w-full h-full border-0"
                title={launchingGame.title}
                allowFullScreen
              />
            ) : (
              <div ref={runContainerRef} className="w-full h-full" />
            )}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
        {/* Uploads */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-ocean-muted uppercase tracking-wider">Uploads</h2>
            <label className="inline-flex">
              <input
                type="file"
                accept=".apk,.exe"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void installLocal(f);
                  e.currentTarget.value = '';
                }}
              />
              <span className="ocean-btn inline-flex items-center text-xs cursor-pointer">
                <span className="material-symbols-outlined mr-1.5 text-[14px]">upload_file</span>
                Upload
              </span>
            </label>
          </div>

          {loading ? (
            <div className="rounded-md border border-ocean-border p-6 text-sm text-ocean-muted">
              Loading…
            </div>
          ) : apps.length === 0 ? (
            <div className="rounded-md border border-ocean-border p-6 text-sm text-ocean-muted">
              No uploads yet. Add an <span className="text-ocean-primary">APK</span> or <span className="text-ocean-primary">EXE</span>.
            </div>
          ) : (
            <div className="space-y-2">
              {apps.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-ocean-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ocean-primary">{a.name}</div>
                    <div className="text-xs text-ocean-muted">
                      {a.isActive ? 'Local' : 'Archived'} · {(a.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => void runLocal(a)} disabled={busy === 'run' || busy === 'install'} className="text-xs">
                      <span className="material-symbols-outlined mr-1 text-[14px]">play_arrow</span>
                      Run
                    </Button>
                    <Button
                      onClick={() => void downloadStandalone(a)}
                      disabled={busy === `download-${a.id}` || busy === 'install'}
                      variant="outline"
                      className="text-xs"
                    >
                      <span className="material-symbols-outlined mr-1 text-[14px]">download</span>
                      HTML
                    </Button>
                    <button
                      onClick={() => void removeLocal(a.id)}
                      disabled={busy === a.id}
                      className="p-1.5 text-ocean-muted hover:text-rose-400 transition-colors disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Games */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-ocean-muted uppercase tracking-wider">Installed Games</h2>
            <Button onClick={() => (window.location.href = '/games')} disabled={busy === 'install'} className="text-xs">
              Browse
            </Button>
          </div>

          {loading ? (
            <div className="rounded-md border border-ocean-border p-6 text-sm text-ocean-muted">
              Loading…
            </div>
          ) : installedGames.length === 0 ? (
            <div className="rounded-md border border-ocean-border p-6 text-sm text-ocean-muted">
              No games installed. Install from <span className="text-ocean-primary">Games</span>.
            </div>
          ) : (
            <div className="space-y-2">
              {installedGames.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-ocean-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ocean-primary">{g.title}</div>
                    <div className="text-xs text-ocean-muted">Installed {new Date(g.installedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setLaunchingGame(g)} disabled={busy === 'install'} className="text-xs">
                      <span className="material-symbols-outlined mr-1 text-[14px]">play_arrow</span>
                      Play
                    </Button>
                    <button
                      onClick={() => void removeGame(g.id)}
                      disabled={busy === g.id}
                      className="p-1.5 text-ocean-muted hover:text-rose-400 transition-colors disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
