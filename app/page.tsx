'use client';

import React from 'react';
import Link from 'next/link';
import { Hero3D } from '@/components/Hero3D';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col bg-nacho-bg text-nacho-primary">
      <Hero3D />
      
      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 pointer-events-none">
        <div className="text-center space-y-8 max-w-5xl pointer-events-auto">
          <h1 className="text-6xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tighter leading-none animate-slide-up drop-shadow-2xl">
            challenger deep.
          </h1>
          
          <p className="text-xl md:text-3xl text-nacho-secondary max-w-3xl mx-auto font-light animate-fade-in delay-100 leading-relaxed">
            Run APKs and EXEs at impossible speeds.
            <br />
            <span className="text-nacho-accent font-medium">20,000+ Games. 4GB Free Storage.</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-12 animate-fade-in delay-200">
            <Link 
              href="/virtual-machines"
              className="px-10 py-5 bg-nacho-accent text-white rounded-full font-bold text-lg hover:bg-blue-600 transition-all shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:shadow-[0_0_50px_rgba(59,130,246,0.7)] hover:-translate-y-1"
            >
              Launch Virtual Machine
            </Link>
            <Link 
              href="/games"
              className="px-10 py-5 bg-nacho-surface/50 backdrop-blur-md text-white border border-nacho-border rounded-full font-bold text-lg hover:bg-nacho-surface hover:border-nacho-primary transition-all shadow-lg hover:shadow-xl"
            >
              Browse Library
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Section (Scroll Target) */}
      <div className="relative z-10 bg-nacho-surface/80 backdrop-blur-xl border-t border-nacho-border py-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-6 p-6 rounded-2xl hover:bg-nacho-bg/50 transition-colors duration-300">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-nacho-accent shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <span className="material-symbols-outlined text-3xl">rocket_launch</span>
            </div>
            <h3 className="text-3xl font-bold text-nacho-primary">Impossible Speeds</h3>
            <p className="text-nacho-secondary leading-relaxed text-lg">
              Powered by WebAssembly and WebGPU, our runtime delivers near-native performance for Android and Windows applications directly in your browser.
            </p>
          </div>
          
          <div className="space-y-6 p-6 rounded-2xl hover:bg-nacho-bg/50 transition-colors duration-300">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <span className="material-symbols-outlined text-3xl">sports_esports</span>
            </div>
            <h3 className="text-3xl font-bold text-nacho-primary">Massive Library</h3>
            <p className="text-nacho-secondary leading-relaxed text-lg">
              Access over 20,000 games and applications instantly. No downloads, no installation, just click and play.
            </p>
          </div>
          
          <div className="space-y-6 p-6 rounded-2xl hover:bg-nacho-bg/50 transition-colors duration-300">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
              <span className="material-symbols-outlined text-3xl">cloud_upload</span>
            </div>
            <h3 className="text-3xl font-bold text-nacho-primary">4GB Free Storage</h3>
            <p className="text-nacho-secondary leading-relaxed text-lg">
              Your personal cloud container persists your data, saves, and installed apps securely. Import your own APKs and EXEs.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
