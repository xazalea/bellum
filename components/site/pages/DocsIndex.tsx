'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import type { DocEntry } from '@/lib/server/docs';
import { motion } from 'framer-motion';
import { Search, BookOpen, FileText, Sparkles, Zap } from 'lucide-react';

function GlassCard({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string, delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_40px_rgba(56,189,248,0.1)] ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">{children}</div>
    </motion.div>
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
    const preferred = ['WEB_FABRIC_SPEC.md', 'WEB_FABRIC_WHITEPAPER.md', 'GETTING_STARTED.md'];
    for (const f of preferred) {
      const d = docs.find((x) => x.fileName === f);
      if (d) return d;
    }
    return docs[0] ?? null;
  }, [docs]);

  return (
    <div className="w-full space-y-12 pb-20">

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-white/10 p-12 text-center shadow-2xl">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 blur-[100px] rounded-full" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold tracking-widest text-cyan-400 mb-8">
            <Sparkles size={14} />
            <span>KNOWLEDGE BASE</span>
          </div>

          <h1 className="max-w-4xl text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tight">
            Documentation & <span className="text-cyan-400">Specifications</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed font-medium">
            Comprehensive guides, architectural deep-dives, and API references.
            Everything is backed by live markdown files in the repository.
          </p>

          {/* Search Bar */}
          <div className="mt-10 w-full max-w-xl group relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
            </div>
            <input
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:bg-white/10 transition-all font-medium"
              placeholder="Search for guides, APIs, or concepts..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Featured Doc */}
      {featured && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4 px-2">
            <Zap size={18} className="text-amber-400" />
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Featured Read</span>
          </div>
          <GlassCard className="!p-0 border-amber-500/20 bg-amber-500/5">
            <div className="flex flex-col md:flex-row h-full">
              <div className="p-10 flex-1 flex flex-col justify-center">
                <h2 className="text-3xl font-bold text-white mb-4">{featured.title}</h2>
                <p className="text-slate-300 mb-8 text-lg font-medium opacity-80">{featured.description}</p>

                <div className="flex items-center gap-4">
                  <Link href={`/docs/${featured.slug}`} className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-white text-black font-bold hover:bg-slate-200 transition-colors">
                    <BookOpen size={18} />
                    Read Now
                  </Link>
                  <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/50">
                    {featured.fileName}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Grid */}
      <div>
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]" />
            <h3 className="text-lg font-bold text-white">All Documents</h3>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-bold text-slate-400">{filtered.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((d, i) => (
            <GlassCard key={d.slug} delay={i * 0.05}>
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <FileText size={24} />
                </div>
                <span className="text-[10px] font-mono text-slate-500 border border-white/5 px-2 py-1 rounded bg-black/20">
                  {d.fileName}
                </span>
              </div>

              <h4 className="text-xl font-bold text-slate-100 mb-3 group-hover:text-cyan-300 transition-colors">{d.title}</h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-6 line-clamp-3">
                {d.description}
              </p>

              <Link
                href={`/docs/${d.slug}`}
                className="inline-flex items-center text-sm font-bold text-white hover:text-cyan-400 transition-colors group/link"
              >
                Read Article <span className="ml-1 transition-transform group-hover/link:translate-x-1">→</span>
              </Link>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}



