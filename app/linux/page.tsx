import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function LinuxPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-2 border-b-2 border-[#4A7BA7]/30 pb-6">
          <h1 className="text-3xl font-pixel text-[#E2E8F0]">Linux Terminal</h1>
          <p className="font-retro text-xl text-[#94A3B8]">Full root access environment.</p>
        </header>

        <Card className="h-[60vh] bg-black font-retro text-lg p-4 overflow-hidden border-[#4A7BA7]">
          <div className="text-green-500">
            root@challenger-deep:~# <span className="animate-pulse">_</span>
          </div>
        </Card>
      </div>
    </main>
  );
}
