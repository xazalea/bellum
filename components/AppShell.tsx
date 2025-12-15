'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BootSequence } from './BootSequence';
import { DynamicIsland } from './DynamicIsland';
import { Dashboard } from './Dashboard';
import { AppLibrary } from './AppLibrary';
import { ClusterPanel } from './ClusterPanel';
import { SettingsPanel } from './Settings';
import { AppRunner } from './AppRunner';
import { nachoEngine } from '@/lib/nacho/engine';
import { Archives } from './Archives';
import { AccountPanel } from './Account';
import { XFabricPanel } from './XFabric';
import { CommandPalette, type CommandItem } from './CommandPalette';
import { useRouter } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
    const [isBooted, setIsBooted] = useState(false);
    const [activeTab, setActiveTab] = useState<'home' | 'apps' | 'archives' | 'account' | 'cluster' | 'settings' | 'runner' | 'fabrik'>('home');
    const [runnerAppId, setRunnerAppId] = useState<string | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const [paletteOpen, setPaletteOpen] = useState(false);

    // This app is primarily a single-page “shell” UI on `/`.
    // But we also want true Next.js routes for subsites like `/unblocker` and `/xfabric`.
    const isSubsiteRoute = pathname !== '/' && !pathname.startsWith('/api');

    useEffect(() => {
        // Start the engine in the background
        nachoEngine?.boot().catch(console.error);
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const isK = e.key.toLowerCase() === 'k';
            if ((e.metaKey || e.ctrlKey) && isK) {
                e.preventDefault();
                setPaletteOpen((v) => !v);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const commandItems: CommandItem[] = useMemo(
        () => [
            { id: 'home', label: 'Go: Dashboard', keywords: 'home nacho', hint: 'tab', onSelect: () => setActiveTab('home') },
            { id: 'apps', label: 'Go: App Library', keywords: 'apps install', hint: 'tab', onSelect: () => setActiveTab('apps') },
            { id: 'runner', label: 'Go: Runner', keywords: 'run app emulator', hint: 'tab', onSelect: () => setActiveTab('runner') },
            { id: 'archives', label: 'Go: Archives', keywords: 'archives backups', hint: 'tab', onSelect: () => setActiveTab('archives') },
            { id: 'account', label: 'Go: Account', keywords: 'auth profile friends', hint: 'tab', onSelect: () => setActiveTab('account') },
            { id: 'cluster', label: 'Go: Cluster', keywords: 'peers aethernet', hint: 'tab', onSelect: () => setActiveTab('cluster') },
            { id: 'settings', label: 'Go: Settings', keywords: 'performance storage', hint: 'tab', onSelect: () => setActiveTab('settings') },
            { id: 'fabrik', label: 'Open: Fabrik', keywords: 'hosting deploy domains xfabric', hint: '/fabrik', onSelect: () => router.push('/fabrik') },
            { id: 'unblocker', label: 'Open: Unblocker', keywords: 'cherri games', hint: '/start.html', onSelect: () => router.push('/start.html') },
        ],
        [router],
    );

    const renderView = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <Dashboard
                        onGoApps={() => setActiveTab('apps')}
                        onOpenRunner={() => setActiveTab('runner')}
                    />
                );
            case 'apps':
                return (
                    <AppLibrary
                        onRunApp={(appId) => {
                            setRunnerAppId(appId);
                            setActiveTab('runner');
                        }}
                    />
                );
            case 'cluster':
                return <ClusterPanel />;
            case 'settings':
                return <SettingsPanel />;
            case 'runner':
                return (
                    <AppRunner
                        appId={runnerAppId ?? undefined}
                        onExit={() => setActiveTab('home')}
                    />
                );
            case 'archives':
                return <Archives />;
            case 'account':
                return <AccountPanel />;
            case 'fabrik':
                return <XFabricPanel />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <>
            {isSubsiteRoute ? (
                <main className="min-h-screen">{children}</main>
            ) : (
                <>
                    {!isBooted && <BootSequence onComplete={() => setIsBooted(true)} />}

                    <div className={`min-h-screen transition-opacity duration-1000 ${isBooted ? 'opacity-100' : 'opacity-0'}`}>
                        <DynamicIsland
                            activeTab={activeTab}
                            onTabChange={(t) => setActiveTab(t as any)}
                            onOpenRunner={() => setActiveTab('runner')}
                        />
                        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={commandItems} />
                        <main className="relative z-0">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    // Avoid animating `filter: blur(...)` (expensive on low-end GPUs).
                                    initial={{ opacity: 0, y: 14, scale: 0.99 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.99 }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 0.9 }}
                                >
                                    {renderView()}
                                </motion.div>
                            </AnimatePresence>
                        </main>
                    </div>
                </>
            )}
        </>
    );
}
