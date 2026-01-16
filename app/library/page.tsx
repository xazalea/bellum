import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function LibraryPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-6xl space-y-8">
        <header className="space-y-2 border-b-2 border-[#1F2937]/30 pb-6">
          <h1 className="text-3xl font-pixel text-[#94A3B8]">App Library</h1>
          <p className="font-retro text-xl text-[#64748B]">Community published applications.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="flex flex-col space-y-4 hover:border-[#374151] group">
              <div className="h-40 bg-[#030508] rounded-lg border border-[#1F2937] flex items-center justify-center group-hover:bg-[#0A0E1A] transition-colors">
                <span className="material-symbols-outlined text-4xl text-[#374151] group-hover:text-[#475569]">category</span>
              </div>
              <div>
                <h3 className="font-pixel text-sm text-[#94A3B8]">Application {i}</h3>
                <p className="font-retro text-sm text-[#475569] mt-1">Utility / System</p>
              </div>
              <Button className="w-full text-xs">Install</Button>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
