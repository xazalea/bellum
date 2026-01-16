import React from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function UnblockerPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-pixel text-[#94A3B8]">Web Unblocker</h1>
          <p className="font-retro text-xl text-[#64748B]">Access the web freely and securely.</p>
        </div>

        <Card className="p-8 space-y-6 bg-[#0A0E1A]">
          <Input placeholder="https://..." className="text-center text-xl h-14 bg-[#030508] border-[#1F2937]" />
          <div className="flex justify-center space-x-4">
            <Button className="w-32 bg-[#1F2937] text-[#94A3B8] border-[#374151] hover:text-[#E2E8F0]">Go</Button>
            <Button className="w-32 bg-[#030508] border-[#1F2937] text-[#64748B] hover:text-[#94A3B8]">Random</Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
