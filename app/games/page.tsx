'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { addRecentlyPlayed } from '@/lib/recently-played';

interface Game {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<Game | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

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

  const playGame = useCallback((game: Game) => {
    setPlaying(game);
    addRecentlyPlayed({ id: game.id, title: game.title, thumbnail: game.thumbnail });
  }, []);

  if (playing) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex items-center justify-between p-2 border-b border-border">
          <button
            onClick={() => setPlaying(null)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            ← Back
          </button>
          <span className="text-[11px] text-muted-foreground font-mono">{playing.title}</span>
        </div>
        <div className="flex-1 relative">
          {playing.url ? (
            <iframe
              src={playing.url}
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; fullscreen; gamepad"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <p className="text-xs text-muted-foreground">No URL available for this game</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="cd-container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium text-foreground">Games</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {filtered.length} games available
            </p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 h-7 text-[11px] bg-card border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/30 w-48"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-4 h-4 border border-foreground/30 border-t-foreground animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-xs text-muted-foreground">No games found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px bg-border">
            {filtered.map((game) => (
              <button
                key={game.id}
                onClick={() => playGame(game)}
                className="group bg-background hover:bg-accent transition-colors text-left"
              >
                <div className="aspect-video bg-card flex items-center justify-center overflow-hidden">
                  {game.thumbnail ? (
                    <img
                      src={game.thumbnail}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-muted-foreground/20 text-xs">▶</span>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground truncate">{game.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
