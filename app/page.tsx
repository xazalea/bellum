'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getRecentlyPlayed, type RecentGame } from '@/lib/recently-played';

export default function HomePage() {
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentGames(getRecentlyPlayed().slice(0, 6));
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'apk' || ext === 'exe') {
      const formData = new FormData();
      formData.append('file', file);
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

  const onDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="cd-container py-16 md:py-24">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground leading-none">
            Run
            <br />
            <span className="text-muted-foreground">anything</span>
          </h1>
          <p className="mt-6 text-sm text-muted-foreground max-w-md leading-relaxed">
            Android APKs and Windows EXEs, executed natively in your browser.
            Export any app as a single self-contained HTML file.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/run"
              className="inline-flex items-center justify-center px-5 h-9 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              Run APK
            </Link>
            <Link
              href="/run"
              className="inline-flex items-center justify-center px-5 h-9 text-xs font-medium border border-border text-foreground hover:bg-accent transition-colors"
            >
              Run EXE
            </Link>
          </div>
        </div>

        <div
          className={`mt-16 border ${dragOver ? 'border-foreground/60' : 'border-border'} transition-colors p-8 flex flex-col items-center justify-center min-h-[200px] cursor-pointer`}
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground mb-3">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <p className="text-xs text-muted-foreground">
            Drop APK or EXE here, or click to browse
          </p>
          <div className="mt-3 flex gap-2">
            {['APK', 'EXE'].map((f) => (
              <span key={f} className="px-2 py-0.5 text-[10px] border border-border text-muted-foreground font-mono">
                .{f.toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        {recentGames.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Recent</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {recentGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="group block border border-border hover:border-foreground/30 transition-colors overflow-hidden"
                >
                  <div className="aspect-video bg-card flex items-center justify-center">
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-muted-foreground/30 text-[10px]">▶</span>
                    )}
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] text-muted-foreground truncate">{game.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          <div className="bg-background p-6">
            <h3 className="text-xs font-medium text-foreground mb-2">Android Runtime</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Custom Dalvik bytecode interpreter with DEX parsing, JIT compilation to WASM, and WebGPU-accelerated rendering. Full Android framework emulation.
            </p>
          </div>
          <div className="bg-background p-6">
            <h3 className="text-xs font-medium text-foreground mb-2">Windows Runtime</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              x86 instruction decoder with PE loader, Win32 API emulation, GDI rendering to Canvas, and static binary translation to optimized WASM.
            </p>
          </div>
          <div className="bg-background p-6">
            <h3 className="text-xs font-medium text-foreground mb-2">HTML Export</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Convert any APK to a self-contained HTML file with embedded runtime, compressed assets, and Canvas renderer. Zero dependencies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
