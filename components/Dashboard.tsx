'use client';

import React, { useState, useEffect, useRef } from 'react';
import { nachoEngine } from '@/lib/nacho/engine';
import { vmManager } from '@/lib/vm/manager';
import { VMType } from '@/lib/vm/types';
import Terminal from './Terminal';
import { getFingerprint } from '@/lib/tracking';
import { firebaseService, signInAnonymous, UserGameData } from '@/lib/firebase/firebase';
import { gameTransformer } from '@/lib/game-transformer';
import {
    Terminal as TerminalIcon,
    Upload,
    Play,
    User,
    LogIn,
    Gamepad2,
    Search,
    Monitor
} from 'lucide-react';
import Image from 'next/image';

// --- Components ---

const BorgCard = ({ game, onPlay }: { game: any, onPlay: (g: any) => void }) => (
    <div className="group relative bg-[#1e293b] border border-white/5 rounded-xl overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
        {/* Cover Image Placeholder - would be an Image component in real app */}
        <div className="aspect-[3/4] bg-slate-800 relative overflow-hidden">
             {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1419] to-transparent opacity-60 z-10" />
            
            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40 backdrop-blur-[2px]">
                <button 
                    onClick={() => onPlay(game)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 shadow-xl"
                >
                    <Play size={16} fill="currentColor" /> Play
                </button>
            </div>

            {/* Placeholder Icon if no image */}
            <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                <Gamepad2 size={48} />
            </div>
        </div>

        {/* Info */}
        <div className="p-4 relative z-20">
            <h3 className="font-bold text-white text-lg truncate">{game.name}</h3>
            <p className="text-blue-400 text-xs font-medium uppercase tracking-wide mt-1">{game.type}</p>
        </div>
    </div>
);

const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <div className="h-px bg-white/10 flex-1" />
    </div>
);

