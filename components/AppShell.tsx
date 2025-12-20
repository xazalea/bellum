'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BootSequence } from './BootSequence';
import { DynamicIsland } from './DynamicIsland';
import { nachoEngine } from '@/lib/nacho/engine';
import { CommandPalette, type CommandItem } from './CommandPalette';
import { useRouter } from 'next/navigation';
import { AchievementToasts } from './AchievementToasts';
import { AchievementsModal } from './AchievementsModal';
import { unlockAchievement } from '@/lib/gamification/achievements';

const Dashboard = React.lazy(() => import('./Dashboard').then((m) => ({ default: m.Dashboard })));
const AppLibrary = React.lazy(() => import('./AppLibrary').then((m) => ({ default: m.AppLibrary })));
const ClusterPanel = React.lazy(() => import('./ClusterPanel').then((m) => ({ default: m.ClusterPanel })));
const SettingsPanel = React.lazy(() => import('./Settings').then((m) => ({ default: m.SettingsPanel })));
const AppRunner = React.lazy(() => import('./AppRunner').then((m) => ({ default: m.AppRunner })));
const Archives = React.lazy(() => import('./Archives').then((m) => ({ default: m.Archives })));
const AccountPanel = React.lazy(() => import('./Account').then((m) => ({ default: m.AccountPanel })));
const XFabricPanel = React.lazy(() => import('./XFabric').then((m) => ({ default: m.XFabricPanel })));
const AetherLanPanel = React.lazy(() => import('./AetherLan').then((m) => ({ default: m.AetherLanPanel })));
const NotebookPanel = React.lazy(() => import('./Notebook').then((m) => ({ default: m.NotebookPanel })));

