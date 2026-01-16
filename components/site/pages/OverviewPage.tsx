'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/nacho-ui/PageTransition';
import { useInstalledApps } from '../hooks/useInstalledApps';
import { useClusterPeers } from '../hooks/useClusterPeers';

function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)} MB`;
  return `${bytes} B`;
}

export function OverviewPage() {
  const router = useRouter();
  const { apps } = useInstalledApps();
  const { peers } = useClusterPeers();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, []);

  const storageUsed = useMemo(() => apps.reduce((acc, app) => acc + (app.storedBytes || 0), 0), [apps]);

  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center min-h-[60vh] relative z-10 text-center">
        
        {/* Top HUD */}
        <div className="absolute top-0 w-full flex justify-between items-center text-xs text-nacho-primary border-b border-nacho-primary/30 pb-2 mb-10 font-pixel">
            <span>SYS.ONLINE</span>
            <span>{currentTime}</span>
            <span>DEPTH: 10,924M</span>
        </div>

        {/* Central Sonar / Logo */}
        <div className="relative w-64 h-64 mb-12 flex items-center justify-center">
            {/* Rotating Radar Line */}
            <motion.div 
                className="absolute inset-0 rounded-full border-2 border-nacho-primary/30"
                style={{
                    background: 'radial-gradient(circle, rgba(168, 180, 208, 0.1) 0%, transparent 70%)'
                }}
            />
            <motion.div
                className="absolute w-full h-1/2 top-0 left-0 origin-bottom border-r border-nacho-primary/50"
                style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(168, 180, 208, 0.2) 100%)'
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
            {/* Center Text */}
            <div className="relative z-10 flex flex-col items-center">
                <h1 className="text-4xl md:text-5xl font-pixel text-white mb-2 tracking-widest leading-normal">
                    CHALLENGER
                    <br />
                    <span className="text-nacho-primary">DEEP</span>
                </h1>
            </div>
        </div>

        {/* Main Actions Menu */}
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
            <MenuOption 
                label="INITIATE DIVE" 
                sub="Launch Applications" 
                onClick={() => router.push('/library')} 
                active
            />
            <MenuOption 
                label="SONAR SCAN" 
                sub="Network Status" 
                onClick={() => router.push('/network')} 
            />
            <MenuOption 
                label="CARGO HOLD" 
                sub={`${formatBytes(storageUsed)} Used`} 
                onClick={() => {}} 
            />
        </div>

        {/* System Stats Footer */}
        <div className="mt-16 w-full max-w-4xl grid grid-cols-3 gap-4 text-xs font-retro text-nacho-subtext border-t border-nacho-primary/30 pt-4">
            <Stat label="CLUSTER NODES" value={peers.length.toString()} />
            <Stat label="PRESSURE" value="1086 BAR" />
            <Stat label="TEMP" value="1.4°C" />
        </div>

      </div>
    </PageTransition>
  );
}

function MenuOption({ label, sub, onClick, active }: { label: string, sub: string, onClick: () => void, active?: boolean }) {
    return (
        <button 
            onClick={onClick}
            className={`flex-1 group relative p-6 border-2 transition-all duration-200
                ${active 
                    ? 'border-nacho-primary bg-nacho-primary/10' 
                    : 'border-nacho-border hover:border-nacho-primary hover:bg-nacho-primary/5'
                }`}
        >
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-nacho-primary" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-nacho-primary" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-nacho-primary" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-nacho-primary" />

            <div className="text-xl font-pixel text-white mb-2 group-hover:text-nacho-primary transition-colors">
                {label}
            </div>
            <div className="text-sm font-retro text-nacho-subtext uppercase tracking-widest">
                {sub}
            </div>
        </button>
    );
}

function Stat({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex flex-col items-center">
            <span className="opacity-50 mb-1">{label}</span>
            <span className="text-nacho-primary text-lg">{value}</span>
        </div>
    );
}
