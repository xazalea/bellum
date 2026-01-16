import React from 'react';
import { Card } from '@/components/ui/Card';

export default function WindowsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-2 border-b-2 border-[#4A7BA7]/30 pb-6">
          <h1 className="text-3xl font-pixel text-[#E2E8F0]">Windows Environment</h1>
          <p className="font-retro text-xl text-[#94A3B8]">Streamed desktop experience.</p>
        </header>

        <Card className="aspect-video flex items-center justify-center bg-[#000000]">
          <div className="text-center space-y-2">
            <span className="material-symbols-outlined text-6xl text-[#4A7BA7] animate-spin">hourglass_empty</span>
            <p className="font-pixel text-sm text-[#7DD3FC]">BOOTING SYSTEM...</p>
          </div>
        </Card>
      </div>
    </main>
  );
}
