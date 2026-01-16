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
        <header className="space-y-2 border-b-2 border-[#1F2937]/30 pb-6">
          <h1 className="text-3xl font-pixel text-[#94A3B8]">Retro Emulator</h1>
          <p className="font-retro text-xl text-[#64748B]">Classic systems in your browser.</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {systems.map((sys) => (
            <Card key={sys.name} variant="hover" className="flex flex-col items-center justify-center space-y-4 aspect-square cursor-pointer border-[#1F2937]/30 hover:border-[#374151]">
              <span className="material-symbols-outlined text-5xl text-[#475569]">{sys.icon}</span>
              <span className="font-pixel text-sm text-[#94A3B8]">{sys.name}</span>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
