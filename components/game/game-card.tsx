'use client';

import Link from 'next/link';
import { Gamepad2, Play } from 'lucide-react';
import type { Game } from '@/lib/types/games';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  return (
    <Link href={`/games/${game.id}`} className="group block">
      <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30">
        <div className="aspect-video overflow-hidden bg-muted relative">
          {game.thumbnail ? (
            <img
              src={game.thumbnail}
              alt={game.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Gamepad2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-200">
              <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
            </div>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{game.title}</h3>
          {game.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{game.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
