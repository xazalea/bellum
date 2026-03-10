"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { AppNav } from "@/components/layout/AppNav";
import { fetchGames, Game } from "@/lib/games-parser";
import { LoadingProgressInline } from "@/components/ui/loading-progress";

const PAGE_SIZE = 60;

export function GamesPage() {
  const [items, setItems] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [seed] = useState(() => Math.random().toString(36).slice(2));
  
  // Infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((g) => g.title.toLowerCase().includes(q));
  }, [items, query]);

  const canLoadMore = items.length < total;

  useEffect(() => {
    void loadPage(1, true);
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || !canLoadMore) return;

    const options = {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && canLoadMore && !loading) {
        loadPage(page + 1);
      }
    }, options);

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [canLoadMore, loading, page]);

  async function loadPage(nextPage: number, replace = false) {
    if (loading) return;
    setLoading(true);
    try {
      const result = await fetchGames(nextPage, PAGE_SIZE, true, seed);
      setTotal(result.total);
      setPage(nextPage);
      setItems((prev) => (replace ? result.games : [...prev, ...result.games]));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <section className="surface p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold md:text-3xl">Games</h1>
              <p className="mt-1 text-sm text-foreground/70">
                {total.toLocaleString()} available. Showing {items.length} loaded.
              </p>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search loaded games"
              className="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none ring-primary/30 focus:ring md:w-72"
            />
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((game, index) => {
            const params = new URLSearchParams({
              title: game.title,
              url: game.file,
              width: game.width || "800",
              height: game.height || "600",
            });
            return (
              <Link 
                key={`${game.id}-${game.file}-${index}`} 
                href={`/play?${params.toString()}`} 
                className="surface group overflow-hidden p-0"
              >
                <div className="aspect-[4/5] w-full bg-muted">
                  {game.thumb ? (
                    <img 
                      src={game.thumb} 
                      alt={game.title} 
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105" 
                      loading="lazy" 
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-xs font-medium text-foreground/90">{game.title}</p>
                </div>
              </Link>
            );
          })}
        </section>

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="mt-6 flex items-center justify-center py-8">
          {loading && (
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              <span className="text-sm text-gray-500">Loading more games...</span>
            </div>
          )}
          {!loading && !canLoadMore && items.length > 0 && (
            <div className="text-sm text-gray-500">
              All {items.length} games loaded
            </div>
          )}
        </div>
      </main>
    </div>
  );
}