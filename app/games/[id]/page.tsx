'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function GameDetailPage() {
  const params = useParams();
  const gameId = params.id as string;

  useEffect(() => {
    if (gameId) {
      window.location.replace(`/run?id=${encodeURIComponent(gameId)}`);
    }
  }, [gameId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-xs text-muted-foreground">Redirecting to run page...</p>
      </div>
    </div>
  );
}
