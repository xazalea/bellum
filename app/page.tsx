import React from 'react';
import Link from 'next/link';
import { Hero3D } from '@/components/Hero3D';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col">
      <Hero3D />
      
      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 pointer-events-none">
        <div className="text-center space-y-8 max-w-4xl pointer-events-auto">
          <h1 className="text-6xl md:text-8xl font-bold text-nacho-primary tracking-tighter leading-none animate-slide-up">
            challenger deep.
          </h1>
          
          <p className="text-xl md:text-2xl text-nacho-secondary max-w-2xl mx-auto font-light animate-fade-in delay-100">
            Run APKs and EXEs at impossible speeds.
            <br />
            <span className="text-nacho-accent font-medium">20,000+ Games. 4GB Free Storage.</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-8 animate-fade-in delay-200">
            <Link 
              href="/virtual-machines"
              className="px-8 py-4 bg-nacho-primary text-white rounded-full font-medium hover:bg-nacho-secondary transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Launch Virtual Machine
            </Link>
            <Link 
              href="/games"
              className="px-8 py-4 bg-white text-nacho-primary border border-nacho-border rounded-full font-medium hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
            >
              Browse Library
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Section (Scroll Target) */}
      <div className="relative z-10 bg-white/90 backdrop-blur-xl border-t border-nacho-border py-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-nacho-accent">
              <span className="material-symbols-outlined">rocket_launch</span>
            </div>
            <h3 className="text-2xl font-bold text-nacho-primary">Impossible Speeds</h3>
            <p className="text-nacho-muted leading-relaxed">
              Powered by WebAssembly and WebGPU, our runtime delivers near-native performance for Android and Windows applications directly in your browser.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-nacho-accent">
              <span className="material-symbols-outlined">sports_esports</span>
            </div>
            <h3 className="text-2xl font-bold text-nacho-primary">Massive Library</h3>
            <p className="text-nacho-muted leading-relaxed">
              Access over 20,000 games and applications instantly. No downloads, no installation, just click and play.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-nacho-accent">
              <span className="material-symbols-outlined">cloud_upload</span>
            </div>
            <h3 className="text-2xl font-bold text-nacho-primary">4GB Free Storage</h3>
            <p className="text-nacho-muted leading-relaxed">
              Your personal cloud container persists your data, saves, and installed apps securely. Import your own APKs and EXEs.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
