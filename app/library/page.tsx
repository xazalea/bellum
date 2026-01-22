'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { discordDB, UserProfile, InstalledApp } from '@/lib/persistence/discord-db';
import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';
import { getProxiedGameUrl } from '@/lib/games-parser';

export default function LibraryPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [launchingApp, setLaunchingApp] = useState<InstalledApp | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const fp = await getDeviceFingerprintId();
        const p = await discordDB.init(fp);
        setProfile(p);
      } catch (err) {
        console.error('Failed to load library', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleLaunch = (app: InstalledApp) => {
    setLaunchingApp(app);
  };

  const handleUninstall = async (appId: string) => {
    if (!confirm('Are you sure you want to uninstall this app?')) return;
    
    try {
      await discordDB.removeApp(appId);
      const updated = await discordDB.getProfile();
      setProfile(updated ? { ...updated } : null); // Force re-render
    } catch (err) {
      console.error('Uninstall failed', err);
      alert('Failed to update Discord account');
    }
  };

  return (
    <main className="min-h-screen bg-nacho-bg p-6 pt-24">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-nacho-border pb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-nacho-primary tracking-tight">App Library</h1>
            <p className="text-nacho-secondary text-lg">Your installed applications & games.</p>
          </div>
          <div className="flex gap-2 text-sm text-nacho-muted items-center">
            <span className={`w-2 h-2 rounded-full ${profile ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {profile ? 'Synced to Discord' : 'Offline'}
          </div>
        </header>

        {launchingApp ? (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
                <div className="bg-nacho-surface border-b border-nacho-border p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h2 className="text-white font-bold">{launchingApp.title}</h2>
                        <span className="text-xs bg-nacho-accent/20 text-nacho-accent px-2 py-0.5 rounded">Running</span>
                    </div>
                    <Button onClick={() => setLaunchingApp(null)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30">
                        <span className="material-symbols-outlined mr-2">close</span>
                        Close App
                    </Button>
                </div>
                <div className="flex-grow relative">
                    {launchingApp.type === 'game' ? (
                        <iframe 
                            src={getProxiedGameUrl(launchingApp.id.startsWith('http') ? launchingApp.id : `https://html5.gamedistribution.com/${launchingApp.id}/`)} 
                            className="w-full h-full border-0"
                            title={launchingApp.title}
                            allowFullScreen
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-nacho-muted">
                            <p>Launching native app container...</p>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <>
                {loading ? (
                    <div className="flex justify-center py-20">
                        <span className="w-8 h-8 border-2 border-nacho-accent border-t-transparent rounded-full animate-spin"></span>
                    </div>
                ) : !profile?.installedApps.length ? (
                    <Card className="p-12 text-center bg-nacho-surface border-nacho-border">
                        <span className="material-symbols-outlined text-6xl text-nacho-muted mb-4 inline-block">apps</span>
                        <h2 className="text-xl font-bold text-nacho-primary mb-2">Library Empty</h2>
                        <p className="text-nacho-secondary mb-6">
                            You haven&apos;t installed any apps yet. Visit the Arcade to find games.
              </p>
                        <Button onClick={() => window.location.href = '/games'} className="bg-nacho-accent text-white border-none">
                            Browse Games
              </Button>
            </Card>
        ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {profile.installedApps.map((app) => (
                            <Card key={app.id} className="group bg-nacho-surface border-nacho-border hover:border-nacho-accent transition-all duration-300 p-0 overflow-hidden flex flex-col">
                                <div className="aspect-video relative bg-black/50">
                                    {app.thumb ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={app.thumb} alt={app.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-4xl text-nacho-muted">extension</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleUninstall(app.id)}
                                            className="p-1.5 bg-black/50 hover:bg-red-500 rounded-full text-white transition-colors"
                                            title="Uninstall"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                        </button>
                  </div>
                    </div>
                                <div className="p-4 flex-grow flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-nacho-primary truncate mb-1">{app.title}</h3>
                                        <p className="text-xs text-nacho-muted">
                                            Installed {new Date(app.installedAt).toLocaleDateString()}
                                        </p>
                  </div>
                                    <Button 
                                        onClick={() => handleLaunch(app)}
                                        className="w-full mt-4 bg-nacho-bg hover:bg-nacho-accent text-nacho-primary hover:text-white border-nacho-border hover:border-transparent transition-all"
                                    >
                                        <span className="material-symbols-outlined mr-2 text-[16px]">play_arrow</span>
                        Launch
                      </Button>
                  </div>
                </Card>
              ))}
            </div>
                )}
            </>
        )}
      </div>
    </main>
  );
}
