import React from 'react';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function Home() {
  const features = [
    { 
      title: 'Virtual Machines', 
      href: '/virtual-machines', 
      desc: 'Run Android, Windows & Linux in your browser with WASM acceleration.', 
      icon: 'memory',
      gradient: 'from-blue-500/10 to-cyan-500/10',
      iconColor: 'text-blue-400'
    },
    { 
      title: 'Games', 
      href: '/games', 
      desc: 'Browse and play thousands of HTML5 games instantly.', 
      icon: 'sports_esports',
      gradient: 'from-purple-500/10 to-pink-500/10',
      iconColor: 'text-purple-400'
    },
    { 
      title: 'Library', 
      href: '/library', 
      desc: 'Manage your installed applications and tools.', 
      icon: 'apps',
      gradient: 'from-green-500/10 to-emerald-500/10',
      iconColor: 'text-green-400'
    },
    { 
      title: 'Storage', 
      href: '/storage', 
      desc: 'Import and store your apps with 4GB free storage.', 
      icon: 'folder',
      gradient: 'from-orange-500/10 to-amber-500/10',
      iconColor: 'text-orange-400'
    },
    { 
      title: 'Cluster', 
      href: '/cluster', 
      desc: 'Join the distributed computing network.', 
      icon: 'hub',
      gradient: 'from-indigo-500/10 to-violet-500/10',
      iconColor: 'text-indigo-400'
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 pt-24 pb-20 z-10 relative">
      {/* Hero Section */}
      <div className="text-center mb-20 space-y-8 max-w-4xl">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-sans font-bold text-[#8B9DB8] tracking-tight animate-fade-in">
            challenger deep<span className="text-[#4A5A6F]">.</span>
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-[#64748B] to-transparent rounded-full"></div>
        </div>
        <p className="text-xl md:text-2xl font-sans text-[#64748B] max-w-2xl mx-auto leading-relaxed">
          Run operating systems, games, and applications directly in your browser.
          <br />
          <span className="text-[#8B9DB8]">Powered by WebAssembly & WebGPU.</span>
        </p>
        
        {/* Tech Stack Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          {['WASM', 'WebGPU', 'P2P', 'JIT'].map((tech) => (
            <span 
              key={tech}
              className="px-4 py-2 bg-[#1E2A3A]/50 border border-[#2A3648] rounded-full font-sans text-xs text-[#64748B] hover:text-[#8B9DB8] hover:border-[#4A5A6F] transition-all cursor-default"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl px-4">
        {features.map((feature, i) => (
          <Link key={feature.title} href={feature.href} className="group">
            <Card 
              variant="hover" 
              className={`h-full flex flex-col space-y-6 p-8 bg-gradient-to-br ${feature.gradient} backdrop-blur-sm`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-[#1E2A3A] to-[#0C1016] flex items-center justify-center border border-[#2A3648] group-hover:border-[#64748B] group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                  <span className={`material-symbols-outlined text-3xl ${feature.iconColor} transition-all`}>
                    {feature.icon}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[#4A5A6F] group-hover:text-[#64748B] transition-colors">
                  arrow_forward
                </span>
              </div>
              
              <div className="space-y-3 flex-grow">
                <h2 className="text-xl font-sans font-semibold text-[#8B9DB8] group-hover:text-[#A0B3CC] transition-colors">
                  {feature.title}
                </h2>
                <p className="text-[#64748B] font-sans text-base leading-relaxed">
                  {feature.desc}
                </p>
              </div>
              
              <div className="pt-4 border-t border-[#2A3648] group-hover:border-[#4A5A6F] transition-colors">
                <span className="font-sans text-xs font-medium text-[#4A5A6F] group-hover:text-[#64748B] transition-colors">
                  EXPLORE →
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-24 text-center space-y-4">
        <div className="h-px w-64 mx-auto bg-gradient-to-r from-transparent via-[#2A3648] to-transparent"></div>
        <p className="text-[#4A5A6F] font-sans text-sm opacity-70 hover:opacity-100 transition-opacity">
          DEEP OCEAN COMPUTING // {new Date().getFullYear()}
        </p>
        <p className="text-[#4A5A6F] font-sans text-xs">
          Built with WebAssembly, WebGPU & Next.js
        </p>
      </footer>
    </main>
  );
}
