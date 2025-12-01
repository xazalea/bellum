'use client';

import React, { useState, useEffect } from 'react';
import { WindowManager } from './WindowManager';
import { Taskbar } from './Taskbar';
import { OsSwitcher } from './OsSwitcher';
import { PerformanceDashboard } from './PerformanceDashboard';
import { Tutorial } from './Tutorial';
import { VMType } from '@/lib/vm/types';

export const Desktop: React.FC = () => {
    const [activeSkin, setActiveSkin] = useState<VMType>(VMType.WINDOWS);
    const [backgroundImage, setBackgroundImage] = useState<string>('');
    const [activeVMs, setActiveVMs] = useState<string[]>([]);

    useEffect(() => {
        // Modern gradient backgrounds instead of external images for better performance
        switch (activeSkin) {
            case VMType.WINDOWS:
                setBackgroundImage('linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 30%, #2e0a4e 50%, #1a0a2e 70%, #0a0a0a 100%)');
                break;
            case VMType.LINUX:
                setBackgroundImage('linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 30%, #2e1a4e 50%, #1a1a2e 70%, #0a0a0a 100%)');
                break;
            case VMType.ANDROID:
                setBackgroundImage('linear-gradient(135deg, #0a0a0a 0%, #1a2e1a 30%, #2e4e1a 50%, #1a2e1a 70%, #0a0a0a 100%)');
                break;
            case VMType.XBOX:
                setBackgroundImage('linear-gradient(135deg, #0a0a0a 0%, #0a2e1a 30%, #0a4e2e 50%, #0a2e1a 70%, #0a0a0a 100%)');
                break;
            default:
                setBackgroundImage('linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 30%, #2e0a4e 50%, #1a0a2e 70%, #0a0a0a 100%)');
        }
    }, [activeSkin]);

    // Poll for active VMs
    useEffect(() => {
        const checkVMs = () => {
            import('@/lib/vm/manager').then(({ vmManager }) => {
                const vms = vmManager.listVMs().filter(vm => vm.state.isRunning).map(vm => vm.id);
                setActiveVMs(vms);
            });
        };

        const interval = setInterval(checkVMs, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="desktop-container gpu-accelerated"
            style={{
                width: '100vw',
                height: '100vh',
                background: backgroundImage,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                overflow: 'hidden',
                position: 'relative',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
        >
            {/* Animated background overlay */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `
                        radial-gradient(circle at 20% 30%, rgba(255, 0, 255, 0.06) 0%, transparent 50%),
                        radial-gradient(circle at 80% 70%, rgba(0, 255, 255, 0.06) 0%, transparent 50%),
                        radial-gradient(circle at 50% 50%, rgba(138, 43, 226, 0.04) 0%, transparent 50%)
                    `,
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />

            {/* Desktop Icons Area */}
            <div 
                style={{ 
                    padding: '20px', 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, 100px)', 
                    gap: '20px',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {/* Icons will go here */}
            </div>

            {/* Window Manager Layer */}
            <div style={{ position: 'relative', zIndex: 10 }}>
                <WindowManager 
                    activeSkin={activeSkin} 
                    activeVMs={activeVMs} 
                />
            </div>

            {/* OS Switcher (Top Right) */}
            <div style={{ position: 'relative', zIndex: 20 }}>
                <OsSwitcher currentSkin={activeSkin} onSwitch={setActiveSkin} />
            </div>

            {/* Taskbar (Bottom) */}
            <div style={{ position: 'relative', zIndex: 20 }}>
                <Taskbar 
                    activeSkin={activeSkin} 
                    activeVMs={activeVMs}
                />
            </div>

            {/* Performance Dashboard */}
            <PerformanceDashboard />

            {/* Tutorial Overlay */}
            <Tutorial />
        </div>
    );
};
