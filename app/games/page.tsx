import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function GamesPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-7xl space-y-8">
        <header className="space-y-2 border-b-2 border-[#1F2937]/30 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-pixel text-[#94A3B8]">Games Arcade</h1>
            <p className="font-retro text-xl text-[#64748B]">Retro gaming library.</p>
          </div>
          <Button>Import XML</Button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <Card key={i} className="aspect-[3/4] p-2 flex flex-col space-y-2 hover:scale-105 transition-transform cursor-pointer border-[#1F2937] hover:border-[#475569]">
              <div className="flex-grow bg-[#030508] rounded flex items-center justify-center">
                 <span className="material-symbols-outlined text-4xl text-[#1F2937]">sports_esports</span>
              </div>
              <div className="px-1">
                <h4 className="font-pixel text-[10px] text-[#94A3B8] truncate">Game Title {i}</h4>
                <span className="text-[10px] font-retro text-[#475569]">NES</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
