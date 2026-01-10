"use client";

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, Power, RefreshCw, Mic, Volume2, Terminal, Cpu, AlertTriangle, Download, Wifi } from 'lucide-react';
import { authService } from '@/lib/firebase/auth-service';
import { downloadClusterFile } from '@/lib/storage/chunked-download';
import { getNachoOS } from '@/src/nacho_os';
import type { InstalledApp } from '@/lib/apps/apps-service';
import { opfsReadBytes, opfsWriteBytes } from '@/lib/storage/local-opfs';
import { localStore } from '@/lib/storage/local-store';
import { unlockAchievement } from '@/lib/gamification/achievements';
import { getNachoHeaders } from '@/lib/auth/nacho-identity';
import { Card } from '@/components/nacho-ui/Card';
import { Button } from '@/components/nacho-ui/Button';
import { ProgressBar } from '@/components/nacho-ui/ProgressBar';
import { StatusIndicator } from '@/components/nacho-ui/StatusIndicator';

export interface AppRunnerProps {
    appId?: string;
    onExit?: () => void;
}

export const AppRunner: React.FC<AppRunnerProps> = ({ appId, onExit }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<string>('Initializing...');
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [app, setApp] = useState<InstalledApp | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    
    const [user, setUser] = useState(() => authService.getCurrentUser());
    useEffect(() => authService.onAuthStateChange(setUser), []);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev.slice(-8), `[${new Date().toLocaleTimeString()}] ${msg}`]);
        setStatus(msg);
    };

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setError(null);
            setProgress(0);
            setApp(null);
            setLogs([]);
            setIsRunning(false);

            if (!appId) {
                setStatus('No app selected');
                return;
            }

            // --- 1. Fetch Metadata ---
            addLog("Fetching application metadata...");
            const headers = await getNachoHeaders();
            const res = await fetch(`/api/user/apps/${encodeURIComponent(appId)}`, {
                cache: 'no-store',
                headers,
            });
            if (!res.ok) {
                throw new Error(res.status === 401 ? 'Identity verification failed' : 'Application not found');
            }
            const appData = (await res.json()) as InstalledApp;
            if (cancelled) return;
            setApp(appData);

            const canvas = canvasRef.current;
            if (!canvas) throw new Error('Display subsystem unavailable');

            // --- 2. Initialize OS ---
            addLog("Initializing Nacho Runtime...");
            const os = getNachoOS();
            if (!os) throw new Error('Kernel panic: OS not loaded');
            await os.boot(canvas);
            if (cancelled) return;

            // --- 3. Resolve File (Local -> OPFS -> Cloud) ---
            addLog("Resolving storage...");
            let bytes: Uint8Array | null = null;

            // Check LocalStore
            const localFile = await localStore.getFile(appData.fileId);
            if (localFile?.data) {
                bytes = new Uint8Array(await localFile.data.arrayBuffer());
                addLog("Loaded from Local Store.");
            }

            // Check OPFS
            if (!bytes) {
                const opfsBytes = await opfsReadBytes(appData.fileId);
                if (opfsBytes) {
                    bytes = new Uint8Array(opfsBytes.buffer as unknown as ArrayBuffer);
                    addLog("Loaded from OPFS Cache.");
                }
            }

            // Download from Cloud (Auto)
            if (!bytes && appData.fileId) {
                addLog("Downloading from Cluster...");
                try {
                    const dl = await downloadClusterFile(appData.fileId, {
                        compressedChunks: appData.compression === 'gzip-chunked',
                        scope: appData.scope ?? "user",
                        onProgress: (p) => {
                            const pct = Math.round(((p.chunkIndex + 1) / p.totalChunks) * 100);
                            setProgress(pct);
                            setStatus(`Downloading: ${pct}%`);
                        },
                    });
                    bytes = new Uint8Array(dl.bytes);
                    
                    // Cache for next time
                    await opfsWriteBytes(appData.fileId, dl.bytes);
                    addLog("Download complete & cached.");
                } catch (e: any) {
                    console.error("Auto-download failed:", e);
                    // Fallthrough to manual prompt if download fails
                    addLog(`Download failed: ${e.message}`);
                }
            }

            if (!bytes) {
                setStatus("Waiting for File...");
                addLog("No file found locally or in cloud.");
                return; // Stays in "Waiting" state, showing prompt
            }

            // --- 4. Execution ---
            addLog(`Executing: ${appData.originalName}`);
            
            // Safety copy for SharedArrayBuffer issues
            const copy = new Uint8Array(bytes.byteLength);
            copy.set(bytes);
            const file = new File([copy.buffer], appData.originalName, { type: 'application/octet-stream' });

            await os.run(file);
            unlockAchievement('ran_app');

            addLog("Process started.");
            setIsRunning(true);
            setStatus('Running');

        })().catch((e: any) => {
            console.error(e);
            setError(e?.message || 'Fatal Execution Error');
            addLog(`ERROR: ${e?.message}`);
            setStatus('System Halted');
        });

        return () => {
            cancelled = true;
        };
    }, [appId]);

    // Manual Drag-and-Drop Handler (Fallback)
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const file = files[0];
            addLog(`Manual install: ${file.name}`);
            const os = getNachoOS();
            if (os) {
                await os.run(file);
                setIsRunning(true);
            }
        }
    };

    return (
        <div
            className="fixed inset-0 bg-nacho-bg z-50 flex flex-col font-mono text-white overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            {/* Background / Canvas Layer */}
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-black">
                <canvas
                    ref={canvasRef}
                    className={`w-full h-full object-contain transition-opacity duration-1000 ${isRunning ? 'opacity-100' : 'opacity-40 blur-md'}`}
                    width={1920}
                    height={1080}
                />
            </div>

            {/* Overlay UI */}
            <AnimatePresence>
                {!isRunning && !error && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-nacho-bg/80 backdrop-blur-xl p-4"
                    >
                        <Card className="w-full max-w-lg flex flex-col gap-8 border-nacho-border shadow-2xl">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative w-20 h-20">
                                    <div className="absolute inset-0 rounded-full border-4 border-nacho-border" />
                                    <div className="absolute inset-0 rounded-full border-t-4 border-nacho-primary animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Cpu size={28} className="text-nacho-primary animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h2 className="font-display text-2xl font-bold text-white mb-1">{app?.name || "System Boot"}</h2>
                                    <p className="text-sm font-mono text-nacho-primary animate-pulse">{status}</p>
                                </div>
                            </div>

                            <div className="bg-nacho-bg border border-nacho-border rounded-xl p-4 h-32 overflow-hidden font-mono text-xs text-nacho-subtext relative">
                                <div className="absolute top-2 right-3 text-[10px] uppercase font-bold text-nacho-subtext/50">System Log</div>
                                <div className="flex flex-col justify-end h-full">
                                    {logs.map((log, i) => (
                                        <div key={i} className="truncate opacity-80 pb-0.5">
                                            <span className="text-nacho-primary mr-2">➜</span>{log}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {progress > 0 && (
                                <ProgressBar value={progress} showValue className="mt-2" />
                            )}

                            {status.includes("Waiting for File") && (
                                <div className="p-4 border border-dashed border-nacho-border rounded-xl bg-nacho-bg/50 text-center">
                                    <p className="text-sm text-nacho-subtext mb-2">Manual Override Required</p>
                                    <p className="text-xs text-nacho-subtext/70">Drop .exe or .apk file here to inject</p>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error State */}
            {error && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                    <Card className="max-w-md w-full border-red-500/30 bg-red-950/20">
                        <div className="flex flex-col items-center text-center gap-4">
                            <AlertTriangle size={48} className="text-red-500" />
                            <div>
                                <h2 className="text-xl font-bold text-white">Runtime Error</h2>
                                <p className="text-red-300 font-mono text-sm mt-2">{error}</p>
                            </div>
                            <Button className="w-full bg-red-600 hover:bg-red-700 text-white border-none mt-4" onClick={onExit}>
                                Force Shutdown
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* HUD / Controls */}
            <AnimatePresence>
                {isRunning && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
                    >
                        <div className="flex items-center gap-2 p-2 rounded-full bg-nacho-card/90 border border-nacho-border backdrop-blur-2xl shadow-2xl">
                            <div className="pl-4 pr-3 flex items-center gap-2 border-r border-nacho-border mr-1">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] font-bold tracking-widest text-nacho-subtext">LIVE</span>
                            </div>

                            <ControlButton icon={<Power size={16} />} onClick={onExit} danger label="Power Off" />
                            <ControlButton icon={<RefreshCw size={16} />} label="Reboot" />
                            <ControlButton icon={<Maximize2 size={16} />} label="Fullscreen" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ControlButton = ({ icon, onClick, danger, label }: any) => (
    <button
        onClick={onClick}
        className={`p-3 rounded-full transition-all hover:scale-105 active:scale-95 group relative
            ${danger ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-nacho-subtext hover:text-white'}`}
        title={label}
    >
        {icon}
    </button>
);
