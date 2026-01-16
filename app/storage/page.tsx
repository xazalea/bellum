import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function StoragePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-6xl space-y-8">
        <header className="space-y-2 border-b-2 border-[#1F2937]/30 pb-6">
          <h1 className="text-3xl font-pixel text-[#94A3B8]">Storage</h1>
          <p className="font-retro text-xl text-[#64748B]">Manage your deep sea archives.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="col-span-1 h-fit space-y-4">
            <h3 className="font-pixel text-xs text-[#475569] uppercase">Drives</h3>
            <div className="space-y-2">
              <Button className="w-full justify-start bg-[#111827] text-[#94A3B8] border-none hover:bg-[#1F2937]">
                <span className="material-symbols-outlined mr-2 text-sm">hard_drive</span> System (C:)
              </Button>
              <Button className="w-full justify-start bg-transparent text-[#64748B] border-none hover:bg-[#1F2937]">
                <span className="material-symbols-outlined mr-2 text-sm">cloud</span> Network (Z:)
              </Button>
            </div>
            
            <div className="pt-4 border-t border-[#1F2937]">
              <div className="flex justify-between text-xs text-[#475569] mb-1">
                <span>Usage</span>
                <span>45%</span>
              </div>
              <div className="h-2 bg-[#030508] rounded-full overflow-hidden">
                <div className="h-full w-[45%] bg-[#374151]"></div>
              </div>
            </div>
          </Card>

          <Card className="col-span-1 lg:col-span-3 min-h-[500px] bg-[#030508]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
               {['Documents', 'Images', 'System', 'Logs', 'Backup', 'Temp'].map((folder) => (
                 <div key={folder} className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-[#111827] cursor-pointer text-[#64748B] hover:text-[#94A3B8] transition-colors">
                   <span className="material-symbols-outlined text-5xl mb-2 text-[#1F2937]">folder</span>
                   <span className="font-retro">{folder}</span>
                 </div>
               ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
