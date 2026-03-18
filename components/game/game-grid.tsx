'use client';

import { useState, useEffect, useRef } from 'react';
import { gamesAPI } from '@/lib/api/games';
import { GameCard } from './game-card';
import type { Game } from '@/lib/types/games';

interface GameGridProps {
  limit?: number;
}

export function GameGrid({ limit = 12 }: GameGridProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const hasFetched = useRef(false);

  const fetch = () => {
    hasFetched.current = true;
    setLoading(true);
    setError(false);
    gamesAPI
      .getGames(1, limit)
      .then((res) => { setGames(res.games.slice(0, limit)); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => {
    if (hasFetched.current) return;
    fetch();
  }, [limit]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border bg-card">
            <div className="aspect-video bg-muted animate-pulse" />
            <div className="p-2.5">
              <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center gap-3">
        <p className="text-muted-foreground text-sm">Failed to load games.</p>
        <button onClick={fetch} className="text-sm text-primary underline underline-offset-4 hover:opacity-80">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {games.map((game, i) => (
        <GameCard key={game.id} game={game} priority={i < 6} />
      ))}
    </div>
  );
}
