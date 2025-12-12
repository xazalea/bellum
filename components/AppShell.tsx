'use client';

import React, { useState, useEffect } from 'react';
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

export function AppShell({ children }: { children: React.ReactNode }) {
    const [isBooted, setIsBooted] = useState(false);
    const [activeTab, setActiveTab] = useState<'home' | 'apps' | 'archives' | 'cluster' | 'settings' | 'runner'>('home');
    const [runnerAppId, setRunnerAppId] = useState<string | null>(null);

    useEffect(() => {
        // Start the engine in the background
        nachoEngine.boot().catch(console.error);
    }, []);

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
            default:
                return <Dashboard />;
        }
    };

    return (
        <>
            {!isBooted && <BootSequence onComplete={() => setIsBooted(true)} />}
            
            <div className={`min-h-screen transition-opacity duration-1000 ${isBooted ? 'opacity-100' : 'opacity-0'}`}>
                <DynamicIsland
                    activeTab={activeTab}
                    onTabChange={(t) => setActiveTab(t as any)}
                    onOpenRunner={() => setActiveTab('runner')}
                />
                <main className="relative z-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 18, scale: 0.985, filter: 'blur(14px)' }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -10, scale: 0.99, filter: 'blur(12px)' }}
                            transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 0.9 }}
                        >
                            {renderView()}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </>
    );
}
