import React from 'react';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { SPRITES, PALETTES, createSprite } from '@/lib/ui/sprites';

export default function Home() {
  const features = [
    { title: 'Android', href: '/android', desc: 'Run Android apps in the cloud.', icon: 'phone_iphone' },
    { title: 'Cluster', href: '/cluster', desc: 'Distributed computing power.', icon: 'hub' },
    { title: 'Compiler', href: '/compiler', desc: 'Compile code instantly.', icon: 'code' },
    { title: 'Emulator', href: '/emulator', desc: 'Retro gaming & systems.', icon: 'games' },
    { title: 'Linux', href: '/linux', desc: 'Full Linux environment.', icon: 'terminal' },
    { title: 'Windows', href: '/windows', desc: 'Windows on the web.', icon: 'desktop_windows' },
    { title: 'VPS', href: '/vps', desc: 'Virtual Private Servers.', icon: 'dns' },
    { title: 'Unblocker', href: '/unblocker', desc: 'Access the open web.', icon: 'vpn_lock' },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 pt-24 z-10 relative">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-6xl font-pixel text-[#94A3B8] tracking-tighter drop-shadow-[0_4px_0_rgba(0,0,0,1)]">
          challenger deep<span className="text-[#334155]">.</span>
        </h1>
        <p className="text-xl md:text-2xl font-retro text-[#475569] max-w-2xl mx-auto">
          explore the depths of distributed computing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl px-4">
        {features.map((feature, i) => (
          <Link key={feature.title} href={feature.href} className="group">
            <Card variant="hover" className="h-full flex flex-col items-center text-center space-y-4 border-[#1F2937]/30 hover:border-[#374151] bg-opacity-80">
              <div className="w-16 h-16 rounded-full bg-[#030508] flex items-center justify-center border-2 border-[#1F2937] group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl text-[#475569]">{feature.icon}</span>
              </div>
              <div>
                <h2 className="text-xl font-pixel mb-2 text-[#94A3B8]">{feature.title}</h2>
                <p className="text-[#64748B] font-retro text-lg leading-tight">{feature.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <footer className="mt-20 text-[#334155] font-retro text-sm opacity-60">
        <p>DEEP OCEAN COMPUTING // {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
