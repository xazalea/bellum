'use client';

import { useState, useEffect, useCallback } from 'react';
import { addRecentlyPlayed, getRecentlyPlayed } from '@/lib/recently-played';

interface Game {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
}

type SortMode = 'recent' | 'title';

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<Game | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [recentIds, setRecentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const recent = getRecentlyPlayed();
    setRecentIds(new Set(recent.map(g => g.id)));
  }, []);

  useEffect(() => {
    async function loadGames() {
      try {
        const res = await fetch('/api/games?page=1&limit=500');
        if (res.ok) {
          const data = await res.json();
          setGames((data.games || []).map((g: any) => ({
            id: String(g.id || g.game_id || Math.random()),
            title: g.title || g.name || 'Untitled',
            thumbnail: g.thumbnail || g.image || '',
            url: g.url || g.game_url || '',
          })));
        }
      } catch {
        setGames([]);
      }
      setLoading(false);
    }
    loadGames();
  }, []);

  const filtered = search
    ? games.filter(g => g.title.toLowerCase().includes(search.toLowerCase()))
    : games;

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'recent') {
      const aRecent = recentIds.has(a.id) ? 0 : 1;
      const bRecent = recentIds.has(b.id) ? 0 : 1;
      return aRecent - bRecent;
    }
    return a.title.localeCompare(b.title);
  });

  const playGame = useCallback((game: Game) => {
    setPlaying(game);
    addRecentlyPlayed({ id: game.id, title: game.title, thumbnail: game.thumbnail });
  }, []);

  // Playing mode — fullscreen-ish game view
  if (playing) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex items-center justify-between px-4 h-10 border-b border-border bg-background/80 backdrop-blur-xl">
          <button
            onClick={() => setPlaying(null)}
            className="btn-ghost text-[10px] h-7 px-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="text-[11px] text-muted-foreground font-mono">{playing.title}</span>
          <div className="w-16" />
        </div>
        <div className="flex-1 relative bg-card">
          {playing.url ? (
            <iframe
              src={playing.url}
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; fullscreen; gamepad"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-muted-foreground/30 mx-auto mb-3">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M10 8l6 4-6 4V8z" fill="currentColor" stroke="none" className="text-muted-foreground/20" />
                </svg>
                <p className="text-xs text-muted-foreground">No URL available for this game</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="cd-container py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Library</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {filtered.length} game{filtered.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sort toggle */}
            <div className="flex border border-border">
              <button
                onClick={() => setSortMode('recent')}
                className={`px-2.5 h-7 text-[10px] font-medium transition-colors ${
                  sortMode === 'recent'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSortMode('title')}
                className={`px-2.5 h-7 text-[10px] font-medium transition-colors ${
                  sortMode === 'title'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                A–Z
              </button>
            </div>
            {/* Search */}
            <div className="relative">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-7 pr-3 h-7 text-[11px] bg-card border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 w-44 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              className="text-muted-foreground/30 mb-3"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <p className="text-xs text-muted-foreground">
              {search ? 'No games match your search' : 'No games available'}
            </p>
          </div>
        ) : (
          /* Game Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-px bg-border">
            {sorted.map((game) => (
              <button
                key={game.id}
                onClick={() => playGame(game)}
                className="group bg-background hover:bg-accent/50 transition-colors duration-150 text-left hover-lift"
              >
                <div className="aspect-video bg-card flex items-center justify-center overflow-hidden relative">
                  {game.thumbnail ? (
                    <img
                      src={game.thumbnail}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-muted-foreground/15 text-xs group-hover:text-muted-foreground/30 transition-colors">▶</span>
                  )}
                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors duration-200 flex items-center justify-center">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-foreground/0 group-hover:text-foreground/60 transition-colors duration-200"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground truncate group-hover:text-foreground/70 transition-colors">
                    {game.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
