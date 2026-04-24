'use client';

export const runtime = 'edge';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  useEffect(() => {
    if (gameId) {
      router.replace(`/run?id=${encodeURIComponent(gameId)}`);
    }
  }, [gameId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-xs text-muted-foreground">Redirecting to run page...</p>
      </div>
    </div>
  );
}