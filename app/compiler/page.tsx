import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function CompilerPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-5xl space-y-6 h-[80vh] flex flex-col">
        <header className="flex justify-between items-end border-b-2 border-[#1F2937]/30 pb-4">
          <div>
            <h1 className="text-3xl font-pixel text-[#94A3B8]">Web Compiler</h1>
            <p className="font-retro text-xl text-[#64748B]">Multi-language support.</p>
          </div>
          <div className="flex space-x-2">
            <Button>Run</Button>
            <Button>Save</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
          <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col bg-[#030508]">
            <div className="bg-[#0A0E1A] p-2 flex space-x-2 border-b border-[#1F2937]/30">
              <span className="px-3 py-1 bg-[#030508] text-[#64748B] font-retro text-sm border-t-2 border-[#374151]">main.cpp</span>
            </div>
            <textarea 
              className="flex-grow bg-transparent p-4 font-retro text-lg text-[#94A3B8] resize-none focus:outline-none"
              defaultValue={`#include <iostream>

int main() {
    std::cout << "Hello from the deep!" << std::endl;
    return 0;
}`}
            />
          </Card>

          <div className="space-y-6 flex flex-col">
            <Card className="flex-grow bg-[#030508] font-retro text-sm overflow-y-auto">
              <h3 className="font-pixel text-xs mb-2 text-[#475569] border-b border-[#1F2937]/20 pb-1">Console Output</h3>
              <div className="text-green-800">
                $ g++ main.cpp -o main<br/>
                $ ./main<br/>
                Hello from the deep!
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
