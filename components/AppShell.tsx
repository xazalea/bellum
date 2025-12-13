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
import { AccountPanel } from './Account';
import { authService, type AuthDiagnostics } from '@/lib/firebase/auth-service';

export function AppShell({ children }: { children: React.ReactNode }) {
    const [isBooted, setIsBooted] = useState(false);
    const [activeTab, setActiveTab] = useState<'home' | 'apps' | 'archives' | 'account' | 'cluster' | 'settings' | 'runner'>('home');
    const [runnerAppId, setRunnerAppId] = useState<string | null>(null);
    const [authDiag, setAuthDiag] = useState<AuthDiagnostics>(() => authService.getDiagnostics());

    useEffect(() => {
        // Start the engine in the background
        nachoEngine?.boot().catch(console.error);
    }, []);

    useEffect(() => {
        return authService.onDiagnosticsChange(setAuthDiag);
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
            case 'account':
                return <AccountPanel />;
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
                    {authDiag.unavailable && (
                        <div className="w-full max-w-5xl mx-auto px-8 pt-24 -mb-16">
                            <div className="bellum-card p-4 border-2 border-amber-200/20 bg-amber-200/5">
                                <div className="text-sm font-semibold text-white">Firebase Auth not configured</div>
                                <div className="text-xs text-white/60 mt-1">
                                    {authDiag.message || 'Enable Authentication providers in Firebase Console.'}
                                    {authDiag.code ? <span className="text-white/40"> (code: {authDiag.code})</span> : null}
                                </div>
                            </div>
                        </div>
                    )}
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
