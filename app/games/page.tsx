'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { addRecentlyPlayed, getRecentlyPlayed } from '@/lib/recently-played';
import { GameCard } from '@/components/ui/game-card';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';

interface Game { id: string; title: string; thumbnail: string; url: string; platform?: string; }
type SortMode = 'recent' | 'title';

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [recentIds, setRecentIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { root, run } = useAnimeScope();
  const searchRef = useRef<HTMLInputElement>(null);
  const prevLoadingRef = useRef(true);

  useEffect(() => { setRecentIds(new Set(getRecentlyPlayed().map(g => g.id))); }, []);

  useEffect(() => {
    async function loadGames() {
      try {
        const res = await fetch('/api/games?page=1&limit=500');
        if (res.ok) {
          const data = await res.json();
          setGames((data.games || []).map((g: Record<string, unknown>, idx: number) => ({
            id: String(g.id ?? g.game_id ?? `game-${idx}`),
            title: String(g.title ?? g.name ?? 'Untitled'),
            thumbnail: String(g.thumbnail ?? g.image ?? ''),
            url: String(g.url ?? g.game_url ?? ''),
            platform: g.platform ? String(g.platform) : undefined,
          })));
        }
      } catch { setGames([]); }
      setLoading(false);
    }
    loadGames();
  }, []);

  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      run(s => {
        s.add(self => {
          animate('[data-anime="header"]', { translateY: [-10, 0], opacity: [0, 1], ease: ease.out, duration: dur.base });
          animate('[data-anime="game-card"]', { translateY: [16, 0], opacity: [0, 1], ease: ease.out, duration: dur.reveal, delay: stagger(40, { grid: [6, 1], from: 'center', start: 200 }) });
        });
      });
      prevLoadingRef.current = false;
    }
  }, [loading, run]);

  const onSearchFocus = useCallback(() => {
    if (searchRef.current) animate(searchRef.current, { borderColor: 'hsl(var(--foreground) / 0.3)', ease: spring({ bounce: 0.2 }), duration: dur.fast });
  }, []);
  const onSearchBlur = useCallback(() => {
    if (searchRef.current) animate(searchRef.current, { borderColor: 'hsl(var(--border))', ease: ease.out, duration: dur.fast });
  }, []);

  const filtered = search ? games.filter(g => g.title.toLowerCase().includes(search.toLowerCase())) : games;
  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'recent') { return (recentIds.has(a.id) ? 0 : 1) - (recentIds.has(b.id) ? 0 : 1); }
    return a.title.localeCompare(b.title);
  });

  const openGame = useCallback((id: string) => {
    const game = games.find(g => g.id === id);
    if (game) addRecentlyPlayed({ id: game.id, title: game.title, thumbnail: game.thumbnail });
    router.push(`/games/${id}`);
  }, [games, router]);

  return (
    <div ref={root} className="min-h-screen">
      <div className="cd-container py-8">
        <div data-anime="header" className="flex items-start justify-between mb-8" style={{ opacity: 0 }}>
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Library</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} game{filtered.length !== 1 ? 's' : ''} available</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-border">
              <button onClick={() => setSortMode('recent')} className={`px-2.5 h-7 text-[10px] font-medium ${sortMode === 'recent' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Recent</button>
              <button onClick={() => setSortMode('title')} className={`px-2.5 h-7 text-[10px] font-medium ${sortMode === 'title' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>A–Z</button>
            </div>
            <div className="relative">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." onFocus={onSearchFocus} onBlur={onSearchBlur} className="pl-7 pr-3 h-7 text-[11px] bg-card border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none w-44" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-muted-foreground/30 mb-3"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <p className="text-xs text-muted-foreground">{search ? 'No games match your search' : 'No games available'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {sorted.map((game) => <GameCard key={game.id} id={game.id} title={game.title} thumbnail={game.thumbnail} platform={game.platform} onClick={openGame} data-anime="game-card" />)}
          </div>
        )}
      </div>
    </div>
  );
}
