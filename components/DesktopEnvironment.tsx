'use client';

import React, { useState, useEffect } from 'react';
import { Taskbar } from './Taskbar';
import { WindowManager } from './WindowManager';
import { VMType } from '@/lib/vm/types';
import { vmManager } from '@/lib/vm/manager';
import { colors } from '@/lib/ui/design-system';

export default function DesktopEnvironment() {
    const [booted, setBooted] = useState(false);
    const [activeVMs, setActiveVMs] = useState<string[]>([]);
    const [sysMonActive, setSysMonActive] = useState(false);

    // Boot Sequence
    useEffect(() => {
        const timer = setTimeout(() => {
            setBooted(true);
        }, 2000); // 2s simulated boot
        return () => clearTimeout(timer);
    }, []);

    // Sync with VM Manager and Local State
    useEffect(() => {
        const interval = setInterval(() => {
            const running = vmManager.listVMs().filter(vm => vm.state.isRunning).map(vm => vm.id);
            if (sysMonActive) running.push('system-monitor');
            setActiveVMs(running);
        }, 500);
        return () => clearInterval(interval);
    }, [sysMonActive]);

    const launchVM = async (type: VMType | 'sysmon') => {
        if (type === 'sysmon') {
            setSysMonActive(true);
            return;
        }

        const id = `vm-${type}-${Date.now()}`;
        try {
            const vm = await vmManager.createVM({
                id,
                type,
                name: `${type} VM`,
                memory: 1024
            });
            await vm.start();
        } catch (e) {
            console.error(e);
        }
    };

    if (!booted) {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: '#000', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', zIndex: 9999
            }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>nacho</div>
                <div style={{ width: 200, height: 4, background: '#333', borderRadius: 2 }}>
                    <div style={{
                        width: '100%', height: '100%', background: '#fff',
                        animation: 'bootProgress 2s ease-in-out forwards',
                        transformOrigin: 'left'
                    }} />
                </div>
                <style>{`@keyframes bootProgress { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'url(/wallpaper-main.jpg) no-repeat center center / cover',
            backgroundColor: '#111'
        }}>
            {/* Desktop Icons */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 100px)', gap: 20, padding: 40
            }}>
                <DesktopIcon label="PlayStation" icon="🎮" onClick={() => launchVM(VMType.PLAYSTATION)} />
                <DesktopIcon label="Xbox (JIT)" icon="📦" onClick={() => launchVM(VMType.XBOX)} />
                <DesktopIcon label="Windows" icon="💻" onClick={() => launchVM(VMType.WINDOWS)} />
                <DesktopIcon label="Browser" icon="🌐" onClick={() => launchVM(VMType.BROWSER)} />
                <DesktopIcon label="System Monitor" icon="📊" onClick={() => launchVM('sysmon')} />
            </div>

            <WindowManager activeSkin={VMType.WINDOWS} activeVMs={activeVMs} />
            <Taskbar activeSkin={VMType.WINDOWS} activeVMs={activeVMs} />
        </div>
    );
}

const DesktopIcon = ({ label, icon, onClick }: { label: string, icon: string, onClick: () => void }) => (
    <div onClick={onClick} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        cursor: 'pointer', padding: 10, borderRadius: 8,
        transition: 'background 0.2s',
        color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)'
    }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
        <div style={{ fontSize: 40 }}>{icon}</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
    </div>
);
