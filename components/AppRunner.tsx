"use client";

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, Power, RefreshCw, Mic, Volume2, Terminal, Cpu, AlertTriangle, Download } from 'lucide-react';
import { authService } from '@/lib/firebase/auth-service';
import { downloadClusterFile } from '@/lib/storage/chunked-download';
import { os } from '@/src/nacho_os';
import type { InstalledApp } from '@/lib/apps/apps-service';
import { opfsReadBytes, opfsWriteBytes } from '@/lib/storage/local-opfs';
import { localStore } from '@/lib/storage/local-store';
import { unlockAchievement } from '@/lib/gamification/achievements';
import { getNachoHeaders } from '@/lib/auth/nacho-identity';

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
        setLogs(prev => [...prev.slice(-10), `[${new Date().toLocaleTimeString()}] ${msg}`]);
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

            if (appId === 'test') {
                addLog("Booting Diagnostic Mode...");
                const canvas = canvasRef.current;
                if (!canvas) throw new Error('Display subsystem unavailable');
                if (!os) throw new Error('Kernel panic: OS not loaded');
                await os.boot(canvas);
                addLog("Running internal self-test...");
                await os.run(new File([], 'test.exe'));
                setIsRunning(true);
                setStatus('Running');
                return;
            }

            addLog("Authenticating user session...");
            void user;
            const headers = await getNachoHeaders();

            addLog("Fetching application metadata...");
            const res = await fetch(`/api/user/apps/${encodeURIComponent(appId)}`, {
                cache: 'no-store',
                headers,
            });
            if (!res.ok) {
                throw new Error(res.status === 401 ? 'Identity verification failed' : 'Application not found in registry');
            }
            const appData = (await res.json()) as InstalledApp;
            if (cancelled) return;
            setApp(appData);

            const canvas = canvasRef.current;
            if (!canvas) throw new Error('Display subsystem unavailable');

            addLog("Initializing Nacho Runtime Environment...");
            if (!os) throw new Error('Kernel panic: OS not loaded');

            await os.boot(canvas);
            if (cancelled) return;

            addLog("Mounting virtual filesystem...");
            addLog("Mounting virtual filesystem...");

            // 1. Check LocalStore (IndexedDB) - "Local Install"
            let bytes: Uint8Array | null = null;
            const localFile = await localStore.getFile(appData.fileId);

            if (localFile?.data) {
                bytes = new Uint8Array(await localFile.data.arrayBuffer());
            }

            if (bytes) {
                addLog("Loaded from Local Store (IndexedDB).");
            }

            // 2. Check OPFS (Historical Cache)
            if (!bytes) {
                const opfsBytes = await opfsReadBytes(appData.fileId);
                // Force cast to avoid SharedArrayBuffer type mismatch
                if (opfsBytes) {
                    // Fix: Double cast through unknown to handle ArrayBufferLike vs ArrayBuffer strictness
                    bytes = new Uint8Array(opfsBytes.buffer as unknown as ArrayBuffer);
                    addLog("Loaded from OPFS Cache.");
                }
            }

            // 3. No Auto-Download (Strict Local-First)
            if (!bytes) {
                console.log("[AppRunner] No local file found. Waiting for user input.");
                setStatus("Waiting for Local File...");
                return; // Stop here. Do not throw.
            }

            addLog(`Executing: ${appData.originalName}`);

            // Fix: Explicitly handle potential SharedArrayBuffer/ArrayBuffer mismatch
            // by creating a copy that is guaranteed to be a standard ArrayBuffer
            const copy = new Uint8Array(bytes.byteLength);
            copy.set(bytes as Uint8Array);

            const file = new File([copy.buffer], appData.originalName, { type: 'application/octet-stream' });

            await os.run(file);
            unlockAchievement('ran_app');

            addLog("Process started successfully.");
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
    }, [user, appId]);

    // Manual Cloud Download Handler
    const downloadFromCloud = async () => {
        if (!app?.fileId) return;

        try {
            setError(null);
            addLog("Initiating manual cloud download...");
            const dl = await downloadClusterFile(app.fileId, {
                compressedChunks: app.compression === 'gzip-chunked',
                scope: app.scope ?? "user",
                onProgress: (p) => {
                    setProgress(Math.round(((p.chunkIndex + 1) / p.totalChunks) * 100));
                    setStatus(`Downloading: ${Math.round(((p.chunkIndex + 1) / p.totalChunks) * 100)}%`);
                },
            });

            addLog("Download complete. Verifying integrity...");
            await opfsWriteBytes(app.fileId, dl.bytes);

            // Run logic (duplicated from useEffect for safety)
            const copy = new Uint8Array(dl.bytes.byteLength);
            copy.set(dl.bytes as Uint8Array);
            const file = new File([copy.buffer], app.originalName, { type: 'application/octet-stream' });

            if (os) {
                await os.run(file);
                unlockAchievement('ran_app');
                addLog("Process started successfully.");
                setIsRunning(true);
                setStatus('Running');
            } else {
                throw new Error("System Kernel (OS) is not loaded.");
            }

        } catch (e: any) {
            console.error(e);
            const msg = e?.message || 'Download Failed';
            addLog(`Error: ${msg}`);
            // Don't crash, just let them try again or drop file
            setStatus("Download Failed. Try again or drop local file.");
        }
    };

    // Simple Drag-and-Drop Handler
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0 && os) {
            const file = files[0];
            addLog(`Manual install detected: ${file.name}`);
            setStatus("Installing local file...");
            setError(null);

            // Run directly
            await os.run(file);
            unlockAchievement('ran_app');
            addLog("Process started successfully.");
            setIsRunning(true);
            setStatus('Running');
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black z-50 flex flex-col font-mono text-white overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >

            {/* Background / Canvas Layer */}
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-[#050505]">
                <canvas
                    ref={canvasRef}
                    className={`w-full h-full object-contain transition-opacity duration-1000 ${isRunning ? 'opacity-100' : 'opacity-20 blur-lg'}`}
                    width={1920}
                    height={1080}
                />
            </div>

            {/* Boot Overlay (Visible when not running) */}
            <AnimatePresence>
                {!isRunning && !error && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl"
                    >
                        <div className="w-full max-w-2xl p-8 space-y-8">
                            {/* Loader Graphic */}
                            <div className="flex justify-center">
                                <div className="relative w-24 h-24">
                                    <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                                    <div className="absolute inset-0 rounded-full border-t-4 border-cyan-500 animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Cpu size={32} className="text-cyan-500 animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {/* Status Text */}
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold tracking-tight text-white">{app?.name || "System Boot"}</h2>
                                <p className="text-cyan-400 animate-pulse">{status}</p>
                            </div>

                            {/* Terminal Logs */}
                            <div className="h-48 overflow-hidden rounded-lg bg-black/50 border border-white/10 p-4 font-mono text-xs text-green-400/80 shadow-inner">
                                {logs.map((log, i) => (
                                    <div key={i} className="truncate pb-1 border-b border-white/5 last:border-0">
                                        <span className="opacity-50 mr-2">&gt;</span>{log}
                                    </div>
                                ))}
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-cyan-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                />
                            </div>

                            {/* Manual Install Prompt */}
                            {(status.includes("Ready for Local Install") || status.includes("Waiting for Local File")) && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-6 p-8 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl text-center cursor-pointer hover:bg-white/10 transition-all hover:scale-[1.02] shadow-2xl relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <div className="text-white/90 font-bold text-xl mb-2 tracking-tight">Setup Required</div>
                                        <div className="text-white/60 text-sm font-medium">
                                            Drop your <span className="text-white font-mono bg-white/10 px-1 rounded">.{app?.type?.includes('android') ? 'apk' : 'exe'}</span> file here to install
                                        </div>

                                        {/* Optional Cloud Restore */}
                                        {app?.fileId && (
                                            <div
                                                onClick={(e) => { e.stopPropagation(); downloadFromCloud(); }}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 z-50 pointer-events-auto"
                                            >
                                                <Download size={14} />
                                                Download Cloud Save
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Overlay */}
            {error && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="bg-red-950/30 border border-red-500/50 p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                        <AlertTriangle size={64} className="mx-auto text-red-500" />
                        <div>
                            <h2 className="text-xl font-bold text-red-400 mb-2">CRITICAL FAILURE</h2>
                            <p className="text-red-200/60 font-mono text-sm">{error}</p>
                        </div>
                        <button
                            onClick={onExit}
                            className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-lg transition-colors font-bold tracking-widest text-sm"
                        >
                            EMERGENCY SHUTDOWN
                        </button>
                    </div>
                </div>
            )}

            {/* HUD / Controls (Only visible when running) */}
            <AnimatePresence>
                {isRunning && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
                    >
                        <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl">

                            <div className="flex items-center gap-3 px-4 border-r border-white/10 mr-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                                <span className="text-xs font-bold tracking-widest text-white/60">ONLINE</span>
                            </div>

                            <ControlButton icon={<Power size={18} />} onClick={onExit} danger label="Exit" />
                            <ControlButton icon={<RefreshCw size={18} />} label="Reset" />
                            <ControlButton icon={<Mic size={18} />} label="Audio" />
                            <ControlButton icon={<Maximize2 size={18} />} label="Fullscreen" />
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
        className={`p-3 rounded-xl transition-all hover:scale-110 active:scale-95 group relative
            ${danger ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-white/5 hover:bg-white/10 text-white/80'}`}
    >
        {icon}
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 border border-white/10 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {label}
        </span>
    </button>
);
