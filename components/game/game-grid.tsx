'use client';

import { useEffect, useMemo } from 'react';
import { useGame } from '@/components/providers/game-provider';
import { GameCard } from '@/components/game/game-card';
import { Button } from '@/components/ui/button';
import type { GameFilters } from '@/lib/types/games';

interface GameGridProps {
  filters?: GameFilters;
  limit?: number;
}

export function GameGrid({ filters, limit }: GameGridProps) {
  const { games, isLoading, hasMore, hasLoaded, fetchGames, loadMore } = useGame();

  useEffect(() => {
    if (!hasLoaded) {
      fetchGames(1, 24);
    }
  }, [hasLoaded, fetchGames]);

  const filteredGames = useMemo(() => {
    let result = games;

    if (filters?.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(
        g =>
          g.title.toLowerCase().includes(term) ||
          g.description.toLowerCase().includes(term)
      );
    }

    if (filters?.category) {
      result = result.filter(g => g.category === filters.category);
    }

    if (filters?.type) {
      result = result.filter(g => g.type === filters.type);
    }

    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }, [games, filters, limit]);

  if (isLoading && !hasLoaded) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: limit || 10 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (filteredGames.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-medium">No games found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredGames.map(game => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
      {!limit && hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
            className="min-w-[200px]"
          >
            {isLoading ? 'Loading...' : 'Load More Games'}
          </Button>
        </div>
      )}
    </div>
  );
}
