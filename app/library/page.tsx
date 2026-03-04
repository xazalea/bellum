"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface StoredApp {
  id: string;
  name: string;
  size: number;
  isActive: boolean;
  storagePath: string;
  installedAt: number;
}

interface InstalledGame {
  id: string;
  title: string;
  type: string;
  installedAt: number;
}

interface UserProfile {
  uid: string;
  username?: string;
  installedApps: InstalledGame[];
}

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════

function PackageIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function UploadIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function GamepadIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
    </svg>
  );
}

function AndroidIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.44-.68-3.05-1.06-4.47-1.06-1.42 0-3.03.38-4.47 1.06L5.65 5.67c-.19-.29-.54-.38-.84-.23-.31.16-.42.54-.26.85L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
    </svg>
  );
}

function WindowsIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apps, setApps] = useState<StoredApp[]>([]);
  const [installedGames, setInstalledGames] = useState<InstalledGame[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [launchingGame, setLaunchingGame] = useState<InstalledGame | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load from localStorage for demo
        const storedApps = localStorage.getItem("cd_library_apps");
        const storedGames = localStorage.getItem("cd_library_games");
        
        if (storedApps) {
          setApps(JSON.parse(storedApps));
        }
        if (storedGames) {
          setInstalledGames(JSON.parse(storedGames));
        }
      } catch (err) {
        console.error("Failed to load library:", err);
        setError("Failed to load library");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save apps to localStorage
  const saveApps = useCallback((newApps: StoredApp[]) => {
    localStorage.setItem("cd_library_apps", JSON.stringify(newApps));
    setApps(newApps);
  }, []);

  // Save games to localStorage
  const saveGames = useCallback((newGames: InstalledGame[]) => {
    localStorage.setItem("cd_library_games", JSON.stringify(newGames));
    setInstalledGames(newGames);
  }, []);

  // Install local file
  const installLocal = useCallback(async (file: File) => {
    const isApk = file.name.toLowerCase().endsWith(".apk");
    const isExe = file.name.toLowerCase().endsWith(".exe");
    
    if (!isApk && !isExe) {
      setError("Only APK and EXE files are supported");
      return;
    }

    try {
      setBusy("install");
      
      const newApp: StoredApp = {
        id: `app_${Date.now()}`,
        name: file.name,
        size: file.size,
        isActive: true,
        storagePath: `local://${file.name}`,
        installedAt: Date.now(),
      };

      saveApps([newApp, ...apps]);
    } catch (err) {
      console.error("Install failed:", err);
      setError("Failed to install file");
    } finally {
      setBusy(null);
    }
  }, [apps, saveApps]);

  // Remove local app
  const removeLocal = useCallback((appId: string) => {
    if (!confirm("Remove this file from Library?")) return;
    saveApps(apps.filter((a) => a.id !== appId));
  }, [apps, saveApps]);

  // Remove game
  const removeGame = useCallback((gameId: string) => {
    if (!confirm("Uninstall from Library?")) return;
    saveGames(installedGames.filter((g) => g.id !== gameId));
  }, [installedGames, saveGames]);

  // Run app
  const runApp = useCallback((app: StoredApp) => {
    alert(`Launching ${app.name}... (Runtime would execute here)`);
  }, []);

  // Play game
  const playGame = useCallback((game: InstalledGame) => {
    setLaunchingGame(game);
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

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
      if (file) installLocal(file);
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
  }, [installLocal]);

  // Game player overlay
  if (launchingGame) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--cd-void)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--cd-border-default)", background: "var(--cd-abyss)" }}>
          <div className="flex items-center gap-3">
            <GamepadIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />
            <span className="font-medium" style={{ color: "var(--cd-text-primary)" }}>
              {launchingGame.title}
            </span>
          </div>
          <button
            onClick={() => setLaunchingGame(null)}
            className="cd-btn cd-btn-danger text-xs"
          >
            Close
          </button>
        </div>
        <iframe
          src={`https://html5.gamedistribution.com/${launchingGame.id}/`}
          className="flex-1 w-full border-0"
          title={launchingGame.title}
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--cd-abyss)" }} ref={dropRef}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--cd-border-default)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{
                  background: "var(--cd-emerald-muted)",
                  border: "1px solid rgba(0, 230, 184, 0.15)"
                }}
              >
                <PackageIcon className="w-6 h-6" style={{ color: "var(--cd-emerald)" }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--cd-text-primary)" }}>
                  Library
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--cd-text-muted)" }}>
                  Upload APK/EXE files and manage your games
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="cd-badge"
                style={{
                  background: "var(--cd-emerald-muted)",
                  borderColor: "rgba(0, 230, 184, 0.15)",
                  color: "var(--cd-emerald)"
                }}
              >
                {apps.length + installedGames.length} items
              </div>
            </div>
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
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1 opacity-80">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="cd-btn cd-btn-ghost text-xs">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(0, 0, 0, 0.8)" }}>
          <div className="text-center">
            <UploadIcon className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--cd-cyan)" }} />
            <p className="text-xl font-medium" style={{ color: "var(--cd-text-primary)" }}>
              Drop to upload
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--cd-text-muted)" }}>
              APK or EXE files
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Uploads Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--cd-text-muted)" }}>
                Uploads
              </h2>
              <label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".apk,.exe"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) installLocal(f);
                    e.currentTarget.value = "";
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="cd-btn cd-btn-primary text-xs"
                  disabled={busy === "install"}
                >
                  <UploadIcon className="w-4 h-4" />
                  Upload
                </button>
              </label>
            </div>

            {loading ? (
              <div className="cd-card text-center py-8">
                <div className="cd-spinner mx-auto mb-4" />
                <p className="text-sm" style={{ color: "var(--cd-text-muted)" }}>Loading...</p>
              </div>
            ) : apps.length === 0 ? (
              <div className="cd-card text-center py-8">
                <PackageIcon className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--cd-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--cd-text-muted)" }}>
                  No uploads yet
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--cd-text-subtle)" }}>
                  Upload an APK or EXE to get started
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="cd-card flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--cd-elevated)" }}
                      >
                        {app.name.toLowerCase().endsWith(".apk") ? (
                          <AndroidIcon className="w-5 h-5" style={{ color: "var(--cd-success)" }} />
                        ) : (
                          <WindowsIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--cd-text-primary)" }}>
                          {app.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--cd-text-muted)" }}>
                          {formatFileSize(app.size)} • {formatDate(app.installedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => runApp(app)}
                        disabled={busy === "run"}
                        className="cd-btn cd-btn-primary text-xs"
                      >
                        <PlayIcon className="w-3 h-3" />
                        Run
                      </button>
                      <button
                        onClick={() => removeLocal(app.id)}
                        disabled={busy === app.id}
                        className="p-2 rounded-lg hover:bg-[var(--cd-elevated)] transition-colors"
                        style={{ color: "var(--cd-error)" }}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Games Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--cd-text-muted)" }}>
                Installed Games
              </h2>
              <a
                href="/games"
                className="cd-btn cd-btn-ghost text-xs"
              >
                Browse Games
              </a>
            </div>

            {loading ? (
              <div className="cd-card text-center py-8">
                <div className="cd-spinner mx-auto mb-4" />
                <p className="text-sm" style={{ color: "var(--cd-text-muted)" }}>Loading...</p>
              </div>
            ) : installedGames.length === 0 ? (
              <div className="cd-card text-center py-8">
                <GamepadIcon className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--cd-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--cd-text-muted)" }}>
                  No games installed
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--cd-text-subtle)" }}>
                  Install games from the Games page
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {installedGames.map((game) => (
                  <div
                    key={game.id}
                    className="cd-card flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--cd-cyan-muted)" }}
                      >
                        <GamepadIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--cd-text-primary)" }}>
                          {game.title}
                        </p>
                        <p className="text-xs" style={{ color: "var(--cd-text-muted)" }}>
                          Installed {formatDate(game.installedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => playGame(game)}
                        className="cd-btn cd-btn-primary text-xs"
                      >
                        <PlayIcon className="w-3 h-3" />
                        Play
                      </button>
                      <button
                        onClick={() => removeGame(game.id)}
                        disabled={busy === game.id}
                        className="p-2 rounded-lg hover:bg-[var(--cd-elevated)] transition-colors"
                        style={{ color: "var(--cd-error)" }}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <InfoCard
            icon="📱"
            title="Android APKs"
            description="Run Android apps directly in your browser with ART runtime emulation"
          />
          <InfoCard
            icon="💻"
            title="Windows EXEs"
            description="Execute Windows applications with Win32 subsystem emulation"
          />
          <InfoCard
            icon="🎮"
            title="HTML5 Games"
            description="20,000+ games available to play instantly in your browser"
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function InfoCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="cd-card">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h4 className="font-semibold text-sm" style={{ color: "var(--cd-text-primary)" }}>
          {title}
        </h4>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--cd-text-secondary)" }}>
        {description}
      </p>
    </div>
  );
}