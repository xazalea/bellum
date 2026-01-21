import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AndroidPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6">
          <h1 className="text-3xl font-sans font-bold text-[#8B9DB8]">Android Emulator</h1>
          <p className="font-sans text-xl text-[#64748B]">Run native Android applications in your browser.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 h-96 flex items-center justify-center bg-gradient-to-br from-[#0C1016] to-[#1E2A3A] border-dashed border-[#2A3648]">
            <div className="text-center space-y-5">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-[#1E2A3A] border border-[#2A3648] flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-[#4A5A6F]">android</span>
              </div>
              <p className="font-retro text-lg text-[#64748B]">No instance running</p>
              <Button className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">play_arrow</span>
                Launch New Instance
              </Button>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-pixel text-xs mb-5 text-[#64748B] uppercase tracking-wider">System Stats</h3>
              <div className="space-y-3 font-retro text-lg">
                <div className="flex justify-between items-center">
                  <span className="text-[#8B9DB8]">CPU</span>
                  <span className="text-[#64748B] text-base">0%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8B9DB8]">RAM</span>
                  <span className="text-[#64748B] text-base">0 / 4GB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8B9DB8]">Ping</span>
                  <span className="text-[#64748B] text-base">- ms</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-pixel text-xs mb-4 text-[#64748B] uppercase tracking-wider">Quick Actions</h3>
              <div className="space-y-2">
                <Button className="w-full justify-start text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">upload</span> Upload APK
                </Button>
                <Button className="w-full justify-start text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">settings</span> Settings
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
