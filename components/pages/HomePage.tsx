"use client";

import Link from "next/link";
import { AppNav } from "@/components/layout/AppNav";
import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 md:px-6 md:py-12">
        <section className="surface p-6 md:p-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">Abyss OS</p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
            Play 20,000+ browser games and run Android, Windows, and AI workloads end to end.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-foreground/70 md:text-base">
            No placeholders. Real upload, storage, launch, and execution paths wired through live APIs.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/games">Open Games</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/android">Android Runner</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/windows">Windows Runner</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ai">AI Console</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Games</h2>
            <p className="mt-2 text-sm text-foreground/70">Catalog + proxy player with real `/api/games` and `/api/proxy/game` flow.</p>
          </div>
          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Android and Windows</h2>
            <p className="mt-2 text-sm text-foreground/70">Upload, install, list, launch, and remove apps against live storage and app records.</p>
          </div>
          <div className="surface p-5">
            <h2 className="text-sm font-semibold">AI via gpt4free</h2>
            <p className="mt-2 text-sm text-foreground/70">Model/site supports and chat completion APIs backed by gpt4free providers.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
