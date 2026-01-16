import React from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function UnblockerPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-pixel text-[#E2E8F0]">Web Unblocker</h1>
          <p className="font-retro text-xl text-[#94A3B8]">Access the web freely and securely.</p>
        </div>

        <Card className="p-8 space-y-6">
          <Input placeholder="https://..." className="text-center text-xl h-14" />
          <div className="flex justify-center space-x-4">
            <Button className="w-32">Go</Button>
            <Button className="w-32 bg-[#1A2332] border-[#4A7BA7]">Random</Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
