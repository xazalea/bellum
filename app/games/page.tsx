'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { gamesAPI } from '@/lib/api/games';
import { GameCard } from '@/components/game/game-card';
import { Button } from '@/components/ui/button';
import { Search, Gamepad2, Loader2, SlidersHorizontal, X } from 'lucide-react';
import type { Game } from '@/lib/types/games';

const LIMIT = 48;
const ROW_HEIGHT = 280; // px per row in 4-col grid
const OVERSCAN = 2; // extra rows to render above/below viewport

// --- Trigram fuzzy search index ---
function buildTrigramIndex(games: Game[]): Map<string, Set<number>> {
  const index = new Map<string, Set<number>>();
  games.forEach((game, i) => {
    const title = game.title.toLowerCase();
    const padded = `  ${title}  `;
    for (let j = 0; j < padded.length - 2; j++) {
      const tri = padded.slice(j, j + 3);
      if (!index.has(tri)) index.set(tri, new Set());
      index.get(tri)!.add(i);
    }
  });
  return index;
}

function trigramSearch(query: string, index: Map<string, Set<number>>, games: Game[]): Game[] {
  if (!query.trim()) return games;
  const term = query.trim().toLowerCase();
  const padded = `  ${term}  `;
  const candidates = new Map<number, number>(); // gameIdx → match count
  for (let i = 0; i < padded.length - 2; i++) {
    const tri = padded.slice(i, i + 3);
    const hits = index.get(tri);
    if (hits) {
      hits.forEach((idx) => candidates.set(idx, (candidates.get(idx) ?? 0) + 1));
    }
  }
  // Sort by match count descending, then filter by min score
  const minScore = Math.max(1, Math.floor(padded.length / 4));
  return Array.from(candidates.entries())
    .filter(([, score]) => score >= minScore)
    .sort((a, b) => b[1] - a[1])
    .map(([idx]) => games[idx]);
}

// --- Virtualized grid (window-scroll based) ---
function VirtualizedGrid({ games, cols }: { games: Game[]; cols: number }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerTopRef = useRef(0);

  // Track container's distance from page top (recalculate on resize / game changes)
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        containerTopRef.current =
          containerRef.current.getBoundingClientRect().top + window.scrollY;
      }
    };
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, [games]);

  // Listen to window scroll
  useEffect(() => {
    const onScroll = () => setScrollTop(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    setScrollTop(window.scrollY);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const rows = Math.ceil(games.length / cols);
  const totalHeight = rows * ROW_HEIGHT;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;

  const relativeScroll = Math.max(0, scrollTop - containerTopRef.current);
  const startRow = Math.max(0, Math.floor(relativeScroll / ROW_HEIGHT) - OVERSCAN);
  const visibleRows = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endRow = Math.min(rows, startRow + visibleRows);

  const visibleGames = games.slice(startRow * cols, endRow * cols);
  const offsetTop = startRow * ROW_HEIGHT;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', height: totalHeight }}
      className="w-full"
    >
      <div
        style={{ position: 'absolute', top: offsetTop, left: 0, right: 0 }}
        className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        {visibleGames.map((game, i) => (
          <GameCard
            key={game.id}
            game={game}
            priority={startRow === 0 && i < 12}
          />
        ))}
      </div>
    </div>
  );
}

// --- Sort options ---
type SortKey = 'default' | 'name' | 'category';

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
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [showFilters, setShowFilters] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Trigram index built once after first load
  const [trigramIndex, setTrigramIndex] = useState<Map<string, Set<number>> | null>(null);

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
      setGames((prev) => {
        const next = replace ? result.games : [...prev, ...result.games];
        // Build trigram index on first load
        if (replace) setTrigramIndex(buildTrigramIndex(next));
        return next;
      });
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

  // IntersectionObserver for "load more"
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || debouncedSearch) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadGames(page + 1, false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, debouncedSearch, loadingMore, page, loadGames]);

  const filteredGames = useMemo(() => {
    let result: Game[];
    if (!debouncedSearch.trim()) {
      result = games;
    } else if (trigramIndex) {
      result = trigramSearch(debouncedSearch, trigramIndex, games);
    } else {
      const term = debouncedSearch.trim().toLowerCase();
      result = games.filter((g) => g.title.toLowerCase().includes(term));
    }

    if (sortKey === 'name') return [...result].sort((a, b) => a.title.localeCompare(b.title));
    if (sortKey === 'category') return [...result].sort((a, b) => (a.category ?? '').localeCompare(b.category ?? ''));
    return result;
  }, [games, debouncedSearch, trigramIndex, sortKey]);

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

        {/* Sticky search + filters bar */}
        <div className="sticky top-14 z-40 bg-background/90 backdrop-blur-md border-b border-border/60 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search games… (fuzzy)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-8 h-9 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5 shrink-0"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showFilters ? 'Hide' : 'Sort'}
            </Button>

            {showFilters && (
              <div className="flex items-center gap-1.5">
                {(['default', 'name', 'category'] as SortKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setSortKey(k)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      sortKey === k
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {k === 'default' ? 'Default' : k === 'name' ? 'A–Z' : 'Category'}
                  </button>
                ))}
              </div>
            )}
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

        {/* Virtualized games grid */}
        {!loading && !error && (
          <>
            {filteredGames.length === 0 ? (
              <div className="text-center py-24">
                <Gamepad2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No games found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search ? 'Try a different search term' : 'Library is empty'}
                </p>
                {search && (
                  <Button variant="ghost" size="sm" className="mt-4" onClick={() => setSearch('')}>
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <VirtualizedGrid games={filteredGames} cols={6} />
            )}

            {/* Sentinel for infinite scroll */}
            {hasMore && !debouncedSearch && (
              <div ref={loadMoreRef} className="flex justify-center mt-10">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more games…
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
