import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function StoragePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-6xl space-y-8">
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6">
          <h1 className="text-3xl font-pixel text-[#8B9DB8]">Storage</h1>
          <p className="font-retro text-xl text-[#64748B]">Manage your deep sea archives.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="col-span-1 h-fit space-y-6 p-6">
            <h3 className="font-pixel text-[10px] text-[#64748B] uppercase tracking-wider">Drives</h3>
            <div className="space-y-2">
              <Button className="w-full justify-start bg-[#1E2A3A] text-[#8B9DB8] border-[#2A3648] hover:bg-[#2A3648]">
                <span className="material-symbols-outlined mr-2 text-base">hard_drive</span> System (C:)
              </Button>
              <Button className="w-full justify-start bg-transparent text-[#64748B] border-[#2A3648] hover:bg-[#1E2A3A]">
                <span className="material-symbols-outlined mr-2 text-base">cloud</span> Network (Z:)
              </Button>
            </div>
            
            <div className="pt-4 border-t border-[#2A3648]">
              <div className="flex justify-between text-xs text-[#64748B] mb-2 font-retro">
                <span>Usage</span>
                <span>45%</span>
              </div>
              <div className="h-2.5 bg-[#0C1016] rounded-full overflow-hidden border border-[#2A3648]">
                <div className="h-full w-[45%] bg-gradient-to-r from-[#4A5A6F] to-[#64748B] rounded-full"></div>
              </div>
              <div className="flex justify-between text-[10px] text-[#4A5A6F] mt-2 font-retro">
                <span>22.5 GB used</span>
                <span>50 GB total</span>
              </div>
            </div>
          </Card>

          <Card className="col-span-1 lg:col-span-3 min-h-[500px] bg-gradient-to-br from-[#0C1016] to-[#1E2A3A] p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {['Documents', 'Images', 'System', 'Logs', 'Backup', 'Temp'].map((folder) => (
                 <div key={folder} className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-[#2A3648]/50 cursor-pointer text-[#64748B] hover:text-[#8B9DB8] transition-all border border-transparent hover:border-[#4A5A6F]/30 group">
                   <span className="material-symbols-outlined text-6xl mb-3 text-[#2A3648] group-hover:text-[#4A5A6F] transition-colors">folder</span>
                   <span className="font-retro text-base">{folder}</span>
                 </div>
               ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
