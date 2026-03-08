"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { DynamicIslandNav } from "@/components/layout/DynamicIslandNav";
import { GameCard, GameCardFeatured } from "@/components/games/GameCard";
import { InfiniteGrid } from "@/components/ui/parallax-scroll";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { fetchGames, Game } from "@/lib/games-parser";
import { Search, Filter, Grid, List, Loader2 } from "lucide-react";

const GAMES_PER_PAGE = 50;

export function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalGames, setTotalGames] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  // Initial load
  useEffect(() => {
    loadGames(1, true);
  }, []);

  // Filter games based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredGames(games);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredGames(
        games.filter(
          (game) =>
            game.title.toLowerCase().includes(query) ||
            game.description?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, games]);

  const loadGames = async (pageNum: number, initial = false) => {
    if (initial) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await fetchGames(pageNum, GAMES_PER_PAGE, true);
      
      if (initial) {
        setGames(result.games);
        setTotalGames(result.total);
      } else {
        setGames((prev) => [...prev, ...result.games]);
      }

      setHasMore(result.games.length === GAMES_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load games:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadGames(page + 1);
    }
  }, [page, isLoadingMore, hasMore]);

  const handlePlayGame = (game: Game) => {
    // Open game in new tab or modal
    window.open(`/play?id=${game.id}`, "_blank");
  };

  // Featured games (first 3)
  const featuredGames = games.slice(0, 3);
  const regularGames = searchQuery ? filteredGames : games.slice(3);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background */}
      <BackgroundPaths />

      {/* Navigation */}
      <DynamicIslandNav />

      {/* Content */}
      <div className="relative z-10 pt-24 pb-12">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Games Library
            </h1>
            <p className="text-white/50 text-lg">
              {totalGames.toLocaleString()}+ games available to play instantly
            </p>
          </motion.div>

          {/* Search and filters */}
          <motion.div
            className="mt-6 flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Search */}
            <GlowingEffect className="flex-1 rounded-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-card border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
            </GlowingEffect>

            {/* View toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-3 rounded-xl border transition-colors ${
                  viewMode === "grid"
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-card border-white/10 text-white/40 hover:text-white"
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("compact")}
                className={`p-3 rounded-xl border transition-colors ${
                  viewMode === "compact"
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-card border-white/10 text-white/40 hover:text-white"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="w-10 h-10 text-white/40 animate-spin" />
              <span className="text-white/40">Loading games...</span>
            </motion.div>
          </div>
        )}

        {/* Games grid */}
        {!isLoading && (
          <div className="max-w-7xl mx-auto px-4">
            {/* Featured games */}
            {!searchQuery && featuredGames.length > 0 && (
              <motion.div
                className="mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-xl font-semibold text-white mb-4">Featured</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {featuredGames.map((game, index) => (
                    <GameCardFeatured
                      key={game.id}
                      game={game}
                      index={index}
                      onPlay={handlePlayGame}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* All games */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                {searchQuery ? `Results for "${searchQuery}"` : "All Games"}
              </h2>

              <InfiniteGrid
                items={regularGames.map((game) => ({
                  id: game.id,
                  src: game.thumb || "",
                  alt: game.title,
                  title: game.title,
                }))}
                columns={viewMode === "compact" ? 6 : 4}
                onLoadMore={loadMore}
                hasMore={hasMore && !searchQuery}
                isLoading={isLoadingMore}
                renderItem={(item, index) => (
                  <GameCard
                    key={item.id}
                    game={regularGames[index]}
                    index={index}
                    onPlay={handlePlayGame}
                  />
                )}
              />
            </motion.div>

            {/* No results */}
            {searchQuery && filteredGames.length === 0 && (
              <div className="text-center py-20">
                <p className="text-white/40 text-lg">No games found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}