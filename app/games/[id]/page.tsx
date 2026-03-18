'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { GamePlayer } from '@/components/game/game-player';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2 } from 'lucide-react';
import { addRecentlyPlayed, getRecentlyPlayed } from '@/lib/recently-played';

function GamePageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = params.id as string;

  const titleParam = searchParams.get('title');
  const cached = getRecentlyPlayed().find((g) => g.id === gameId);
  const title = titleParam || cached?.title || `Game ${gameId.slice(0, 8)}`;
  const thumbnail = cached?.thumbnail || '';

  useEffect(() => {
    document.title = `${title} — Challenger`;
    addRecentlyPlayed({ id: gameId, title, thumbnail });
  }, [gameId, title, thumbnail]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Share cancelled or not supported
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background/95 border-b border-border backdrop-blur-sm z-20 shrink-0">
        <Link href="/games">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </Link>
        <h1 className="text-sm font-medium text-foreground truncate max-w-xs sm:max-w-md px-2">
          {title}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </div>

      {/* Player — fills remaining space */}
      <GamePlayer
        gameId={gameId}
        title={title}
        thumbnail={thumbnail}
        className="flex-1 h-full"
      />
    </div>
  );
}

export default function GamePlayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 3.5rem)' }}>
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <GamePageInner />
    </Suspense>
  );
}
