
import React, { useState, useEffect, useRef } from 'react';
import { nachoEngine } from '@/lib/nacho/engine';
import { vmManager } from '@/lib/vm/manager';
import { VMType } from '@/lib/vm/types';
import Terminal from './Terminal';
import { getFingerprint } from '@/lib/tracking';
import { 
    Terminal as TerminalIcon, 
    LayoutGrid, 
    Cpu, 
    Zap, 
    Box, 
    Activity, 
    Upload, 
    Play,
    Settings
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
    const [activeTab, setActiveTab] = useState<'apps' | 'terminal'>('apps');
    const [userId, setUserId] = useState<string>('');
    
    const viewerRef = useRef<HTMLDivElement>(null);
    
    // Initialize
    useEffect(() => {
        nachoEngine.boot().catch(console.error);
        getFingerprint().then(setUserId);

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

        const id = `app-${Date.now()}`;
        await vmManager.createVM({ id, type, name: file.name, memory: 1024 });
        const vm = vmManager.getVM(id);
        if (vm) await vm.start();
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
            
            {/* Floating Rings (Background Decoration) */}
            <div className="absolute top-[-10%] left-[-5%] w-64 h-64 rounded-full border-[20px] border-[#1a1a1a] floating-ring opacity-50" />
            <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full border-[30px] border-[#1a1a1a] floating-ring opacity-50" style={{ animationDelay: '2s' }} />

            {/* Main Zena Card */}
            <div className="zena-card w-full max-w-7xl min-h-[85vh] flex flex-col bg-noise relative z-10">
                
                {/* Gradient Wave (Bottom Left) */}
                <div className="absolute bottom-0 left-0 w-full h-[400px] pointer-events-none opacity-40">
                    <div className="w-[120%] h-full bg-gradient-to-r from-purple-900 via-orange-900 to-transparent blur-[80px] transform -rotate-6 translate-y-20 -translate-x-20" />
                </div>

                {/* Header */}
                <header className="flex items-center justify-between px-8 py-6 relative z-20">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white tracking-tight">nacho</span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                        <button 
                            onClick={() => setActiveTab('apps')}
                            className={`transition-colors ${activeTab === 'apps' ? 'text-white' : 'hover:text-white'}`}
                        >
                            Apps
                        </button>
                        <button 
                            onClick={() => setActiveTab('terminal')}
                            className={`transition-colors ${activeTab === 'terminal' ? 'text-white' : 'hover:text-white'}`}
                        >
                            Terminal
                        </button>
                        <button className="hover:text-white transition-colors">Docs</button>
                    </nav>

                    <button className="bg-[#6d28d9] hover:bg-[#5b21b6] text-white px-6 py-2 rounded-full font-medium transition-all shadow-lg shadow-purple-900/20 flex items-center gap-2">
                        <span>Status</span>
                        <div className={`w-2 h-2 rounded-full ${stats.fps > 30 ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    </button>
                </header>

                {/* Content */}
                <main className="flex-1 relative z-20 flex flex-col p-8">
                    
                    {activeTab === 'apps' ? (
                        <div className="flex flex-col lg:flex-row gap-12 h-full">
                            {/* Left: Hero Text & Stats */}
                            <div className="flex-1 flex flex-col justify-center space-y-8">
                                <div className="space-y-4">
                                    <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                                        We make a <br/>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">&quot;better World&quot;</span>
                                        <br/>
                                        For your every app
                                    </h1>
                                    <p className="text-gray-400 text-lg max-w-md">
                                        Universal runtime execution. Any binary, any platform, locally.
                                        Trust us.
                                    </p>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4 max-w-md">
                                    <StatCard icon={<Cpu size={18} />} label="CPU" value={`${stats.cpu}%`} />
                                    <StatCard icon={<Box size={18} />} label="RAM" value={`${stats.ram}%`} />
                                    <StatCard icon={<Zap size={18} />} label="GPU" value={`${stats.gpu}%`} />
                                    <StatCard icon={<Activity size={18} />} label="FPS" value={`${stats.fps}`} highlight />
                                </div>
                            </div>

                            {/* Right: App Runner / Illustration Area */}
                            <div className="flex-1 relative">
                                {/* Runner Box - Floating */}
                                <div 
                                    className={`
                                        w-full h-full min-h-[400px]
                                        bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8
                                        flex flex-col items-center justify-center text-center gap-6
                                        transition-all duration-300
                                        ${dragActive ? 'border-purple-500 bg-purple-500/10' : 'hover:border-white/20'}
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
                                    
                                    {activeApps.length > 0 ? (
                                        <div className="w-full space-y-4">
                                            <div className="text-left text-sm text-gray-400 uppercase font-bold tracking-wider">Running</div>
                                            {activeApps.map(app => (
                                                <div key={app.id} className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
                                                            {app.config.name[0].toUpperCase()}
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="font-medium text-white">{app.config.name}</div>
                                                            <div className="text-xs text-gray-500">{getRuintimeLabel(app.config.type)}</div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setViewingAppId(app.id); }}
                                                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-colors"
                                                    >
                                                        View
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-orange-500 flex items-center justify-center shadow-2xl shadow-purple-900/50">
                                                <Upload size={40} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Drop App Here</h3>
                                                <p className="text-gray-400 mt-2">APK, EXE, ISO, WASM</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Terminal Tab
                        <div className="h-full w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
                            <Terminal />
                        </div>
                    )}
                </main>

                {/* Viewer Overlay */}
                {viewingAppId && (
                    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
                        <div className="w-full max-w-6xl h-[80vh] bg-black border border-white/20 rounded-2xl overflow-hidden flex flex-col">
                            <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-white/5">
                                <span className="font-mono text-sm text-gray-400">Runtime Environment</span>
                                <button onClick={() => setViewingAppId(null)} className="text-white hover:text-red-400">✕</button>
                            </div>
                            <div className="flex-1 relative" ref={viewerRef} />
                        </div>
                    </div>
                )}
            </div>
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
