import React, { useEffect, useRef, useState } from 'react';
import { RuntimeManager } from '../lib/engine/runtime-manager';
import { NachoLoader } from '../lib/engine/loaders/nacho-loader';

interface AppRunnerProps {
    filePath: string;
    onExit: () => void;
}

export const AppRunner: React.FC<AppRunnerProps> = ({ filePath, onExit }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<string>('Initializing...');
    const [detail, setDetail] = useState<string>('Preparing environment...');
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [coreModules, setCoreModules] = useState([
        { name: 'C++ Lifter', status: 'active', color: 'text-blue-400' },
        { name: 'Haskell Optimizer', status: 'active', color: 'text-purple-400' },
        { name: 'PHP SysMonitor', status: 'idle', color: 'text-indigo-400' },
    ]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev.slice(-5), msg]);
    };

    useEffect(() => {
        const launch = async () => {
            if (!containerRef.current) return;
            
            try {
                const runtime = RuntimeManager.getInstance();
                const { type, config } = await runtime.prepareRuntime(filePath);
                
                // Hook into Nacho Loader if it's the active loader
                // Note: This requires exposing the loader instance from RuntimeManager or handling it here directly.
                // For better UX, we'll instantiate NachoLoader directly here if we know it's a Nacho-compatible file.
                
                // In this improved version, we are essentially bypassing the generic "launch" for a more controlled "Nacho Launch"
                // to get the rich events.
                
                const loader = new NachoLoader();
                loader.onStatusUpdate = (s, d) => {
                    setStatus(s);
                    if (d) setDetail(d);
                    addLog(`[${s}] ${d}`);
                };

                await loader.load(containerRef.current, filePath, type);
                
                setIsRunning(true);
                setStatus('Running');
                setDetail('Application Active');

            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to launch application');
            }
        };

        launch();

        return () => {
            RuntimeManager.getInstance().stop();
        };
    }, [filePath]);

    return (
        <div className="fixed inset-0 bg-black z-50 flex font-mono text-green-500 overflow-hidden">
            {/* Background Matrix/Grid Effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(32, 255, 77, .3) 25%, rgba(32, 255, 77, .3) 26%, transparent 27%, transparent 74%, rgba(32, 255, 77, .3) 75%, rgba(32, 255, 77, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(32, 255, 77, .3) 25%, rgba(32, 255, 77, .3) 26%, transparent 27%, transparent 74%, rgba(32, 255, 77, .3) 75%, rgba(32, 255, 77, .3) 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}>
            </div>

            {/* Main Content Area */}
            <div className="relative flex-1 flex flex-col">
                {/* Header */}
                <div className="h-12 border-b border-green-900 flex items-center justify-between px-6 bg-black/80 backdrop-blur">
                    <div className="flex items-center space-x-4">
                        <div className="text-xl font-bold tracking-widest text-green-400">NACHO<span className="text-xs align-top opacity-70">CORE</span></div>
                        <div className="h-4 w-[1px] bg-green-800"></div>
                        <div className="text-xs text-green-600">{filePath}</div>
                    </div>
                    <button onClick={onExit} className="px-4 py-1 border border-red-900 text-red-500 hover:bg-red-900/20 rounded text-xs transition-colors">
                        TERMINATE
                    </button>
                </div>

                {/* Workspace / Screen */}
                <div className="flex-1 relative flex items-center justify-center bg-black/50">
                    <div ref={containerRef} className="relative z-10 p-4 text-white" />
                    
                    {!isRunning && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8">
                            {/* Central Loader */}
                            <div className="relative w-64 h-64">
                                <div className="absolute inset-0 border-4 border-green-900/30 rounded-full animate-pulse"></div>
                                <div className="absolute inset-0 border-t-4 border-green-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-4 border-b-4 border-green-700/50 rounded-full animate-spin-slow"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-white mb-2">{status}</div>
                                        <div className="text-sm text-green-400 animate-pulse">{detail}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-900/20 border border-red-500 p-8 rounded max-w-lg text-center backdrop-blur-md">
                            <h2 className="text-2xl text-red-500 mb-4">CRITICAL FAILURE</h2>
                            <p className="text-red-300 mb-6">{error}</p>
                            <button onClick={onExit} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded">ABORT</button>
                        </div>
                    )}
                </div>

                {/* Bottom Status Bar */}
                <div className="h-32 border-t border-green-900 bg-black/90 p-4 grid grid-cols-3 gap-4 text-xs">
                    {/* Module Status */}
                    <div className="border-r border-green-900 pr-4">
                        <div className="text-green-700 mb-2 uppercase tracking-wider">Active Modules</div>
                        <div className="space-y-1">
                            {coreModules.map(mod => (
                                <div key={mod.name} className="flex justify-between">
                                    <span className="text-gray-400">{mod.name}</span>
                                    <span className={mod.color}>{mod.status.toUpperCase()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Logs */}
                    <div className="border-r border-green-900 pr-4 font-mono">
                        <div className="text-green-700 mb-2 uppercase tracking-wider">Kernel Log</div>
                        <div className="space-y-1 h-20 overflow-hidden opacity-70">
                            {logs.map((log, i) => (
                                <div key={i} className="truncate">
                                    <span className="text-green-500 mr-2">{'>'}</span>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats / Metrics */}
                    <div>
                        <div className="text-green-700 mb-2 uppercase tracking-wider">Metrics</div>
                        <div className="grid grid-cols-2 gap-2 text-gray-400">
                            <div>Memory: <span className="text-white">16MB</span></div>
                            <div>CPU Threads: <span className="text-white">1</span></div>
                            <div>Syscalls: <span className="text-white">Active</span></div>
                            <div>WASM: <span className="text-white">JIT</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
