import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function VPSPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-5xl space-y-8">
        <header className="space-y-2 border-b-2 border-[#1F2937]/30 pb-6">
          <h1 className="text-3xl font-pixel text-[#94A3B8]">Virtual Private Servers</h1>
          <p className="font-retro text-xl text-[#64748B]">Deploy and manage your instances.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-dashed border-[#374151] flex flex-col items-center justify-center h-64 space-y-4 cursor-pointer hover:bg-[#111827] transition-colors">
            <span className="material-symbols-outlined text-4xl text-[#475569]">add_circle</span>
            <span className="font-pixel text-sm text-[#64748B]">Create Instance</span>
          </Card>
        </div>
      </div>
    </main>
  );
}
