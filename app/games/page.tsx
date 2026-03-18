'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { gamesAPI } from '@/lib/api/games';
import { GameCard } from '@/components/game/game-card';
import { Button } from '@/components/ui/button';
import { Search, Gamepad2, Loader2 } from 'lucide-react';
import type { Game } from '@/lib/types/games';

const LIMIT = 48;

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search 300ms
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  const loadGames = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      if (replace) setLoading(true);
      else setLoadingMore(true);

      const result = await gamesAPI.getGames(pageNum, LIMIT);
      setGames((prev) => replace ? result.games : [...prev, ...result.games]);
      setTotal(result.total);
      setPage(result.page);
      setHasMore(result.page < result.totalPages);
      setError(null);
    } catch {
      setError('Failed to load games. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadGames(1, true); }, [loadGames]);

  const filteredGames = useMemo(() => {
    if (!debouncedSearch.trim()) return games;
    const term = debouncedSearch.trim().toLowerCase();
    return games.filter((g) => g.title.toLowerCase().includes(term));
  }, [games, debouncedSearch]);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="cd-container">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Gamepad2 className="h-3.5 w-3.5" />
            Game Library
          </div>
          <h1 className="text-3xl font-bold text-foreground">Browse Games</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {loading ? 'Loading library…' : `${filteredGames.length.toLocaleString()} of ${total.toLocaleString()} games`}
          </p>
        </div>

        {/* Sticky search bar */}
        <div className="sticky top-14 z-40 bg-background/90 backdrop-blur-md border-b border-border/60 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3 mb-8">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search games…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-9 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background transition-colors"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center py-20 gap-4">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => loadGames(1, true)}>Try Again</Button>
          </div>
        )}

        {/* Skeleton */}
        {loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-border bg-card">
                <div className="aspect-video bg-muted animate-pulse" />
                <div className="p-2.5">
                  <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Games grid */}
        {!loading && !error && (
          <>
            {filteredGames.length === 0 ? (
              <div className="text-center py-24">
                <Gamepad2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No games found</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
                {search && (
                  <Button variant="ghost" size="sm" className="mt-4" onClick={() => setSearch('')}>
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredGames.map((game, i) => (
                  <GameCard key={game.id} game={game} priority={i < 12} />
                ))}
              </div>
            )}

            {hasMore && !debouncedSearch && (
              <div className="flex justify-center mt-10">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => loadGames(page + 1, false)}
                  disabled={loadingMore}
                  className="min-w-[180px]"
                >
                  {loadingMore ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</>
                  ) : (
                    'Load More Games'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
