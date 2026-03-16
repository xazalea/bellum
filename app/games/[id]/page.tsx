'use client';

export const runtime = 'edge';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { GamePlayer } from '@/components/game/game-player';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2 } from 'lucide-react';
import Link from 'next/link';
import { addRecentlyPlayed } from '@/lib/recently-played';
import { useGame } from '@/components/providers/game-provider';

export default function GamePlayPage() {
  const params = useParams();
  const gameId = params.id as string;
  const { games } = useGame();

  const game = games.find(g => g.id === gameId);
  const title = game?.title || `Game ${gameId.substring(0, 8)}`;

  useEffect(() => {
    addRecentlyPlayed({
      id: gameId,
      title,
      thumbnail: game?.thumbnail || '',
    });
  }, [gameId, title, game?.thumbnail]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="py-6">
      <div className="container-max">
        <div className="flex items-center justify-between mb-4">
          <Link href="/games">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Games
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        <div className="max-w-5xl mx-auto">
          <GamePlayer gameId={gameId} title={title} />

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              {game?.description && (
                <p className="text-sm text-muted-foreground mt-1">{game.description}</p>
              )}
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground p-3 rounded-lg bg-muted/50">
            Loaded through Challenger edge proxy · All requests routed via Almostnode on Cloudflare Pages
          </div>
        </div>
      </div>
    </div>
  );
}
