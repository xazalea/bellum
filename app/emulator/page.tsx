import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function EmulatorPage() {
  const systems = [
    { name: 'NES', icon: 'videogame_asset' },
    { name: 'SNES', icon: 'stadia_controller' },
    { name: 'GBA', icon: 'smartphone' },
    { name: 'DOS', icon: 'computer' },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-5xl space-y-8">
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6">
          <h1 className="text-3xl font-pixel text-[#8B9DB8]">Retro Emulator</h1>
          <p className="font-retro text-xl text-[#64748B]">Classic systems in your browser.</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {systems.map((sys) => (
            <Card key={sys.name} variant="hover" className="flex flex-col items-center justify-center space-y-5 aspect-square cursor-pointer group p-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1E2A3A] to-[#0C1016] border border-[#2A3648] flex items-center justify-center group-hover:border-[#64748B] group-hover:scale-105 transition-all group-hover:shadow-lg group-hover:shadow-[#64748B]/20">
                <span className="material-symbols-outlined text-5xl text-[#4A5A6F] group-hover:text-[#64748B] transition-colors">{sys.icon}</span>
              </div>
              <span className="font-pixel text-sm text-[#8B9DB8] group-hover:text-[#A0B3CC] transition-colors">{sys.name}</span>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
