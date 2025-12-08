'use client';

import React, { useState, useEffect } from 'react';
import { BootSequence } from './BootSequence';
import { DynamicIsland } from './DynamicIsland';
import { nachoEngine } from '@/lib/nacho/engine';

export function AppShell({ children }: { children: React.ReactNode }) {
    const [isBooted, setIsBooted] = useState(false);

    useEffect(() => {
        // Start the engine in the background
        // This ensures the "RTX Stack" is online before the user interacts
        nachoEngine.boot().catch(console.error);
    }, []);

    return (
        <>
            {!isBooted && <BootSequence onComplete={() => setIsBooted(true)} />}
            
            <div className={`min-h-screen transition-opacity duration-1000 ${isBooted ? 'opacity-100' : 'opacity-0'}`}>
                <DynamicIsland />
                <main>
                    {children}
                </main>
            </div>
        </>
    );
}


