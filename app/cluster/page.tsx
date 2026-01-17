import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ClusterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-6xl space-y-8">
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6">
          <h1 className="text-3xl font-pixel text-[#8B9DB8]">Cluster Management</h1>
          <p className="font-retro text-xl text-[#64748B]">Manage distributed nodes and computing resources.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="space-y-5 p-6 group hover:border-[#64748B]/50">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[10px] text-[#64748B] uppercase tracking-wider">NODE-0{i}</span>
                <div className="relative">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(5,150,105,0.6)] block"></span>
                  <span className="absolute inset-0 w-2 h-2 bg-emerald-600/30 rounded-full animate-ping"></span>
                </div>
              </div>
              <div className="h-32 bg-gradient-to-br from-[#0C1016] to-[#1E2A3A] border border-[#2A3648] rounded-lg p-3 font-retro text-sm space-y-2 group-hover:border-[#4A5A6F] transition-colors">
                <div className="text-[#8B9DB8]">&gt; uptime: <span className="text-[#64748B]">24d 1h</span></div>
                <div className="text-[#8B9DB8]">&gt; load: <span className="text-[#64748B]">0.45</span></div>
                <div className="text-[#8B9DB8]">&gt; tasks: <span className="text-[#64748B]">12 active</span></div>
              </div>
              <Button className="w-full text-xs flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">settings</span>
                Manage Node
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