function PanelFallback({ label }: { label: string }) {
  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24">
      <div className="bellum-card p-6 border-2 border-white/10">
        <div className="text-sm font-bold text-white/90">{label}</div>
        <div className="text-xs text-white/45 mt-1">Loading…</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const [isBooted, setIsBooted] = useState(false);
    const [activeTab, setActiveTab] = useState<'home' | 'apps' | 'archives' | 'account' | 'cluster' | 'settings' | 'runner' | 'fabrik' | 'lan' | 'notebook'>('home');
    const [runnerAppId, setRunnerAppId] = useState<string | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [achievementsOpen, setAchievementsOpen] = useState(false);
    const [motionPref, setMotionPref] = useState<'auto' | 'reduced' | 'full'>('auto');
    const [perfLevel, setPerfLevel] = useState<'high' | 'balanced' | 'low'>('high');

    // This app is primarily a single-page “shell” UI on `/`.
    // But we also want true Next.js routes for subsites like `/xfabric`.
    const isSubsiteRoute = pathname !== '/' && !pathname.startsWith('/api');

    useEffect(() => {
        // Start the engine off the critical path (avoid stealing time from first paint).
        const ric = (window as any).requestIdleCallback as ((cb: () => void) => number) | undefined;
        if (ric) {
            ric(() => nachoEngine?.boot().catch(console.error));
        } else {
            window.setTimeout(() => nachoEngine?.boot().catch(console.error), 250);
        }
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

    useEffect(() => {
        // Perf/motion are controlled via root dataset (quality brain + settings).
        // We mirror them into state to make Framer Motion transitions cheap + adaptive.
        if (typeof document === 'undefined') return;
        const el = document.documentElement;

        const read = () => {
            const m = (el.dataset.motion as any) as 'auto' | 'reduced' | 'full' | undefined;
            setMotionPref(m === 'reduced' || m === 'full' ? m : 'auto');
            const p = (el.dataset.perf as any) as 'high' | 'balanced' | 'low' | undefined;
            setPerfLevel(p === 'low' || p === 'balanced' ? p : 'high');
        };
        read();

        const obs = new MutationObserver(() => read());
        obs.observe(el, { attributes: true, attributeFilter: ['data-motion', 'data-perf'] });
        return () => obs.disconnect();
    }, []);

    const commandItems: CommandItem[] = useMemo(
        () => [
            { id: 'home', label: 'Go: Dashboard', keywords: 'home nacho', hint: 'tab', onSelect: () => setActiveTab('home') },
            { id: 'apps', label: 'Go: App Library', keywords: 'apps install', hint: 'tab', onSelect: () => setActiveTab('apps') },
            { id: 'runner', label: 'Go: Runner', keywords: 'run app emulator', hint: 'tab', onSelect: () => setActiveTab('runner') },
            { id: 'archives', label: 'Go: Archives', keywords: 'archives backups', hint: 'tab', onSelect: () => setActiveTab('archives') },
            { id: 'account', label: 'Go: Account', keywords: 'auth profile friends', hint: 'tab', onSelect: () => setActiveTab('account') },
            { id: 'cluster', label: 'Go: Cluster', keywords: 'peers aethernet', hint: 'tab', onSelect: () => setActiveTab('cluster') },
            { id: 'lan', label: 'Go: AetherLAN', keywords: 'lan network room ipv6', hint: 'tab', onSelect: () => setActiveTab('lan') },
            { id: 'notebook', label: 'Go: Notebook', keywords: 'jupyter python cells', hint: 'tab', onSelect: () => setActiveTab('notebook') },
            { id: 'settings', label: 'Go: Settings', keywords: 'performance storage', hint: 'tab', onSelect: () => setActiveTab('settings') },
            { id: 'fabrik', label: 'Open: Fabrik', keywords: 'hosting deploy domains xfabric', hint: '/fabrik', onSelect: () => router.push('/fabrik') },
            { id: 'achievements', label: 'Open: Achievements', keywords: 'missions xp trophies', hint: 'panel', onSelect: () => setAchievementsOpen(true) },
        ],
        [router],
    );

    const renderView = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <Suspense fallback={<PanelFallback label="Dashboard" />}>
                        <Dashboard
                            onGoApps={() => setActiveTab('apps')}
                            onOpenRunner={(appId) => {
                                if (appId) setRunnerAppId(appId);
                                setActiveTab('runner');
                            }}
                        />
                    </Suspense>
                );
            case 'apps':
                return (
                    <Suspense fallback={<PanelFallback label="App Library" />}>
                        <AppLibrary
                            onRunApp={(appId) => {
                                setRunnerAppId(appId);
                                setActiveTab('runner');
                            }}
                        />
                    </Suspense>
                );
            case 'cluster':
                return (
                    <Suspense fallback={<PanelFallback label="Cluster" />}>
                        <ClusterPanel />
                    </Suspense>
                );
            case 'settings':
                return (
                    <Suspense fallback={<PanelFallback label="Settings" />}>
                        <SettingsPanel />
                    </Suspense>
                );
            case 'runner':
                return (
                    <Suspense fallback={<PanelFallback label="Runner" />}>
                        <AppRunner
                            appId={runnerAppId ?? undefined}
                            onExit={() => setActiveTab('home')}
                        />
                    </Suspense>
                );
            case 'archives':
                return (
                    <Suspense fallback={<PanelFallback label="Archives" />}>
                        <Archives />
                    </Suspense>
                );
            case 'account':
                return (
                    <Suspense fallback={<PanelFallback label="Account" />}>
                        <AccountPanel />
                    </Suspense>
                );
            case 'fabrik':
                return (
                    <Suspense fallback={<PanelFallback label="Fabrik" />}>
                        <XFabricPanel />
                    </Suspense>
                );
            case 'lan':
                return (
                    <Suspense fallback={<PanelFallback label="AetherLAN" />}>
                        <AetherLanPanel />
                    </Suspense>
                );
            case 'notebook':
                return (
                    <Suspense fallback={<PanelFallback label="Notebook" />}>
                        <NotebookPanel />
                    </Suspense>
                );
            default:
                return (
                    <Suspense fallback={<PanelFallback label="Dashboard" />}>
                        <Dashboard />
                    </Suspense>
                );
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
                            onTabChange={(t) => {
                                if (t === 'fabrik') unlockAchievement('opened_fabrik');
                                setActiveTab(t as any);
                            }}
                            onOpenRunner={() => setActiveTab('runner')}
                            onOpenAchievements={() => setAchievementsOpen(true)}
                        />
                        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={commandItems} />
                        <AchievementsModal open={achievementsOpen} onClose={() => setAchievementsOpen(false)} />
                        <AchievementToasts />
                        <main className="relative z-0">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    // Avoid animating `filter: blur(...)` (expensive on low-end GPUs).
                                    initial={{ opacity: 0, y: motionPref === 'reduced' ? 0 : perfLevel === 'low' ? 8 : 14, scale: perfLevel === 'low' ? 0.995 : 0.99 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: motionPref === 'reduced' ? 0 : perfLevel === 'low' ? -6 : -10, scale: perfLevel === 'low' ? 0.995 : 0.99 }}
                                    transition={
                                        motionPref === 'reduced'
                                            ? { duration: 0.001 }
                                            : perfLevel === 'low'
                                                ? { type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }
                                                : { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 }
                                    }
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
