import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function VPSPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-5xl space-y-8">
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6">
          <h1 className="text-3xl font-pixel text-[#8B9DB8]">Virtual Private Servers</h1>
          <p className="font-retro text-xl text-[#64748B]">Deploy and manage your instances.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-dashed border-[#2A3648] flex flex-col items-center justify-center h-64 space-y-5 cursor-pointer hover:bg-[#1E2A3A]/50 hover:border-[#4A5A6F] transition-all group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1E2A3A] to-[#0C1016] border border-[#2A3648] flex items-center justify-center group-hover:border-[#64748B] group-hover:scale-105 transition-all">
              <span className="material-symbols-outlined text-5xl text-[#4A5A6F] group-hover:text-[#64748B]">add_circle</span>
            </div>
            <span className="font-pixel text-xs text-[#64748B] group-hover:text-[#8B9DB8] transition-colors">Create Instance</span>
          </Card>
        </div>
      </div>
    </main>
  );
}
