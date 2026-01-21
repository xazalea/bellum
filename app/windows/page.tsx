import React from 'react';
import { Card } from '@/components/ui/Card';

export default function WindowsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6">
          <h1 className="text-3xl font-sans font-bold text-[#8B9DB8]">Windows Environment</h1>
          <p className="font-sans text-xl text-[#64748B]">Streamed desktop experience.</p>
        </header>

        <Card className="aspect-video flex items-center justify-center bg-gradient-to-br from-[#000000] to-[#0A0E14] border-[#2A3648]">
          <div className="text-center space-y-4">
            <div className="relative">
              <span className="material-symbols-outlined text-6xl text-[#4A5A6F] animate-spin">hourglass_empty</span>
              <div className="absolute inset-0 blur-xl bg-[#64748B]/20 animate-pulse"></div>
            </div>
            <p className="font-pixel text-xs text-[#64748B] tracking-wider">BOOTING SYSTEM...</p>
          </div>
        </Card>
      </div>
    </main>
  );
}
