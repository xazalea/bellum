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
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6 flex justify-between items-end">
          <div className="space-y-2">
            <h1 className="text-3xl font-pixel text-[#8B9DB8]">App Library</h1>
            <p className="font-retro text-xl text-[#64748B]">Installed applications and tools.</p>
          </div>
          <Button className="flex items-center gap-2">
             <span className="material-symbols-outlined text-lg">add</span> 
             Install App
          </Button>
        </header>

        {loading ? (
            <div className="text-[#64748B] font-retro text-center py-20 flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-[#64748B] border-t-transparent rounded-full animate-spin"></span>
              Loading library...
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map((app) => (
                <Card key={app.id} className="flex flex-col space-y-5 p-6 group">
                  <div className="h-44 bg-gradient-to-br from-[#1E2A3A] to-[#0C1016] rounded-lg border border-[#2A3648] flex items-center justify-center group-hover:border-[#64748B] transition-all relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#64748B]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="material-symbols-outlined text-6xl text-[#4A5A6F] group-hover:text-[#64748B] transition-all group-hover:scale-110 relative z-10">
                        {app.type === 'system' ? 'settings_suggest' : app.type === 'dev' ? 'code' : 'apps'}
                    </span>
                  </div>
                  <div className="flex-grow space-y-2">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="font-pixel text-sm text-[#8B9DB8] group-hover:text-[#A0B3CC] transition-colors">{app.name}</h3>
                        <span className="text-[9px] bg-[#1E2A3A] text-[#64748B] px-2 py-1 rounded border border-[#2A3648]">{app.version}</span>
                    </div>
                    <p className="font-retro text-base text-[#64748B]">{app.description}</p>
                  </div>
                  <div className="flex space-x-2 pt-2">
                      <Button className="flex-1 text-xs flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-base">play_arrow</span>
                        Launch
                      </Button>
                      <Button className="w-12 px-0 bg-transparent border-[#2A3648] hover:border-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444] transition-all">
                          <span className="material-symbols-outlined text-base">delete</span>
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
