'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRecentlyPlayed, type RecentGame } from '@/lib/recently-played';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';
import { Gamepad2, Upload, Search, Clock, Play, X } from 'lucide-react';

type FilterType = 'all' | 'apk' | 'exe';

export default function GamesPage() {
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const router = useRouter();
  const { root, run } = useAnimeScope();
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animatedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentGames(getRecentlyPlayed());
  }, []);

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    run(s => {
      s.add(self => {
        animate('[data-anime="header"]', { translateY: [-6, 0], opacity: [0, 1], ease: ease.out, duration: dur.base });
        animate('[data-anime="search-bar"]', {
          translateY: [4, 0], opacity: [0, 1], ease: ease.out, duration: dur.base, delay: 80,
        });
        animate('[data-anime="filter-pill"]', {
          scale: [0.92, 1], opacity: [0, 1], ease: spring({ bounce: 0.15 }),
          duration: dur.base, delay: stagger(50, { start: 160 }),
        });
        animate('[data-anime="drop-zone"]', {
          scale: [0.97, 1], opacity: [0, 1], ease: spring({ bounce: 0.15 }),
          duration: dur.base, delay: 280,
        });
        animate('[data-anime="recent-card"]', {
          translateY: [10, 0], opacity: [0, 1], ease: ease.out, duration: dur.reveal,
          delay: stagger(60, { from: 0, start: 320 }),
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
    animate(e.currentTarget, { translateY: -1, boxShadow: '0 2px 8px -2px hsl(var(--foreground) / 0.04)', ease: spring({ bounce: 0.15 }), duration: dur.fast });
  }, []);
  const onCardLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, boxShadow: '0 0 0 0 hsl(var(--foreground) / 0)', ease: ease.out, duration: dur.fast });
  }, []);

  // Filter and search logic
  const filteredGames = recentGames.filter(game => {
    const matchesSearch = !searchQuery || game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || 
      (activeFilter === 'apk' && game.id.toLowerCase().includes('apk')) ||
      (activeFilter === 'exe' && game.id.toLowerCase().includes('exe'));
    return matchesSearch && matchesFilter;
  });

  const filters: { key: FilterType; label: string; icon: typeof Gamepad2 }[] = [
    { key: 'all', label: 'All', icon: Gamepad2 },
    { key: 'apk', label: 'APK', icon: Gamepad2 },
    { key: 'exe', label: 'EXE', icon: Gamepad2 },
  ];

  const onFilterClick = useCallback((key: FilterType) => {
    setActiveFilter(key);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  return (
    <div ref={root} className="min-h-screen page-enter">
      <div className="cd-container py-6">
        {/* Header */}
        <div data-anime="header" className="flex items-start justify-between mb-6" style={{ opacity: 0 }}>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">Library</h1>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Run Android APKs and Windows EXEs in your browser</p>
          </div>
          <Link href="/run" className="btn-primary text-[10px] h-7 px-3 btn-press">
            <Upload size={11} className="mr-1" />
            Upload
          </Link>
        </div>

        {/* Search Bar */}
        <div data-anime="search-bar" style={{ opacity: 0 }} className="mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions..."
              className="w-full h-8 pl-8 pr-7 rounded-md border border-border bg-card/50 text-foreground text-[11px] placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary/25 focus:ring-1 focus:ring-primary/10 transition-colors"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground transition-colors">
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-6">
          {filters.map((f) => (
            <button
              key={f.key}
              data-anime="filter-pill"
              style={{ opacity: 0 }}
              onClick={() => onFilterClick(f.key)}
              className={`inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[9px] font-medium transition-all duration-200 ${
                activeFilter === f.key
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-card/50 text-muted-foreground/50 border border-border hover:border-foreground/10 hover:text-foreground/60'
              }`}
            >
              {f.label}
              {activeFilter === f.key && filteredGames.length > 0 && (
                <span className="text-[8px] opacity-60">{filteredGames.length}</span>
              )}
            </button>
          ))}
          <div className="flex-1" />
          {recentGames.length > 0 && (
            <span className="text-[10px] text-muted-foreground/30">{recentGames.length} session{recentGames.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Drop Zone */}
        <div data-anime="drop-zone" style={{ opacity: 0 }} className="mb-10">
          <div
            ref={dropRef}
            className={`relative glass-card rounded-lg p-5 text-center cursor-pointer group premium-sweep ${
              dragOver ? 'border-primary/30 bg-primary/5' : 'hover:border-primary/20'
            }`}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".apk,.exe" className="hidden" onChange={(e) => { setLoadingFile(true); handleFiles(e.target.files); }} />
            {loadingFile ? (
              <div className="flex flex-col items-center">
                <div className="spinner mb-3" />
                <p className="text-xs font-medium text-foreground">Loading file...</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="loading-step active">
                    <span className="step-indicator" />
                    <span>Detecting format</span>
                  </div>
                  <div className="loading-step">
                    <span className="step-indicator" />
                    <span>Preparing runtime</span>
                  </div>
                  <div className="loading-step">
                    <span className="step-indicator" />
                    <span>Booting</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center w-10 h-10 rounded-md border border-border/50 bg-card/50 mx-auto mb-2.5 group-hover:border-primary/20 group-hover:bg-primary/5 transition-colors duration-300">
                  <Upload size={15} className="text-muted-foreground/25 group-hover:text-primary/50 transition-colors" />
                </div>
                <p className="text-[11px] font-medium text-foreground mb-0.5">
                  Drop APK or EXE here
                </p>
                <p className="text-[9px] text-muted-foreground/35">
                  or click to browse · Instant runtime
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="tag">.apk</span>
                  <span className="tag">.exe</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-muted-foreground/30" />
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Recent Sessions</h2>
            </div>
            {filteredGames.length > 0 && searchQuery && (
              <span className="text-[10px] text-muted-foreground/40">{filteredGames.length} result{filteredGames.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {recentGames.length === 0 ? (
            <div className="glass-card rounded-lg p-10 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-card border border-border/50 mx-auto mb-3">
                <Gamepad2 size={20} className="text-muted-foreground/10" />
              </div>
              <p className="text-[11px] text-muted-foreground/60 mb-1">No sessions yet</p>
              <p className="text-[9px] text-muted-foreground/25 mb-3">Drop an APK or EXE above to run your first app</p>
              <Link href="/run" className="btn-secondary text-[10px] h-7 px-3 btn-press">
                <Play size={11} className="mr-1" />
                Start Playing
              </Link>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="glass-card rounded-lg p-6 text-center">
              <Search size={16} className="text-muted-foreground/15 mx-auto mb-2" />
              <p className="text-[11px] text-muted-foreground/60 mb-1">No matches for &ldquo;{searchQuery}&rdquo;</p>
              <button onClick={clearSearch} className="text-[9px] text-primary/40 hover:text-primary/60 transition-colors mt-1.5">
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  data-anime="recent-card"
                  style={{ opacity: 0 }}
                  className="glass-card rounded-lg overflow-hidden cursor-pointer group premium-sweep"
                  onClick={() => playRecent(game)}
                  onMouseEnter={onCardEnter}
                  onMouseLeave={onCardLeave}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-9 h-9 rounded-md bg-card border border-border/50 flex items-center justify-center shrink-0 overflow-hidden">
                      {game.thumbnail ? (
                        <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Gamepad2 size={14} className="text-muted-foreground/15" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-foreground truncate group-hover:text-primary/60 transition-colors">{game.title}</p>
                      <p className="text-[8px] text-muted-foreground/25 mt-0.5">{game.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tag">{game.id.endsWith('.apk') || game.id.endsWith('.APK') ? 'APK' : 'EXE'}</span>
                      <div className="w-6 h-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm">
                        <Play size={9} className="text-foreground ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10">
          <div className="glass-card-elevated rounded-lg p-5 text-center relative overflow-hidden dot-grid">
            <div className="relative z-10">
              <h3 className="text-xs font-semibold text-foreground tracking-tight mb-1">
                <span className="gradient-text">Run Anything In Your Browser</span>
              </h3>
              <p className="text-[9px] text-muted-foreground/35 mb-3 max-w-sm mx-auto">
                No downloads, no installs. Drop an APK or EXE and it runs natively via WebGL2 + Dalvik/x86 interpreter.
              </p>
              <Link href="/run" className="btn-primary text-[10px] h-8 px-5 btn-press">
                <Upload size={12} className="mr-1" />
                Upload APK or EXE
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
