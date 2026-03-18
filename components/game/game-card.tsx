'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Gamepad2 } from 'lucide-react';
import type { Game } from '@/lib/types/games';

interface GameCardProps {
  game: Game;
  priority?: boolean;
}

export const GameCard = React.memo(function GameCard({ game, priority }: GameCardProps) {
  return (
    <Link
      href={`/games/${game.id}`}
      className="group block rounded-xl overflow-hidden border border-border bg-card transition-colors duration-200 hover:border-primary/40"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt={game.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Gamepad2 className="h-7 w-7 text-muted-foreground/50" />
          </div>
        )}

        {/* Dark overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />

        {/* Play button — appears on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="h-11 w-11 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/50 scale-90 group-hover:scale-100 transition-transform duration-200">
            <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="px-2.5 py-2">
        <p className="text-xs font-medium text-foreground truncate leading-snug">{game.title}</p>
      </div>
    </Link>
  );
});
