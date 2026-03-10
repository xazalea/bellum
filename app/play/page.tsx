"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppNav } from "@/components/layout/AppNav";
import { Button } from "@/components/ui/button";

function PlayContent() {
  const searchParams = useSearchParams();
  const gameUrl = searchParams.get("url") || "";
  const gameTitle = searchParams.get("title") || "Game";
  const width = Number(searchParams.get("width") || "800") || 800;
  const height = Number(searchParams.get("height") || "600") || 600;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const proxiedSrc = useMemo(() => {
    if (!gameUrl) return "";
    return `/api/proxy/game?url=${encodeURIComponent(gameUrl)}`;
  }, [gameUrl]);

  if (!gameUrl) {
    return (
      <div className="min-h-screen">
        <AppNav />
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-10 md:px-6">
          <section className="surface p-6">
            <h1 className="text-xl font-semibold">No game selected</h1>
            <p className="mt-2 text-sm text-foreground/70">Open a game from the catalog first.</p>
            <Button asChild className="mt-4">
              <Link href="/games">Back to Games</Link>
            </Button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <section className="surface p-4 md:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold md:text-2xl">{decodeURIComponent(gameTitle)}</h1>
              <p className="text-xs uppercase tracking-wide text-foreground/60">
                Proxy session • {width} x {height}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/games">Back to Games</Link>
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-black/10 bg-black" style={{ aspectRatio: `${width} / ${height}` }}>
            {loading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-sm text-white/80">Loading game...</div>
            ) : null}

            {error ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 p-4 text-center text-white/85">
                <p>{error}</p>
                <Button asChild variant="outline">
                  <Link href="/games">Pick Another Game</Link>
                </Button>
              </div>
            ) : null}

            <iframe
              src={proxiedSrc}
              title={gameTitle}
              className="h-full w-full border-0"
              allow="autoplay; fullscreen; gamepad"
              allowFullScreen
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError("Failed to load this game through the proxy.");
              }}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PlayContent />
    </Suspense>
  );
}
