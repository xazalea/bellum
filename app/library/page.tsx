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
      // Set timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        if (loading) {
          console.error('[Library] Initialization timed out');
          setError('Initialization timed out. Please refresh the page.');
          setLoading(false);
        }
      }, 10000); // 10 second timeout

      try {
        console.log('[Library] Starting initialization...');
        
        // Initialize Discord profile
        const fp = await getDeviceFingerprintId();
        console.log('[Library] Got fingerprint:', fp);
        
        const p = await discordDB.init(fp);
        console.log('[Library] Discord profile loaded');
        setProfile(p);

        // Initialize app library
        try {
          console.log('[Library] Initializing AppLibraryManager...');
          const lib = new AppLibraryManager(puterClient);
          await lib.init();
          libraryRef.current = lib;
          setApps([...lib.getApps()]);
          console.log('[Library] AppLibraryManager initialized with', lib.getApps().length, 'apps');
        } catch (libErr) {
          console.error('[Library] AppLibraryManager failed, continuing without it:', libErr);
          // Don't fail completely, just log the error
        }

        // Initialize runtime manager
        try {
          console.log('[Library] Initializing RuntimeManager...');
          runtimeRef.current = RuntimeManager.getInstance();
          console.log('[Library] RuntimeManager initialized');
        } catch (runtimeErr) {
          console.error('[Library] RuntimeManager failed, continuing without it:', runtimeErr);
          // Don't fail completely, just log the error
        }
        
        console.log('[Library] Initialization complete');
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

      // If archived to cold store, restore first.
      if (!app.isActive) {
        await lib.activateApp(app.id);
        refreshApps();
      }

      // Reload latest app entry (storagePath may have changed during activation)
      const latest = lib.getApps().find((a) => a.id === app.id) || app;

      runContainerRef.current.innerHTML = '';
      const { type, config } = await runtime.prepareRuntime(latest.storagePath);
      setRunnerStatus(`Launching (${type})…`);
      await runtime.launch(runContainerRef.current, type, latest.storagePath, config);

      // Attach best-effort status hooks for loaders that expose them (e.g. NachoLoader).
      try {
        const loader = runtime.getActiveLoader?.();
        if (loader && typeof loader === 'object') {
          if ('onStatusUpdate' in loader) {
            (loader as any).onStatusUpdate = (status: string, detail?: string) => {
              setRunnerStatus(`${status}${detail ? `: ${detail}` : ''}`);
            };
          }
        }
      } catch {
        // ignore
      }

      setRunnerStatus('Running');
    } catch (e) {
      console.error('Failed to launch local app', e);
      alert('Failed to launch file.');
      setLaunchingLocal(null);
      setRunnerStatus('Error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10">
      <div className="flex items-end justify-between gap-6 border-b border-nacho-border pb-6">
          <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-nacho-primary">Library</h1>
          <p className="text-sm text-nacho-secondary">Upload APK/EXE and run directly.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-nacho-secondary">
          <span className={`h-2 w-2 rounded-full ${profile ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <span>{profile ? 'Synced' : 'Offline'}</span>
          </div>
          </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-nacho flex items-center gap-3 text-red-400">
          <span className="material-symbols-outlined">error</span>
          <p className="flex-1">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Runner Overlay */}
      {(launchingGame || launchingLocal) && (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between border-b border-nacho-border bg-nacho-surface px-4 py-3">
                    <div className="flex items-center gap-3">
              <div className="text-sm font-semibold text-nacho-primary">
                {launchingGame?.title || launchingLocal?.name}
              </div>
              <div className="text-[11px] text-nacho-muted">{launchingGame ? 'Game' : runnerStatus}</div>
                    </div>
            <Button
              onClick={() => {
                try {
                  runtimeRef.current?.stop();
                } catch {
                  // ignore
                }
                setLaunchingGame(null);
                setLaunchingLocal(null);
                setRunnerStatus('Idle');
              }}
              className="border-rose-500/30 bg-rose-500/10 text-rose-200"
            >
                        <span className="material-symbols-outlined mr-2">close</span>
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
        {/* Upload + Local Apps */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-nacho-primary">Uploads</h2>
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
              <span className="nacho-btn inline-flex items-center">
                <span className="material-symbols-outlined mr-2 text-[16px]">upload_file</span>
                Upload
              </span>
            </label>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-nacho-border bg-nacho-surface p-6 text-sm text-nacho-secondary">
              Loading…
                </div>
          ) : apps.length === 0 ? (
            <div className="rounded-2xl border border-nacho-border bg-nacho-surface p-6 text-sm text-nacho-secondary">
              No uploads yet. Add an <span className="text-nacho-primary">APK</span> or <span className="text-nacho-primary">EXE</span>.
            </div>
        ) : (
            <div className="space-y-3">
              {apps.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-nacho-border bg-nacho-surface px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-nacho-primary">{a.name}</div>
                    <div className="text-xs text-nacho-muted">
                      {a.isActive ? 'Local' : 'Archived'} · {(a.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => void runLocal(a)} disabled={busy === 'run' || busy === 'install'}>
                      <span className="material-symbols-outlined mr-2 text-[16px]">play_arrow</span>
                      Run
              </Button>
                    <Button
                      onClick={() => void downloadStandalone(a)}
                      disabled={busy === `download-${a.id}` || busy === 'install'}
                      className="bg-nacho-surface hover:bg-nacho-card-hover text-nacho-primary border-nacho-border"
                    >
                      <span className="material-symbols-outlined mr-2 text-[16px]">download</span>
                      Download HTML
                    </Button>
                    <Button
                      onClick={() => void removeLocal(a.id)}
                      disabled={busy === a.id}
                      className="border-rose-500/30 bg-rose-500/10 text-rose-200"
                                        >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </Button>
                  </div>
                    </div>
              ))}
            </div>
          )}
        </section>

        {/* Games */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-nacho-primary">Installed Games</h2>
            <Button onClick={() => (window.location.href = '/games')} disabled={busy === 'install'}>
              Browse
            </Button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-nacho-border bg-nacho-surface p-6 text-sm text-nacho-secondary">
              Loading…
            </div>
          ) : installedGames.length === 0 ? (
            <div className="rounded-2xl border border-nacho-border bg-nacho-surface p-6 text-sm text-nacho-secondary">
              No games installed. Install from <span className="text-nacho-primary">Games</span>.
            </div>
          ) : (
            <div className="space-y-3">
              {installedGames.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-nacho-border bg-nacho-surface px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-nacho-primary">{g.title}</div>
                    <div className="text-xs text-nacho-muted">Installed {new Date(g.installedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setLaunchingGame(g)} disabled={busy === 'install'}>
                      <span className="material-symbols-outlined mr-2 text-[16px]">play_arrow</span>
                      Play
                    </Button>
                                    <Button 
                      onClick={() => void removeGame(g.id)}
                      disabled={busy === g.id}
                      className="border-rose-500/30 bg-rose-500/10 text-rose-200"
                                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      </Button>
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
