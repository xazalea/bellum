'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRecentlyPlayed } from '@/lib/recently-played';

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  useEffect(() => {
    if (!gameId) return;
    const recent = getRecentlyPlayed();
    const found = recent.find(g => g.id === gameId);
    if (found) {
      router.replace(`/run?id=${encodeURIComponent(found.id)}&title=${encodeURIComponent(found.title)}`);
    } else {
      router.replace('/run');
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
