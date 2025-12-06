
import React, { useState, useEffect, useRef } from 'react';
import { nachoEngine } from '@/lib/nacho/engine';
import { vmManager } from '@/lib/vm/manager';
import { VMType } from '@/lib/vm/types';

// Icons
const Icons = {
    Cpu: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>,
    Zap: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
    Box: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
    Play: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
    Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>,
    Activity: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
};

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
    const viewerRef = useRef<HTMLDivElement>(null);
    
    // Initialize Engine
    useEffect(() => {
        nachoEngine.boot().catch(console.error);
        
        const interval = setInterval(() => {
            // Simulate/Fetch stats from engine
            // In a real scenario, these would come from nachoEngine.interfaceTooling.ramMonitoring.getStats() etc.
            setStats({
                cpu: Math.round(Math.random() * 20 + 10),
                ram: Math.round(Math.random() * 10 + 20),
                gpu: Math.round(Math.random() * 30 + 5),
                fps: Math.round(58 + Math.random() * 4)
            });
            
            // Update active VMs
            setActiveApps(vmManager.listVMs().filter(vm => vm.state.isRunning));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Mount viewer when viewingAppId changes
    useEffect(() => {
        if (viewingAppId && viewerRef.current) {
            const app = vmManager.getVM(viewingAppId);
            if (app) {
                app.mount(viewerRef.current).catch(console.error);
            }
        }
    }, [viewingAppId]);

    const handleFileDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = Array.from(e.dataTransfer.files);
        for (const file of files) {
            await processFile(file);
        }
    };

    const processFile = async (file: File) => {
        console.log("Processing file:", file.name);
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        let type = VMType.CODE;
        if (ext === 'apk') type = VMType.ANDROID;
        else if (ext === 'exe') type = VMType.WINDOWS;
        else if (ext === 'iso') type = VMType.LINUX; // Generic fallback
        else if (ext === 'js' || ext === 'wasm') type = VMType.CODE;

        const id = `app-${Date.now()}`;
        await vmManager.createVM({
            id,
            type,
            name: file.name,
            memory: 1024
        });
        // Auto-start
        const vm = vmManager.getVM(id);
        if (vm) await vm.start();
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500 selection:text-white">
            {/* Top Bar */}
            <header className="h-16 border-b border-white/10 flex items-center px-6 justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="font-bold text-lg">N</span>
                    </div>
                    <h1 className="font-bold text-xl tracking-tight">Nacho Engine <span className="text-blue-400 text-xs font-mono ml-1">v2.0</span></h1>
                </div>
                <div className="flex gap-4 text-sm font-mono text-slate-400">
                    <div className="flex items-center gap-2">
                        <Icons.Cpu /> <span>CPU: {stats.cpu}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Icons.Box /> <span>RAM: {stats.ram}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Icons.Zap /> <span>GPU: {stats.gpu}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-400">
                        <Icons.Activity /> <span>{stats.fps} FPS</span>
                    </div>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Runner Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div 
                        className={`
                            border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4
                            transition-all duration-200 ease-out cursor-pointer
                            ${dragActive ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}
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
                            multiple 
                            className="hidden" 
                            onChange={(e) => {
                                if (e.target.files) {
                                    Array.from(e.target.files).forEach(processFile);
                                }
                            }}
                        />
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 mb-2">
                            <Icons.Upload />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Universal App Runner</h2>
                            <p className="text-slate-400 max-w-md mx-auto">
                                Drag & Drop or Click to load <br />
                                <span className="text-white font-mono bg-white/10 px-1 rounded">.APK</span>,{' '}
                                <span className="text-white font-mono bg-white/10 px-1 rounded">.EXE</span>,{' '}
                                <span className="text-white font-mono bg-white/10 px-1 rounded">.ISO</span>, or{' '}
                                <span className="text-white font-mono bg-white/10 px-1 rounded">.WASM</span>
                            </p>
                        </div>
                    </div>

                    {/* Running Apps Grid */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Icons.Play /> Active Runtimes
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeApps.length === 0 ? (
                                <div className="col-span-full h-32 rounded-xl border border-white/10 bg-slate-800/50 flex items-center justify-center text-slate-500 italic">
                                    No active runtime containers. Drop a file to start.
                                </div>
                            ) : (
                                activeApps.map(app => (
                                    <div key={app.id} className="bg-slate-800 border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-blue-500/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                                                {app.config.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold truncate max-w-[150px]">{app.config.name}</div>
                                                <div className="text-xs text-slate-400 font-mono">
                                                    {getRuintimeLabel(app.config.type)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 hover:bg-white/10 rounded-lg text-red-400" onClick={() => app.stop()}>
                                                Stop
                                            </button>
                                            <button 
                                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                                                onClick={() => setViewingAppId(app.id)}
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Viewer Modal */}
                {viewingAppId && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
                        <div className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl">
                            <div className="h-12 border-b border-white/10 flex items-center justify-between px-6">
                                <span className="font-bold">Runtime Viewer</span>
                                <button 
                                    onClick={() => setViewingAppId(null)}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="flex-1 bg-black rounded-b-2xl overflow-hidden relative" ref={viewerRef}>
                                {/* Canvas mounts here */}
                            </div>
                        </div>
                    </div>
                )}

                {/* Sidebar / Status */}
                <div className="space-y-6">
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-slate-400">Engine Status</h3>
                        <div className="space-y-4">
                            <StatusItem label="Core Execution" status="Online" color="green" />
                            <StatusItem label="GPU Acceleration" status="Active" color="blue" />
                            <StatusItem label="Storage" status="Ready" color="green" />
                            <StatusItem label="Hypervisor" status="Idle" color="yellow" />
                            <StatusItem label="Network Mesh" status="Offline" color="slate" />
                        </div>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-6">
                        <h3 className="font-bold mb-2 text-blue-100">Supported Formats</h3>
                        <ul className="space-y-2 text-sm text-blue-200/70">
                            <li className="flex items-center gap-2">✓ Android Packages (APK)</li>
                            <li className="flex items-center gap-2">✓ Win32/64 Executables (EXE)</li>
                            <li className="flex items-center gap-2">✓ Disc Images (ISO)</li>
                            <li className="flex items-center gap-2">✓ WebAssembly (WASM)</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}

const StatusItem = ({ label, status, color }: { label: string, status: string, color: string }) => {
    const colors: any = {
        green: 'bg-green-500',
        blue: 'bg-blue-500',
        yellow: 'bg-yellow-500',
        slate: 'bg-slate-500'
    };
    
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${colors[color] || 'bg-slate-500'} animate-pulse`}></span>
                <span className="text-xs font-mono font-medium">{status}</span>
            </div>
        </div>
    );
};

