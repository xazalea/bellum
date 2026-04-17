'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getRecentlyPlayed, type RecentGame } from '@/lib/recently-played';

export default function HomePage() {
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setRecentGames(getRecentlyPlayed().slice(0, 8));
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'apk' || ext === 'exe') {
      window.location.href = `/run?file=${encodeURIComponent(file.name)}`;
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const features = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ),
      title: 'Android Runtime',
      description: 'Custom Dalvik interpreter with DEX parsing, JIT to WASM, and WebGL2-accelerated rendering. Full framework emulation.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ),
      title: 'Windows Runtime',
      description: 'x86 instruction decoder with PE loader, Win32 API emulation, GDI→Canvas rendering, and static binary translation.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M12 18v-6M9 15h6" />
        </svg>
      ),
      title: 'HTML Export',
      description: 'Convert any APK or EXE to a self-contained HTML file. Embedded runtime, compressed assets, zero dependencies.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      title: '40+ FPS',
      description: 'Adaptive frame pacing with dynamic instruction batching. WebGL2 pipeline with zero-copy texture uploads.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: 'Sandboxed',
      description: 'Browser-native isolation. No native plugins, no server-side execution. Everything runs client-side in the browser.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      ),
      title: 'Web Native',
      description: 'No downloads, no installs. Works on any modern browser with WebGL2. Desktop, mobile, ChromeOS — anywhere.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden noise-bg">
        <div className="cd-container pt-20 pb-24 md:pt-32 md:pb-36 relative z-10">
          <div className="max-w-2xl">
            <h1
              className={`text-5xl md:text-7xl font-bold tracking-tighter text-foreground leading-[0.95] transition-all duration-700 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Run
              <br />
              <span className="text-muted-foreground">anything</span>
            </h1>
            <p
              className={`mt-6 text-sm text-muted-foreground max-w-md leading-relaxed transition-all duration-700 delay-100 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Android APKs and Windows EXEs, executed natively in your browser at 40+ FPS.
              Export any app as a single self-contained HTML file. No installs, no plugins.
            </p>
            <div
              className={`mt-8 flex flex-wrap gap-3 transition-all duration-700 delay-200 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Link href="/run" className="btn-primary">
                Run APK
              </Link>
              <Link href="/run" className="btn-secondary">
                Run EXE
              </Link>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className={`mt-16 transition-all duration-700 delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div
              className={`relative border ${
                dragOver
                  ? 'border-foreground/40 bg-accent/30'
                  : 'border-border bg-card/50'
              } transition-all duration-200 p-8 flex flex-col items-center justify-center min-h-[180px] cursor-pointer group hover:border-foreground/20 hover:bg-card/80`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".apk,.exe"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground/30 mb-4 group-hover:text-muted-foreground/50 transition-colors"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <p className="text-xs text-muted-foreground mb-1">
                Drop APK or EXE here
              </p>
              <p className="text-[10px] text-muted-foreground/40">
                or click to browse
              </p>
              <div className="mt-3 flex gap-2">
                {['.apk', '.exe'].map((f) => (
                  <span key={f} className="tag">{f}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Subtle background gradient */}
        <div
          className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 70% 30%, hsl(var(--foreground)) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Recent Games */}
      {recentGames.length > 0 && (
        <div className="cd-container py-12 border-t border-border">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recently Played
            </h2>
            <Link href="/games" className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {recentGames.map((game, i) => (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="group block border border-border hover:border-foreground/20 hover-glow transition-all overflow-hidden"
              >
                <div className="aspect-video bg-card flex items-center justify-center">
                  {game.thumbnail ? (
                    <img
                      src={game.thumbnail}
                      alt={game.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-muted-foreground/20 text-[10px] group-hover:text-muted-foreground/40 transition-colors">▶</span>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground truncate group-hover:text-foreground/70 transition-colors">
                    {game.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div className="cd-container py-16 border-t border-border">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            Platform
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Browser-native execution engine for Android and Windows binaries
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-background p-6 group hover:bg-card/80 transition-colors duration-200"
            >
              <div className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors mb-3">
                {f.icon}
              </div>
              <h3 className="text-xs font-medium text-foreground mb-2">{f.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats / Social Proof */}
      <div className="cd-container py-12 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '40+', label: 'FPS Target' },
            { value: '0', label: 'Dependencies' },
            { value: '1', label: 'File Export' },
            { value: '∞', label: 'Browser Native' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground">
                {s.value}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
