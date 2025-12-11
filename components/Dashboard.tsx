'use client';

import { nachoEngine } from '@/lib/nacho/engine';
import { clusterService } from '@/lib/nacho/modules/distributed-compute';
import { vmManager } from '@/lib/vm/manager';
import { VMType } from '@/lib/vm/types';
import Terminal from './Terminal';
import { getFingerprint } from '@/lib/tracking';
import { firebaseService, signInAnonymous, UserGameData } from '@/lib/firebase/firebase';
import { gameTransformer } from '@/lib/game-transformer';
import { gameRepoService, GameRepository } from '@/lib/nacho/modules/game-repository';
import JSZip from 'jszip';
import { AuthModal } from './AuthModal';
    Upload,
    Play,
    User,
    LogIn,
    Gamepad2,
    Search,
    Monitor,
    Globe,
    Lock
} from 'lucide-react';
import Image from 'next/image';

// --- Components ---

const NachoCard = ({ game, onPlay, subtext }: { game: any, onPlay: (g: any) => void, subtext?: string }) => (
    <div className="group relative bg-[#1e293b] border border-white/5 rounded-xl overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
        {/* Cover Image Placeholder */}
        <div className="aspect-[3/4] bg-slate-800 relative overflow-hidden flex items-center justify-center">
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

            {/* Icon */}
            {game.iconUrl ? (
                <img src={game.iconUrl} alt={game.name} className="w-full h-full object-cover" />
            ) : (
                <div className="text-slate-600">
                    <Gamepad2 size={48} />
                </div>
            )}
        </div>

        {/* Info */}
        <div className="p-4 relative z-20">
            <h3 className="font-bold text-white text-lg truncate" title={game.name}>{game.name}</h3>
            <div className="flex items-center justify-between mt-1">
                 <p className="text-blue-400 text-xs font-medium uppercase tracking-wide">{game.type}</p>
                 {subtext && <p className="text-slate-500 text-xs">{subtext}</p>}
            </div>
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
    const [activeTab, setActiveTab] = useState<'home' | 'store' | 'my-games'>('home');
    const [activeApps, setActiveApps] = useState<any[]>([]);
    const [viewingAppId, setViewingAppId] = useState<string | null>(null);
    
    // Cluster Management: Pause compute when playing
    useEffect(() => {
        clusterService.setGamingMode(!!viewingAppId);
    }, [viewingAppId]);

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userGames, setUserGames] = useState<UserGameData[]>([]);
    const [communityRepos, setCommunityRepos] = useState<GameRepository[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const viewerRef = useRef<HTMLDivElement>(null);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [terminalOpen, setTerminalOpen] = useState(false);
    
    useEffect(() => {
        nachoEngine.boot().catch(console.error);

        // Auth Init
        signInAnonymous().then(user => {
            if (user) {
                // Anonymous sign-in default removed to allow real sign-in
                // setIsAuthenticated(true);
                // refreshUserGames();
            }
        });
        
        // Listen to auth state changes for real user persistence
        const unsubscribe = firebaseService.auth.onAuthStateChanged((user) => {
            if (user) {
                setIsAuthenticated(true);
                refreshUserGames();
            } else {
                setIsAuthenticated(false);
                setUserGames([]);
            }
        });

        // Load Community Repos
        gameRepoService.getPublicRepositories().then(repos => {
            setCommunityRepos(repos);
        });

        // Polling active apps
        const interval = setInterval(() => {
            setActiveApps(vmManager.listVMs().filter(vm => vm.state.isRunning));
        }, 1000);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, []);

    const refreshUserGames = async () => {
        const games = await firebaseService.loadUserGames();
        setUserGames(games);
    }

    // Game Launcher
    const handlePlay = async (game: any) => {
        try {
            let vm = vmManager.getVM(game.id);
            if (!vm) {
                console.log(`Creating VM for ${game.name}...`);
                const customConfig = game.metadata?.webAppUrl ? { webAppUrl: game.metadata.webAppUrl } : undefined;
                
                vm = await vmManager.createVM({
                    id: game.id,
                    name: game.name,
                    type: (game.type as VMType) || VMType.WINDOWS,
                    memory: 1024,
                    executionMode: 'game',
                    customConfig
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

        // 1. Transform
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

        // 2. Extract Icon (if APK)
        let iconUrl: string | undefined = undefined;
        if (type === VMType.ANDROID) {
             try {
                const zip = await JSZip.loadAsync(file);
                // Find icon files
                const iconFiles = Object.keys(zip.files).filter(f => f.includes('ic_launcher') && f.endsWith('.png'));
                if (iconFiles.length > 0) {
                    let bestIconFile = iconFiles[0];
                    let maxSize = 0;
                    
                    for (const f of iconFiles) {
                        const d = await zip.file(f)?.async('blob');
                        if (d && d.size > maxSize) {
                            maxSize = d.size;
                            bestIconFile = f;
                        }
                    }

                    const iconBlob = await zip.file(bestIconFile)?.async('blob');
                    if (iconBlob && isAuthenticated) {
                        const uploadedUrl = await firebaseService.uploadGameFile(id, new File([iconBlob], 'icon.png', { type: 'image/png' }));
                        if (uploadedUrl) iconUrl = uploadedUrl;
                    } else if (iconBlob) {
                        iconUrl = URL.createObjectURL(iconBlob);
                    }
                }
             } catch (e) {
                 console.warn('Failed to extract APK icon:', e);
             }
        }

        // 3. Create VM
        await vmManager.createVM({
            id, type, name: file.name, memory: 1024, executionMode: 'game',
            customConfig: { webAppUrl: transformationResult.webAppUrl }
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
            await firebaseService.saveGameData(id, {
                id, name: file.name, type, optimizedSize: transformationResult.optimizedSize,
                lastPlayed: new Date(), playtime: 0, 
                metadata: { webAppUrl: transformationResult.webAppUrl },
                iconUrl
            });
            refreshUserGames();
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
                            nacho
                        </div>
                        
                        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                                <button
                                    onClick={() => setActiveTab('home')}
                                className={`${activeTab === 'home' ? 'text-white' : 'text-slate-400 hover:text-white'} transition-colors`}
                                >
                                    Home
                                </button>
                                <button
                                    onClick={() => setActiveTab('store')}
                                className={`${activeTab === 'store' ? 'text-white' : 'text-slate-400 hover:text-white'} transition-colors`}
                                >
                                    Library
                                </button>
                                <button
                                    onClick={() => setActiveTab('my-games')}
                                className={`${activeTab === 'my-games' ? 'text-white' : 'text-slate-400 hover:text-white'} transition-colors`}
                                >
                                    My Games
                                </button>
                        </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        {/* Terminal Toggle */}
                        <button
                            onClick={() => setTerminalOpen(true)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Open Terminal"
                        >
                            <TerminalIcon size={20} />
                        </button>
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
                                    onClick={() => setAuthModalOpen(true)}
                                    className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-all"
                                >
                                    Log In
                                </button>
                            )}
                    </div>
                </div>
            </nav>

            <AuthModal 
                isOpen={authModalOpen} 
                onClose={() => setAuthModalOpen(false)} 
                onAuthSuccess={() => {
                    setIsAuthenticated(true);
                    refreshUserGames();
                }} 
            />

            {/* --- Main Content --- */}
            <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
                
                {activeTab === 'home' && (
                    <div className="space-y-12 animate-in fade-in duration-500">
                        {/* Welcome Banner */}
                        <div className="bg-gradient-to-r from-blue-900/40 to-slate-900/40 border border-white/5 rounded-2xl p-8 flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">Welcome to Nacho</h1>
                                <p className="text-slate-400">Your high-performance web runtime for legacy & native games.</p>
                            </div>
                            <div className="hidden md:block">
                                <Gamepad2 size={64} className="text-blue-500/50" />
                            </div>
                        </div>

                        {/* Recent User Games */}
                        <section>
                            <SectionHeader title="Jump Back In" />
                            {userGames.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {userGames.slice(0, 4).map(game => (
                                        <NachoCard key={game.id} game={game} onPlay={handlePlay} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500 bg-[#1e293b]/30 rounded-xl">
                                    <p>No recent games. Visit the Library or Upload one!</p>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'store' && (
                    <div className="space-y-12 animate-in fade-in duration-500">
                        {/* Community Repositories */}
                        <section>
                            <SectionHeader title="Community Repositories" />
                            {communityRepos.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {communityRepos.map(repo => (
                                        <div key={repo.id} className="bg-[#1e293b] border border-white/5 p-6 rounded-xl hover:border-blue-500/50 transition-all">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Globe className="text-blue-500" size={20} />
                                                <h3 className="font-bold text-white text-lg">{repo.name}</h3>
                                            </div>
                                            <p className="text-slate-400 text-sm mb-4 line-clamp-2">{repo.description}</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {repo.games.slice(0, 4).map(game => (
                                                    <div key={game.id} className="bg-black/30 p-2 rounded text-xs text-slate-300 truncate">
                                                        {game.name}
                                                    </div>
                                                ))}
                                                {repo.games.length > 4 && (
                                                    <div className="bg-black/30 p-2 rounded text-xs text-slate-500 text-center">
                                                        +{repo.games.length - 4} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-white/5 rounded-2xl">
                                    <Globe className="mx-auto mb-4 opacity-50" size={48} />
                                    <p>No community repositories found.</p>
                                </div>
                            )}
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
                                    <NachoCard key={game.id} game={game} onPlay={handlePlay} />
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

                {/* Terminal Modal (Edged Away) */}
                {terminalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-full max-w-5xl bg-[#1e293b] rounded-xl overflow-hidden border border-white/10 shadow-2xl flex flex-col h-[80vh]">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0B1120]">
                                <span className="font-mono text-sm text-slate-400">nacho-cli v1.0.0</span>
                                <button 
                                    onClick={() => setTerminalOpen(false)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <span className="sr-only">Close</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <Terminal />
                            </div>
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
                            <span className="font-bold text-white">Nacho Runtime Environment</span>
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
