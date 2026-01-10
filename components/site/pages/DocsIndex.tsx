'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import type { DocEntry } from '@/lib/server/docs';
import { motion } from 'framer-motion';
import { Search, BookOpen, FileText, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { Card } from '@/components/nacho-ui/Card';
import { Button } from '@/components/nacho-ui/Button';
import { GlobalSearch } from '@/components/nacho-ui/GlobalSearch';
import { PageTransition } from '@/components/nacho-ui/PageTransition';
import { cn } from '@/lib/utils';

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
    <PageTransition>
      <div className="flex flex-col gap-10 pb-20 pt-10">

        {/* Hero Section */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-nacho-bg to-nacho-card border-nacho-border shadow-2xl !p-12 text-center">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-center" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-nacho-primary/5 blur-[120px] rounded-full" />

        <div className="relative z-10 flex flex-col items-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-nacho-accent-blue/30 bg-nacho-accent-blue/10 px-4 py-1.5 text-xs font-bold tracking-widest text-nacho-accent-blue mb-8">
            <Sparkles size={14} />
            <span>KNOWLEDGE BASE</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black font-display tracking-tight text-white mb-6">
            Documentation & <span className="text-nacho-primary">Specifications</span>
          </h1>

          <p className="text-lg text-nacho-subtext leading-relaxed font-light mb-10 max-w-2xl">
            Comprehensive guides, architectural deep-dives, and API references.
            Everything is backed by live markdown files in the repository.
          </p>

          <div className="w-full max-w-xl relative group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-nacho-subtext group-focus-within:text-nacho-primary transition-colors duration-200" />
            <input
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-nacho-card border border-nacho-border text-white placeholder:text-nacho-subtext/50 focus:outline-none focus:border-nacho-primary/50 focus:bg-nacho-card-hover focus:shadow-glow transition-all"
              placeholder="Search for guides, APIs, or concepts..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Featured Doc */}
      {featured && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4 px-2">
            <Zap size={18} className="text-nacho-accent-pink" />
            <span className="text-xs font-bold tracking-widest text-nacho-subtext uppercase">Featured Read</span>
          </div>
          <Card className="!p-0 border-nacho-accent-pink/20 bg-nacho-accent-pink/5 hover:bg-nacho-accent-pink/10 transition-colors">
            <div className="flex flex-col md:flex-row h-full">
              <div className="p-8 md:p-12 flex-1 flex flex-col justify-center">
                <h2 className="text-3xl font-bold font-display text-white mb-4">{featured.title}</h2>
                <p className="text-nacho-text mb-8 text-lg font-medium opacity-80 leading-relaxed max-w-3xl">{featured.description}</p>

                <div className="flex flex-wrap items-center gap-4">
                  <Link href={`/docs/${featured.slug}`}>
                    <Button className="gap-2 px-8 h-12">
                      <BookOpen size={18} />
                      Read Now
                    </Button>
                  </Link>
                  <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-nacho-subtext">
                    {featured.fileName}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Grid */}
      <div>
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-nacho-primary shadow-glow" />
            <h3 className="text-xl font-bold text-white font-display">All Documents</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-nacho-card border border-nacho-border text-xs font-bold text-nacho-subtext">{filtered.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((d, i) => (
            <motion.div
              key={d.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full flex flex-col group hover:border-nacho-primary/30">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-nacho-card-hover border border-nacho-border flex items-center justify-center text-nacho-primary group-hover:scale-105 transition-transform">
                    <FileText size={24} strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-mono text-nacho-subtext border border-nacho-border px-2 py-1 rounded-lg bg-nacho-bg/50">
                    {d.fileName}
                  </span>
                </div>

                <h4 className="text-xl font-bold text-white mb-3 font-display group-hover:text-nacho-primary transition-colors">{d.title}</h4>
                <p className="text-sm text-nacho-subtext leading-relaxed mb-6 line-clamp-3 flex-1">
                  {d.description}
                </p>

                <Link
                  href={`/docs/${d.slug}`}
                  className="inline-flex items-center text-sm font-bold text-white hover:text-nacho-primary transition-colors group/link mt-auto"
                >
                  Read Article <ArrowRight size={16} className="ml-2 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
