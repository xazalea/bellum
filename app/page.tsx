import React from 'react';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { SPRITES, PALETTES, createSprite } from '@/lib/ui/sprites';

export default function Home() {
  const features = [
    { title: 'Android', href: '/android', desc: 'Run Android apps in the cloud.', icon: 'phone_iphone' },
    { title: 'Windows', href: '/windows', desc: 'Windows on the web.', icon: 'desktop_windows' },
    { title: 'Cluster', href: '/cluster', desc: 'Distributed computing power.', icon: 'hub' },
    { title: 'Library', href: '/library', desc: 'App repository.', icon: 'local_library' },
    { title: 'Storage', href: '/storage', desc: 'Deep storage archives.', icon: 'folder' },
    { title: 'Games', href: '/games', desc: 'Retro arcade.', icon: 'sports_esports' },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 pt-24 z-10 relative">
      <div className="text-center mb-16 space-y-6">
        <h1 className="text-4xl md:text-6xl font-pixel text-[#8B9DB8] tracking-tight">
          challenger deep<span className="text-[#4A5A6F]">.</span>
        </h1>
        <p className="text-xl md:text-2xl font-retro text-[#64748B] max-w-2xl mx-auto leading-relaxed">
          explore the depths of distributed computing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-4">
        {features.map((feature, i) => (
          <Link key={feature.title} href={feature.href} className="group">
            <Card variant="hover" className="h-full flex flex-col items-center text-center space-y-5 p-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1E2A3A] to-[#0C1016] flex items-center justify-center border border-[#2A3648] group-hover:border-[#64748B] group-hover:shadow-lg group-hover:shadow-[#64748B]/20 transition-all duration-300 group-hover:scale-105">
                <span className="material-symbols-outlined text-4xl text-[#64748B] group-hover:text-[#8B9DB8] transition-colors">{feature.icon}</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-pixel text-[#8B9DB8] group-hover:text-[#A0B3CC] transition-colors">{feature.title}</h2>
                <p className="text-[#64748B] font-retro text-lg leading-snug">{feature.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <footer className="mt-24 text-[#4A5A6F] font-retro text-sm opacity-70 hover:opacity-100 transition-opacity">
        <p>DEEP OCEAN COMPUTING // {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
