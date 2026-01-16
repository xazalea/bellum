import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AndroidPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-2 border-b-2 border-[#1F2937]/30 pb-6">
          <h1 className="text-3xl font-pixel text-[#94A3B8]">Android Emulator</h1>
          <p className="font-retro text-xl text-[#64748B]">Run native Android applications in your browser.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 h-96 flex items-center justify-center bg-black/40 border-dashed border-[#374151]">
            <div className="text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-[#374151] opacity-50">android</span>
              <p className="font-retro text-lg text-[#64748B]">No instance running</p>
              <Button>Launch New Instance</Button>
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <h3 className="font-pixel text-sm mb-4 text-[#475569]">System Stats</h3>
              <div className="space-y-2 font-retro text-lg">
                <div className="flex justify-between">
                  <span>CPU</span>
                  <span className="text-[#475569]">0%</span>
                </div>
                <div className="flex justify-between">
                  <span>RAM</span>
                  <span className="text-[#475569]">0 / 4GB</span>
                </div>
                <div className="flex justify-between">
                  <span>Ping</span>
                  <span className="text-[#475569]">- ms</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-pixel text-sm mb-4 text-[#475569]">Quick Actions</h3>
              <div className="space-y-2">
                <Button className="w-full justify-start text-sm">
                  <span className="material-symbols-outlined mr-2 text-base">upload</span> Upload APK
                </Button>
                <Button className="w-full justify-start text-sm">
                  <span className="material-symbols-outlined mr-2 text-base">settings</span> Settings
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