// --- Main Dashboard ---

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'home' | 'my-games' | 'terminal'>('home');
    const [activeApps, setActiveApps] = useState<any[]>([]);
    const [viewingAppId, setViewingAppId] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userGames, setUserGames] = useState<UserGameData[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const viewerRef = useRef<HTMLDivElement>(null);

    // Mock Data
    const featuredGames = [
        { id: 'minecraft', name: 'Minecraft', type: 'windows' },
        { id: 'factorio', name: 'Factorio', type: 'windows' },
        { id: 'among-us', name: 'Among Us', type: 'windows' },
        { id: 'rocket-league', name: 'Rocket League', type: 'windows' },
        { id: 'stardew', name: 'Stardew Valley', type: 'windows' },
        { id: 'terraria', name: 'Terraria', type: 'windows' },
    ];

    const newGames = [
        { id: 'cyberpunk', name: 'Cyberpunk 2077', type: 'windows' },
        { id: 'elden-ring', name: 'Elden Ring', type: 'windows' },
        { id: 'hades', name: 'Hades', type: 'windows' },
        { id: 'celeste', name: 'Celeste', type: 'windows' },
    ];

    useEffect(() => {
        nachoEngine.boot().catch(console.error);
        
        // Auth Init
        signInAnonymous().then(user => {
            if (user) {
                setIsAuthenticated(true);
                firebaseService.loadUserGames().then(setUserGames);
            }
        });

        // Polling active apps
        const interval = setInterval(() => {
            setActiveApps(vmManager.listVMs().filter(vm => vm.state.isRunning));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Game Launcher
    const handlePlay = async (game: any) => {
        try {
            let vm = vmManager.getVM(game.id);
            if (!vm) {
                console.log(`Creating VM for ${game.name}...`);
                vm = await vmManager.createVM({
                    id: game.id,
                    name: game.name,
                    type: (game.type as VMType) || VMType.WINDOWS,
                    memory: 1024,
                    executionMode: 'game'
                });
                await vm.start();
                setActiveApps(prev => prev.find(a => a.id === vm!.id) ? prev : [...prev, vm!]);
            }
            setViewingAppId(game.id);
        } catch (error) {
            console.error("Failed to start game:", error);
            alert("Failed to start game runtime.");
        }
    };

    // Viewer Mounter
    useEffect(() => {
        if (viewingAppId && viewerRef.current) {
            const app = vmManager.getVM(viewingAppId);
            if (app) app.mount(viewerRef.current).catch(console.error);
        }
    }, [viewingAppId]);

    // File Handling
    const processFile = async (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        let type = VMType.CODE;
        if (ext === 'apk') type = VMType.ANDROID;
        else if (ext === 'exe') type = VMType.WINDOWS;
        else if (ext === 'iso') type = VMType.LINUX;

        const transformationResult = await gameTransformer.transformGame(file, {
            targetPlatform: 'wasm',
            compressionLevel: 'ultra',
            optimizationLevel: 'maximum',
            enableGPUAcceleration: true,
            enableAI: true
        });

        if (!transformationResult.success) {
            alert(`Failed to transform game: ${transformationResult.error}`);
            return;
        }

        const id = `app-${Date.now()}`;
        await vmManager.createVM({
            id, type, name: file.name, memory: 1024, executionMode: 'game'
        });

        // Start immediately
        const vm = vmManager.getVM(id);
        if (vm) {
            await vm.start();
            setActiveApps(prev => [...prev, vm]);
            setViewingAppId(id); // Auto-open viewer
        }

        if (isAuthenticated) {
            // Save metadata logic here...
            firebaseService.saveGameData(id, {
                id, name: file.name, type, optimizedSize: transformationResult.optimizedSize,
                lastPlayed: new Date(), playtime: 0, metadata: {}
            });
            firebaseService.loadUserGames().then(setUserGames);
        }
    };

    const handleFileDrop = async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setDragActive(false);
        if (e.dataTransfer.files[0]) await processFile(e.dataTransfer.files[0]);
    };

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans selection:bg-blue-500/30">
            {/* --- Navbar --- */}
            <nav className="fixed top-0 w-full z-40 bg-[#0B1120]/80 backdrop-blur-md border-b border-white/5 h-16">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    {/* Logo & Links */}
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Gamepad2 className="text-white" size={20} />
                            </div>
                            borg
                        </div>
                        
                        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                            <button 
                                onClick={() => setActiveTab('home')}
                                className={`${activeTab === 'home' ? 'text-white' : 'text-slate-400 hover:text-white'} transition-colors`}
                            >
                                Home
                            </button>
                            <button 
                                onClick={() => setActiveTab('my-games')}
                                className={`${activeTab === 'my-games' ? 'text-white' : 'text-slate-400 hover:text-white'} transition-colors`}
                            >
                                My Games
                            </button>
                            <button 
                                onClick={() => setActiveTab('terminal')}
                                className={`${activeTab === 'terminal' ? 'text-white' : 'text-slate-400 hover:text-white'} transition-colors`}
                            >
                                Terminal
                            </button>
                        </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center bg-[#1e293b] rounded-full px-4 py-1.5 border border-white/5 focus-within:border-blue-500/50 transition-colors">
                            <Search size={14} className="text-slate-500 mr-2" />
                            <input 
                                type="text" 
                                placeholder="Search games..." 
                                className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-48"
                            />
                        </div>
                        
                        {isAuthenticated ? (
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                <User size={16} />
                            </div>
                        ) : (
                            <button 
                                onClick={() => signInAnonymous().then(u => u && setIsAuthenticated(true))}
                                className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-all"
                            >
                                Log In
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* --- Main Content --- */}
            <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
                
                {activeTab === 'home' && (
                    <div className="space-y-12 animate-in fade-in duration-500">
                        {/* Most Popular */}
                        <section>
                            <SectionHeader title="Most Popular" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {featuredGames.slice(0, 4).map(game => (
                                    <BorgCard key={game.id} game={game} onPlay={handlePlay} />
                                ))}
                            </div>
                        </section>

                        {/* Newly Added */}
                        <section>
                            <SectionHeader title="Newly Added" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {newGames.map(game => (
                                    <BorgCard key={game.id} game={game} onPlay={handlePlay} />
                                ))}
                            </div>
                        </section>

                        {/* All Games */}
                        <section>
                            <SectionHeader title="All Games" />
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {[...featuredGames, ...newGames].map(game => (
                                    <BorgCard key={`all-${game.id}`} game={game} onPlay={handlePlay} />
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'my-games' && (
                    <div className="animate-in fade-in duration-500">
                        <SectionHeader title="My Games Library" />
                        
                        {/* Upload Area */}
                        <div 
                            className={`
                                mb-8 border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer group
                                ${dragActive 
                                    ? 'border-blue-500 bg-blue-500/10' 
                                    : 'border-slate-700 hover:border-blue-500/50 bg-[#1e293b]/50'
                                }
                            `}
                            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleFileDrop}
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <input 
                                type="file" 
                                id="file-upload" 
                                className="hidden" 
                                multiple 
                                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                            />
                            <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <Upload size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Upload a Game File</h3>
                            <p className="text-slate-400">Drag & drop APK, EXE, or ISO files to transform and play</p>
                        </div>

                        {/* User Games Grid */}
                        {userGames.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {userGames.map(game => (
                                    <BorgCard key={game.id} game={game} onPlay={handlePlay} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-slate-500 py-12">
                                <Gamepad2 size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No games in your library yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'terminal' && (
                    <div className="animate-in fade-in duration-500">
                        <SectionHeader title="System Terminal" />
                        <div className="bg-[#1e293b] rounded-xl overflow-hidden border border-white/10 h-[600px] shadow-2xl">
                            <Terminal />
                        </div>
                    </div>
                )}
            </div>

            {/* --- Game Viewer Overlay --- */}
            {viewingAppId && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-300">
                    <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#0B1120]">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="font-bold text-white">Borg Runtime Environment</span>
                        </div>
                        <button 
                            onClick={() => setViewingAppId(null)}
                            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all"
                        >
                            Exit Game
                        </button>
                    </div>
                    <div className="flex-1 relative bg-black" ref={viewerRef}>
                        {/* The VM mounts here */}
                    </div>
                </div>
            )}
        </div>
    );
}
