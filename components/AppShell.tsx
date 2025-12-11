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

export function AppShell({ children }: { children: React.ReactNode }) {
    const [isBooted, setIsBooted] = useState(false);
    const [activeTab, setActiveTab] = useState('home');

    useEffect(() => {
        // Start the engine in the background
        nachoEngine.boot().catch(console.error);
    }, []);

    const renderView = () => {
        switch (activeTab) {
            case 'home':
                return <Dashboard />;
            case 'library':
                return <AppLibrary />;
            case 'cluster':
                return <ClusterPanel />;
            case 'settings':
                return <SettingsPanel />;
            case 'runner':
                return <AppRunner />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <>
            {!isBooted && <BootSequence onComplete={() => setIsBooted(true)} />}
            
            <div className={`min-h-screen transition-opacity duration-1000 ${isBooted ? 'opacity-100' : 'opacity-0'}`}>
                <DynamicIsland activeTab={activeTab} onTabChange={setActiveTab} />
                <main className="relative z-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderView()}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </>
    );
}
