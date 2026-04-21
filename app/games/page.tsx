'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRecentlyPlayed, type RecentGame } from '@/lib/recently-played';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';

export default function GamesPage() {
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const router = useRouter();
  const { root, run } = useAnimeScope();
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    setRecentGames(getRecentlyPlayed());
  }, []);

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    run(s => {
      s.add(self => {
        animate('[data-anime="header"]', { translateY: [-10, 0], opacity: [0, 1], ease: ease.out, duration: dur.base });
        animate('[data-anime="recent-card"]', {
          translateY: [16, 0], opacity: [0, 1], ease: ease.out, duration: dur.reveal,
          delay: stagger(80, { from: 0, start: 200 }),
        });
        animate('[data-anime="drop-zone"]', {
          scale: [0.95, 1], opacity: [0, 1], ease: spring({ bounce: 0.2 }),
          duration: dur.base, delay: 400,
        });
      });
    });
  }, [run]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'apk' || ext === 'exe') {
      router.push(`/run?file=${encodeURIComponent(file.name)}`);
    } else {
      setLoadingFile(false);
    }
  }, [router]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (dropRef.current) animate(dropRef.current, { scale: [1.01, 1], ease: spring({ bounce: 0.3 }), duration: dur.fast });
    setLoadingFile(true);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dragOver) {
      setDragOver(true);
      if (dropRef.current) animate(dropRef.current, { scale: 1.005, ease: spring({ bounce: 0.2 }), duration: dur.fast });
    }
  }, [dragOver]);

  const onDragLeave = useCallback(() => {
    setDragOver(false);
    if (dropRef.current) animate(dropRef.current, { scale: 1, ease: ease.out, duration: dur.fast });
  }, []);

  const playRecent = useCallback((game: RecentGame) => {
    router.push(`/run?id=${encodeURIComponent(game.id)}`);
  }, [router]);

  const onCardEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: -2, scale: [1, 1.01], ease: spring({ bounce: 0.2 }), duration: dur.fast });
  }, []);
  const onCardLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, scale: 1, ease: ease.out, duration: dur.fast });
  }, []);

  return (
    <div ref={root} className="min-h-screen">
      <div className="cd-container py-8">
        {/* Header */}
        <div data-anime="header" className="flex items-start justify-between mb-8" style={{ opacity: 0 }}>
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Library</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Run Android APKs and Windows EXEs in your browser</p>
          </div>
          <Link href="/run" className="btn-primary text-[10px] h-8 px-4">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Upload File
          </Link>
        </div>

        {/* Drop Zone */}
        <div data-anime="drop-zone" style={{ opacity: 0 }} className="mb-10">
          <div
            ref={dropRef}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${dragOver ? 'border-primary/50 bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/25 hover:bg-card/50'}`}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".apk,.exe" className="hidden" onChange={(e) => { setLoadingFile(true); handleFiles(e.target.files); }} />
            {loadingFile ? (
              <div className="spinner mx-auto mb-3" />
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-muted-foreground/30">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            )}
            <p className="text-sm font-medium text-foreground mb-1">
              {loadingFile ? 'Loading file...' : 'Drop APK or EXE here'}
            </p>
            <p className="text-[11px] text-muted-foreground/40">
              {loadingFile ? 'Preparing runtime...' : 'or click to browse \u00b7 APK or EXE files'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="tag">.apk</span>
              <span className="tag">.exe</span>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Recent Sessions</h2>
            {recentGames.length > 0 && (
              <span className="text-[10px] text-muted-foreground/40">{recentGames.length} session{recentGames.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {recentGames.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="mx-auto mb-3 text-muted-foreground/20">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 2H8a2 2 0 00-2 2v0h12V2z" />
                <path d="M12 11v4M10 13h4" />
              </svg>
              <p className="text-xs text-muted-foreground mb-1">No sessions yet</p>
              <p className="text-[10px] text-muted-foreground/30">Drop an APK or EXE above to run your first app</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentGames.map((game) => (
                <div
                  key={game.id}
                  data-anime="recent-card"
                  style={{ opacity: 0 }}
                  className="glass-card rounded-xl p-4 cursor-pointer group flex items-center gap-3"
                  onClick={() => playRecent(game)}
                  onMouseEnter={onCardEnter}
                  onMouseLeave={onCardLeave}
                >
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground/20">
                        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate group-hover:text-primary/70 transition-colors">{game.title}</p>
                    <p className="text-[9px] text-muted-foreground/30 mt-0.5">{game.id}</p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}