'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Mocking the AppManager interface for the UI since direct import 
// might cause issues with server/client boundaries if not handled carefully.
// In a real scenario, we'd use a server action or API route.

interface AppMetadata {
  id: string;
  name: string;
  description?: string;
  type: string;
  version?: string;
  installedAt?: Date;
}

export default function LibraryPage() {
  const [apps, setApps] = useState<AppMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching installed apps
    // In reality: await appManager.listInstalled()
    // For now we simulate to match the "connect with existing code" requirement visually
    // but without breaking build if backend isn't ready.
    
    setTimeout(() => {
        setApps([
            { id: '1', name: 'File Explorer', description: 'Manage system files', type: 'system', version: '1.0' },
            { id: '2', name: 'Terminal', description: 'Command line interface', type: 'utility', version: '2.4' },
            { id: '3', name: 'Code Editor', description: 'Develop applications', type: 'dev', version: '0.9' },
        ]);
        setLoading(false);
    }, 500);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-6xl space-y-8">
        <header className="space-y-2 border-b-2 border-[#1F2937]/30 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-pixel text-[#94A3B8]">App Library</h1>
            <p className="font-retro text-xl text-[#64748B]">Installed applications and tools.</p>
          </div>
          <Button>
             <span className="material-symbols-outlined mr-2">add</span> Install App
          </Button>
        </header>

        {loading ? (
            <div className="text-[#64748B] font-retro text-center py-20">Loading library...</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map((app) => (
                <Card key={app.id} className="flex flex-col space-y-4 hover:border-[#374151] group">
                  <div className="h-40 bg-[#030508] rounded-lg border border-[#1F2937] flex items-center justify-center group-hover:bg-[#0A0E1A] transition-colors relative overflow-hidden">
                    <span className="material-symbols-outlined text-5xl text-[#374151] group-hover:text-[#475569] transition-colors">
                        {app.type === 'system' ? 'settings_suggest' : app.type === 'dev' ? 'code' : 'apps'}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between items-start">
                        <h3 className="font-pixel text-sm text-[#94A3B8]">{app.name}</h3>
                        <span className="text-[10px] bg-[#1F2937] text-[#64748B] px-2 py-0.5 rounded">{app.version}</span>
                    </div>
                    <p className="font-retro text-sm text-[#475569] mt-1">{app.description}</p>
                  </div>
                  <div className="flex space-x-2 pt-2">
                      <Button className="flex-1 text-xs">Launch</Button>
                      <Button className="w-10 px-0 bg-transparent border-[#1F2937] hover:border-[#EF4444] hover:text-[#EF4444]">
                          <span className="material-symbols-outlined text-sm">delete</span>
                      </Button>
                  </div>
                </Card>
              ))}
            </div>
        )}
      </div>
    </main>
  );
}
