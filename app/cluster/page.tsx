import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ClusterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-6xl space-y-8">
        <header className="space-y-2 border-b-2 border-[#1F2937]/30 pb-6">
          <h1 className="text-3xl font-pixel text-[#94A3B8]">Cluster Management</h1>
          <p className="font-retro text-xl text-[#64748B]">Manage distributed nodes and computing resources.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-xs text-[#475569]">NODE-0{i}</span>
                <span className="w-2 h-2 bg-green-900 rounded-full animate-pulse shadow-[0_0_8px_#14532d]"></span>
              </div>
              <div className="h-32 bg-black/20 border border-[#1F2937]/20 p-2 font-retro text-sm space-y-1">
                <div className="text-[#64748B]">> uptime: 24d 1h</div>
                <div className="text-[#64748B]">> load: 0.45</div>
                <div className="text-[#64748B]">> tasks: 12 active</div>
              </div>
              <Button className="w-full text-xs">Manage Node</Button>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
