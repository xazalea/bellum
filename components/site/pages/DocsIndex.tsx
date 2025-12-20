'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import type { DocEntry } from '@/lib/server/docs';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[1.75rem] border border-white/12 bg-[#070b16]/55 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function OutlineCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-[2rem] border-2 border-white/80 bg-[#070b16]/60 shadow-[0_26px_90px_rgba(0,0,0,0.55)] ${className}`}
    >
      {children}
    </div>
  );
}

export function DocsIndex({ docs }: { docs: DocEntry[] }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return docs;
    return docs.filter((d) => d.title.toLowerCase().includes(s) || d.description.toLowerCase().includes(s) || d.fileName.toLowerCase().includes(s));
  }, [docs, q]);

  const featured = useMemo(() => {
    // Prefer specs first if present
    const preferred = ['WEB_FABRIC_SPEC.md', 'WEB_FABRIC_WHITEPAPER.md', 'STANDALONE_HTML_EXPORT.md'];
    for (const f of preferred) {
      const d = docs.find((x) => x.fileName === f);
      if (d) return d;
    }
    return docs[0] ?? null;
  }, [docs]);

  return (
    <div className="w-full">
      <div className="w-full">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-wide text-white/75">
          <span className="material-symbols-outlined text-[16px] text-amber-300">emoji_objects</span>
          DOCUMENTATION
        </div>

        <div className="mt-6 text-center">
          <h1 className="font-display text-5xl font-black tracking-tight text-white sm:text-6xl">
            Docs &amp; <span className="text-[#3b82f6]">Specs</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-white/60">
            This page is backed by the real markdown files in the repository’s `docs/` folder.
          </p>
        </div>

        <div className="mx-auto mt-7 flex max-w-2xl items-center gap-3 rounded-full border-2 border-white/20 bg-white/5 p-2 backdrop-blur">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-white/5">
            <span className="material-symbols-outlined text-[18px] text-white/60">search</span>
          </div>
          <input
            className="w-full bg-transparent px-1 text-sm font-semibold text-white/85 placeholder:text-white/35 outline-none"
            placeholder="Search docs…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            className="h-11 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
            onClick={() => {
              // no-op; search is live, but this keeps the UI consistent.
            }}
          >
            Search
          </button>
        </div>
      </div>

      {featured && (
        <div className="mt-10">
          <OutlineCard className="p-8">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="text-[10px] font-bold tracking-wider text-white/55">FEATURED</div>
                <div className="mt-2 font-display text-3xl font-black text-white">{featured.title}</div>
                <div className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/55">{featured.description}</div>
              </div>
              <Link
                href={`/docs/${featured.slug}`}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
              >
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                Open
              </Link>
            </div>
          </OutlineCard>
        </div>
      )}

      <div className="mt-10 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2f7cfb]/20 ring-1 ring-white/10">
          <span className="material-symbols-outlined text-[20px] text-[#60a5fa]">library_books</span>
        </div>
        <div className="font-display text-2xl font-bold text-white">All docs</div>
        <div className="text-sm font-semibold text-white/45">({filtered.length})</div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {filtered.map((d) => (
          <Card key={d.slug}>
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
                <span className="material-symbols-outlined text-[18px] text-white/70">description</span>
              </div>
              <div className="text-[10px] font-bold tracking-wider text-white/45">{d.fileName}</div>
            </div>
            <div className="mt-4 font-display text-lg font-bold text-white">{d.title}</div>
            <div className="mt-2 text-xs font-semibold leading-relaxed text-white/55 line-clamp-3">{d.description}</div>
            <div className="mt-5">
              <Link
                href={`/docs/${d.slug}`}
                className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-xs font-bold text-black shadow-[0_10px_18px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
              >
                Open
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}


