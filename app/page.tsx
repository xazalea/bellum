'use client';

import React from 'react';
import Link from 'next/link';
import { Hero3D } from '@/components/Hero3D';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col bg-nacho-bg text-nacho-primary">
      <Hero3D />
      
      {/* Content Overlay */}
      <section className="relative z-10 min-h-screen pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
          <div className="space-y-10">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 drop-shadow-2xl">
              challenger deep.
              <span className="block text-nacho-secondary text-2xl md:text-3xl font-light mt-3">
                The oceanic runtime for games, apps, and worlds.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-nacho-secondary max-w-2xl leading-relaxed">
              Run APKs and EXEs at impossible speeds. Persist your identity and library inside Discord-backed storage,
              with instant access to 20,000+ games and a 4GB cloud container.
            </p>

            <div className="flex flex-wrap items-center gap-5">
              <Link 
                href="/virtual-machines"
                className="px-8 py-4 bg-nacho-accent text-white rounded-full font-semibold text-lg hover:bg-blue-600 transition-all"
              >
                Launch Runtime
              </Link>
              <Link 
                href="/games"
                className="px-8 py-4 bg-nacho-surface text-white border border-nacho-border rounded-full font-semibold text-lg hover:bg-nacho-card-hover transition-all"
              >
                Explore Games
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Active Runtimes', value: '128k+' },
                { label: 'Avg. FPS', value: '120' },
                { label: 'Games Ready', value: '20,000+' },
                { label: 'Storage', value: '4GB Free' },
              ].map((stat) => (
                <div key={stat.label} className="bg-nacho-surface border border-nacho-border rounded-2xl p-5">
                  <div className="text-2xl font-bold text-nacho-primary">{stat.value}</div>
                  <div className="text-xs text-nacho-muted uppercase tracking-wider mt-2">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-nacho-surface border border-nacho-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-nacho-accent">track_changes</span>
                <span className="text-nacho-primary font-semibold">Live Performance Channel</span>
              </div>
              <div className="space-y-2 text-sm text-nacho-secondary">
                <p>GPU JIT: ACTIVE</p>
                <p>Cluster Nodes: READY</p>
                <p>Latency: 8ms</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section (Scroll Target) */}
      <section className="relative z-10 bg-nacho-surface border-t border-nacho-border py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: 'rocket_launch',
                title: 'Impossible Speeds',
                copy: 'WebGPU-accelerated runtime with JIT pipelines and adaptive execution tiers.',
                tone: 'text-nacho-accent'
              },
              {
                icon: 'sports_esports',
                title: 'Massive Library',
                copy: 'Instant access to 20,000+ HTML5 titles, no installs, no downloads.',
                tone: 'text-purple-400'
              },
              {
                icon: 'cloud_upload',
                title: '4GB Free Storage',
                copy: 'Cloud-backed storage preserved through Discord identity and manifests.',
                tone: 'text-green-400'
              },
            ].map((item) => (
              <div key={item.title} className="space-y-5 p-6 rounded-2xl bg-nacho-bg border border-nacho-border hover:border-nacho-border-hover transition-colors">
                <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center ${item.tone}`}>
                  <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                </div>
                <h3 className="text-2xl font-bold text-nacho-primary">{item.title}</h3>
                <p className="text-nacho-secondary leading-relaxed">{item.copy}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-nacho-bg border border-nacho-border rounded-3xl p-8 space-y-6">
              <h3 className="text-2xl font-bold text-nacho-primary">Runtime Stack</h3>
              <div className="space-y-3 text-nacho-secondary">
                <p>• Execution Pipeline → Binary Loader → JIT → GPU Compute</p>
                <p>• Virtual BIOS, fast snapshots, memory compression</p>
                <p>• Discord-backed identity + storage manifests</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                {['Android', 'Windows', 'Linux', 'WebGPU', 'WASM'].map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full border border-nacho-border text-xs text-nacho-secondary bg-nacho-surface">{tag}</span>
                ))}
              </div>
            </div>
            <div className="bg-nacho-bg border border-nacho-border rounded-3xl p-8 space-y-6">
              <h3 className="text-2xl font-bold text-nacho-primary">Security & Identity</h3>
              <p className="text-nacho-secondary leading-relaxed">
                Your fingerprint and username are preserved through Discord-backed manifests. Data is synced, versioned,
                and resilient across sessions.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Identity Sync', value: '99.99%' },
                  { label: 'Storage Integrity', value: 'SHA-256' },
                  { label: 'Network', value: 'P2P' },
                  { label: 'Latency', value: '8ms' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl border border-nacho-border p-4 bg-nacho-surface">
                    <div className="text-xl font-bold text-nacho-primary">{stat.value}</div>
                    <div className="text-xs text-nacho-muted uppercase tracking-wider mt-2">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
