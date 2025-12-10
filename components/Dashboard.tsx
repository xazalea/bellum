
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
    LayoutGrid,
    Cpu,
    Zap,
    Box,
    Activity,
    Upload,
    Play,
    Settings,
    User,
    LogIn,
    Gamepad2,
    Download,
    Star,
    Clock,
    HardDrive
} from 'lucide-react';

// Helper for runtime labels
const getRuintimeLabel = (type: string) => {
    switch (type) {
        case 'windows': return 'Win32/64 Runtime';
        case 'xbox': return 'DirectX Container';
        case 'playstation': return 'GNM Container';
        case 'android': return 'APK Runtime';
        case 'linux': return 'POSIX Environment';
        default: return 'Universal Sandbox';
    }
};

export default function Dashboard() {
    const [stats, setStats] = useState({ cpu: 0, ram: 0, gpu: 0, fps: 0 });
    const [activeApps, setActiveApps] = useState<any[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [viewingAppId, setViewingAppId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'home' | 'my-games' | 'terminal'>('home');
    const [userId, setUserId] = useState<string>('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userGames, setUserGames] = useState<UserGameData[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [featuredGames] = useState([
        { id: 'minecraft', name: 'Minecraft', type: 'windows', description: 'Build, explore, survive' },
        { id: 'factorio', name: 'Factorio', type: 'windows', description: 'Build factories and automate' },
        { id: 'among-us', name: 'Among Us', type: 'windows', description: 'Find the impostor among us' },
        { id: 'rocket-league', name: 'Rocket League', type: 'windows', description: 'Soccer with cars and rockets' }
    ]);
    
    const viewerRef = useRef<HTMLDivElement>(null);
    
    // Initialize
    useEffect(() => {
        nachoEngine.boot().catch(console.error);
        getFingerprint().then(setUserId);

        // Firebase authentication
        const initAuth = async () => {
            const user = await signInAnonymous();
            if (user) {
                setCurrentUser(user);
                setIsAuthenticated(true);
                const games = await firebaseService.loadUserGames();
                setUserGames(games);
            }
        };
        initAuth();

        const interval = setInterval(() => {
            setStats({
                cpu: Math.round(Math.random() * 20 + 10),
                ram: Math.round(Math.random() * 10 + 20),
                gpu: Math.round(Math.random() * 30 + 5),
                fps: Math.round(58 + Math.random() * 4)
            });
            setActiveApps(vmManager.listVMs().filter(vm => vm.state.isRunning));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Viewer Mount
    useEffect(() => {
        if (viewingAppId && viewerRef.current) {
            const app = vmManager.getVM(viewingAppId);
            if (app) app.mount(viewerRef.current).catch(console.error);
        }
    }, [viewingAppId]);

    const handleFileDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = Array.from(e.dataTransfer.files);
        for (const file of files) await processFile(file);
    };

    const processFile = async (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        let type = VMType.CODE;
        if (ext === 'apk') type = VMType.ANDROID;
        else if (ext === 'exe') type = VMType.WINDOWS;
        else if (ext === 'iso') type = VMType.LINUX;
        else if (ext === 'js' || ext === 'wasm') type = VMType.CODE;

        console.log(`🎮 Transforming ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        // Transform the game with extreme optimization
        const transformationResult = await gameTransformer.transformGame(file, {
            targetPlatform: 'wasm',
            compressionLevel: 'ultra',
            optimizationLevel: 'maximum',
            enableGPUAcceleration: true,
            enableAI: true
        });

        if (!transformationResult.success) {
            console.error('❌ Game transformation failed:', transformationResult.error);
            alert(`Failed to transform game: ${transformationResult.error}`);
            return;
        }

        const id = `app-${Date.now()}`;

        // Create VM with optimized game
        await vmManager.createVM({
            id,
            type,
            name: file.name,
            memory: 1024,
            executionMode: 'game'
        });

        const vm = vmManager.getVM(id);
        if (vm) {
            await vm.start();

            // Update active apps
            setActiveApps(prev => [...prev, vm]);
        }

        // Save to Firebase if authenticated
        if (isAuthenticated) {
            const gameData: UserGameData = {
                id,
                name: file.name,
                type,
                optimizedSize: transformationResult.optimizedSize,
                lastPlayed: new Date(),
                playtime: 0,
                metadata: {
                    originalSize: transformationResult.originalSize,
                    compressionRatio: transformationResult.compressionRatio,
                    webAppUrl: transformationResult.webAppUrl
                }
            };

            await firebaseService.saveGameData(id, gameData);

            // Upload optimized web app bundle
            if (transformationResult.webAppUrl) {
                const response = await fetch(transformationResult.webAppUrl);
                const optimizedBlob = await response.blob();
                const optimizedFile = new File([optimizedBlob], `${file.name}.optimized.html`, {
                    type: 'text/html'
                });
                await firebaseService.uploadGameFile(id, optimizedFile);
            }

            // Refresh user games
            const games = await firebaseService.loadUserGames();
            setUserGames(games);
        }

        console.log(`✅ Game transformed successfully!`);
        console.log(`📊 Compression: ${(transformationResult.compressionRatio).toFixed(1)}%`);
        console.log(`💾 Size reduced: ${(transformationResult.originalSize / 1024 / 1024).toFixed(2)}MB → ${(transformationResult.optimizedSize / 1024 / 1024).toFixed(2)}MB`);
    };

    return (
        <div className="min-h-screen bg-[#0f1419] text-white">
            {/* Header */}
            <header className="border-b border-[#1e293b] bg-[#0f1419]/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-8">
                            <div className="flex items-center space-x-2">
                                <Gamepad2 className="w-8 h-8 text-[#3b82f6]" />
                                <span className="text-xl font-bold text-white">borg</span>
                            </div>
                            <nav className="hidden md:flex space-x-8">
                                <button
                                    onClick={() => setActiveTab('home')}
                                    className={`text-sm font-medium transition-colors ${
                                        activeTab === 'home' ? 'text-[#3b82f6]' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Home
                                </button>
                                <button
                                    onClick={() => setActiveTab('my-games')}
                                    className={`text-sm font-medium transition-colors ${
                                        activeTab === 'my-games' ? 'text-[#3b82f6]' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    My Games
                                </button>
                                <button
                                    onClick={() => setActiveTab('terminal')}
                                    className={`text-sm font-medium transition-colors ${
                                        activeTab === 'terminal' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Terminal
                                </button>
                            </nav>
                        </div>

                        <div className="flex items-center space-x-4">
                            {isAuthenticated ? (
                                <div className="flex items-center space-x-2 text-sm text-gray-400">
                                    <User className="w-4 h-4" />
                                    <span>Anonymous User</span>
                                </div>
                            ) : (
                                <button
                                    onClick={async () => {
                                        const user = await signInAnonymous();
                                        if (user) {
                                            setCurrentUser(user);
                                            setIsAuthenticated(true);
                                        }
                                    }}
                                    className="flex items-center space-x-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] rounded-lg text-sm font-medium transition-colors"
                                >
                                    <LogIn className="w-4 h-4" />
                                    <span>Sign In</span>
                                </button>
                            )}

                            {/* Performance Stats */}
                            <div className="hidden md:flex items-center space-x-4 text-xs text-gray-400">
                                <div className="flex items-center space-x-1">
                                    <Cpu className="w-3 h-3" />
                                    <span>{stats.cpu}%</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Box className="w-3 h-3" />
                                    <span>{stats.ram}%</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Activity className="w-3 h-3 text-green-400" />
                                    <span>{stats.fps} FPS</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'home' && (
                    <div className="space-y-12">
                        {/* Hero Section */}
                        <div className="text-center space-y-4">
                            <h1 className="text-4xl md:text-6xl font-bold text-white">
                                Play <span className="text-[#3b82f6]">Any Game</span> in Your Browser
                            </h1>
                            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                                Transform Windows, Android, and Xbox games into web games with incredible speed.
                                Optimized for local storage with Firebase account saving.
                            </p>
                        </div>

                        {/* Upload Zone */}
                        <div className="max-w-2xl mx-auto">
                            <div
                                className={`
                                    relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer
                                    ${dragActive
                                        ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                                        : 'border-gray-600 hover:border-gray-500 bg-[#1e293b]/50 hover:bg-[#1e293b]/70'
                                    }
                                `}
                                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={() => setDragActive(false)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleFileDrop}
                                onClick={() => document.getElementById('file-upload')?.click()}
                            >
                                <input
                                    type="file" id="file-upload" multiple className="hidden"
                                    onChange={(e) => e.target.files && Array.from(e.target.files).forEach(processFile)}
                                />

                                <div className="space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-[#3b82f6] rounded-full flex items-center justify-center">
                                        <Upload className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">Upload Your Game</h3>
                                        <p className="text-gray-400 mt-2">
                                            Drag and drop or click to upload APK, EXE, ISO, or WASM files
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Featured Games */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-white">Featured Games</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {featuredGames.map((game) => (
                                    <div key={game.id} className="bg-[#1e293b] rounded-xl p-6 hover:bg-[#1e293b]/80 transition-colors group cursor-pointer">
                                        <div className="w-12 h-12 bg-[#3b82f6] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Gamepad2 className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-2">{game.name}</h3>
                                        <p className="text-gray-400 text-sm mb-4">{game.description}</p>
                                        <button className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
                                            <Play className="w-4 h-4" />
                                            <span>Play Now</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Running Games */}
                        {activeApps.length > 0 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-white">Currently Running</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activeApps.map(app => (
                                        <div key={app.id} className="bg-[#1e293b] rounded-xl p-4 flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-[#3b82f6] rounded-lg flex items-center justify-center text-white font-bold">
                                                    {app.config.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{app.config.name}</div>
                                                    <div className="text-xs text-gray-400">{getRuintimeLabel(app.config.type)}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setViewingAppId(app.id)}
                                                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Play
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'my-games' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-3xl font-bold text-white">My Games</h1>
                            {!isAuthenticated && (
                                <div className="text-gray-400 text-sm">
                                    Sign in to save and sync your games across devices
                                </div>
                            )}
                        </div>

                        {userGames.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {userGames.map((game) => (
                                    <div key={game.id} className="bg-[#1e293b] rounded-xl p-6 hover:bg-[#1e293b]/80 transition-colors">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 bg-[#3b82f6] rounded-lg flex items-center justify-center">
                                                <Gamepad2 className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex items-center space-x-2 text-xs text-gray-400">
                                                <HardDrive className="w-3 h-3" />
                                                <span>{(game.optimizedSize / 1024 / 1024).toFixed(1)}MB</span>
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-semibold text-white mb-2">{game.name}</h3>
                                        <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                                            <div className="flex items-center space-x-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{game.playtime}m played</span>
                                            </div>
                                            <div className="text-xs uppercase">{game.type}</div>
                                        </div>

                                        <button className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
                                            <Play className="w-4 h-4" />
                                            <span>Play</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No games yet</h3>
                                <p className="text-gray-400 mb-6">Upload your first game to get started</p>
                                <button
                                    onClick={() => setActiveTab('home')}
                                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                    Upload Game
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'terminal' && (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold text-white">Terminal</h1>
                        <div className="bg-[#1e293b] rounded-xl overflow-hidden">
                            <Terminal />
                        </div>
                    </div>
                )}
            </main>

            {/* Game Viewer Modal */}
            {viewingAppId && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="w-full max-w-6xl h-[80vh] bg-[#0f1419] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
                        <div className="h-14 border-b border-[#1e293b] flex items-center justify-between px-6 bg-[#1e293b]/50">
                            <span className="font-medium text-white">Game Runtime</span>
                            <button
                                onClick={() => setViewingAppId(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 relative" ref={viewerRef} />
                    </div>
                </div>
            )}
        </div>
    );
}

const StatCard = ({ icon, label, value, highlight = false }: { icon: any, label: string, value: string, highlight?: boolean }) => (
    <div className={`p-4 rounded-xl border ${highlight ? 'border-green-500/30 bg-green-500/10' : 'border-white/5 bg-white/5'} backdrop-blur-sm flex items-center gap-3`}>
        <div className={`${highlight ? 'text-green-400' : 'text-gray-400'}`}>{icon}</div>
        <div>
            <div className="text-xs text-gray-500 uppercase font-bold">{label}</div>
            <div className={`font-mono font-medium ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</div>
        </div>
    </div>
);
