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
import { buildStandaloneHtmlFile, downloadTextFile as downloadHtml } from '@/lib/packaging/standalone-html';
import { buildStandaloneWasmFile, downloadTextFile as downloadWasm } from '@/lib/packaging/standalone-wasm';
import { buildStandaloneEmulatorFile, downloadTextFile as downloadEmulator } from '@/lib/packaging/standalone-emulator';

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
    const [showPerf, setShowPerf] = useState(false);
    const [fps, setFps] = useState(0);
    const [memUsage, setMemUsage] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    const [user, setUser] = useState(() => authService.getCurrentUser());
    useEffect(() => authService.onAuthStateChange(setUser), []);

    // Performance monitoring
    useEffect(() => {
        if (!isRunning) return;
        
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measurePerf = () => {
            frameCount++;
            const now = performance.now();
            if (now >= lastTime + 1000) {
                setFps(Math.round(frameCount * 1000 / (now - lastTime)));
                frameCount = 0;
                lastTime = now;
                
                // Memory usage (if available)
                if ((performance as any).memory) {
                    const mem = (performance as any).memory;
                    setMemUsage(Math.round(mem.usedJSHeapSize / 1024 / 1024));
                }
            }
            if (isRunning) requestAnimationFrame(measurePerf);
        };
        
        const handle = requestAnimationFrame(measurePerf);
        return () => cancelAnimationFrame(handle);
    }, [isRunning]);

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

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleScreenshot = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${app?.name || 'screenshot'}-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    };

    const handleReboot = () => {
        window.location.reload();
    };

    const handleExport = async (exportType: 'emulator' | 'wasm') => {
        if (!app) return;
        
        setIsExporting(true);
        try {
            if (exportType === 'emulator') {
                // Export with embedded emulator
                console.log('Exporting as standalone emulator...');
                // For now, we'll create a placeholder since we need the binary
                const placeholderBinary = new ArrayBuffer(1024); // Placeholder
                const html = await buildStandaloneEmulatorFile({
                    title: app.name,
                    binary: placeholderBinary,
                    type: app.type === 'android' ? 'apk' : 'exe',
                });
                downloadEmulator(`${app.name}-standalone.html`, html);
            } else if (exportType === 'wasm') {
                // Export as WASM (would require transpilation)
                console.log('Exporting as WASM...');
                // Placeholder WASM module
                const placeholderWasm = new ArrayBuffer(1024);
                const html = await buildStandaloneWasmFile({
                    title: app.name,
                    wasmModule: placeholderWasm,
                });
                downloadWasm(`${app.name}-wasm.html`, html);
            }
            
            setShowExportModal(false);
        } catch (e: any) {
            console.error('Export failed:', e);
            alert('Export failed: ' + e.message);
        } finally {
            setIsExporting(false);
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
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
                >
                    <Card className="max-w-lg w-full border-red-500/30 bg-red-950/20">
                        <div className="flex flex-col items-center text-center gap-4">
                            <AlertTriangle size={48} className="text-red-500 animate-pulse" />
                            <div>
                                <h2 className="text-xl font-bold text-white">Runtime Error</h2>
                                <p className="text-red-300 font-mono text-sm mt-2 bg-black/40 p-3 rounded-lg border border-red-500/20">{error}</p>
                            </div>
                            
                            {/* Troubleshooting Tips */}
                            <div className="w-full bg-nacho-bg/50 border border-nacho-border rounded-xl p-4 text-left text-xs space-y-2">
                                <div className="font-bold text-nacho-text mb-2">Troubleshooting Tips:</div>
                                <div className="text-nacho-subtext space-y-1">
                                    <p>• Check if the file is corrupted or incomplete</p>
                                    <p>• For .apk files: Ensure it&apos;s a valid Android app</p>
                                    <p>• For .exe files: Only 32-bit Windows apps are supported</p>
                                    <p>• Try re-uploading the file</p>
                                    <p>• Clear browser cache and reload</p>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full">
                                <Button variant="secondary" className="flex-1" onClick={handleReboot}>
                                    Try Again
                                </Button>
                                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none" onClick={onExit}>
                                    Exit
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* HUD / Controls */}
            <AnimatePresence>
                {isRunning && (
                    <>
                        {/* Performance Display */}
                        {showPerf && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="absolute top-8 left-8 z-30"
                            >
                                <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/80 border border-nacho-border backdrop-blur-xl text-xs font-mono">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-nacho-subtext">FPS:</span>
                                        <span className={`font-bold ${fps >= 30 ? 'text-green-400' : 'text-yellow-400'}`}>{fps}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-nacho-subtext">Memory:</span>
                                        <span className="text-nacho-primary font-bold">{memUsage}MB</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-nacho-subtext">Type:</span>
                                        <span className="text-nacho-text font-bold uppercase">{app?.type || 'N/A'}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Control HUD */}
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

                                <ControlButton 
                                    icon={<Terminal size={16} />} 
                                    onClick={() => setShowPerf(!showPerf)} 
                                    label="Performance"
                                    active={showPerf}
                                />
                                <ControlButton 
                                    icon={<Download size={16} />} 
                                    onClick={handleScreenshot} 
                                    label="Screenshot" 
                                />
                                <div className="h-6 w-px bg-nacho-border mx-1" />
                                <ControlButton 
                                    icon={<span style={{fontSize: '14px'}}>📦</span>} 
                                    onClick={() => setShowExportModal(true)} 
                                    label="Export" 
                                />
                                <ControlButton 
                                    icon={isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />} 
                                    onClick={handleFullscreen} 
                                    label="Fullscreen" 
                                />
                                <ControlButton 
                                    icon={<RefreshCw size={16} />} 
                                    onClick={handleReboot} 
                                    label="Reboot" 
                                />
                                <ControlButton 
                                    icon={<Power size={16} />} 
                                    onClick={onExit} 
                                    danger 
                                    label="Power Off" 
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Export Modal */}
            <AnimatePresence>
                {showExportModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
                        onClick={() => !isExporting && setShowExportModal(false)}
                    >
                        <Card 
                            className="max-w-lg w-full border-nacho-border" 
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-white">Export as Standalone</h2>
                                    {!isExporting && (
                                        <button 
                                            onClick={() => setShowExportModal(false)}
                                            className="text-nacho-subtext hover:text-white transition-colors"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <p className="text-nacho-subtext text-sm">
                                    Create a standalone HTML file that can run offline without any server or dependencies.
                                </p>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleExport('emulator')}
                                        disabled={isExporting}
                                        className="w-full p-4 rounded-xl bg-nacho-card hover:bg-nacho-card-hover border border-nacho-border hover:border-nacho-border-strong transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="text-2xl">{app?.type === 'android' ? '🤖' : '⊞'}</div>
                                            <div className="flex-1">
                                                <div className="font-bold text-white mb-1">Emulator Export</div>
                                                <div className="text-xs text-nacho-subtext">
                                                    Embeds the full {app?.type === 'android' ? 'Android' : 'Windows'} runtime.
                                                    Large file (~10-50MB) but completely self-contained.
                                                </div>
                                                <div className="mt-2 text-[10px] text-nacho-primary font-mono">
                                                    ⚠️ Experimental • May have compatibility issues
                                                </div>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => handleExport('wasm')}
                                        disabled={isExporting}
                                        className="w-full p-4 rounded-xl bg-nacho-card hover:bg-nacho-card-hover border border-nacho-border hover:border-nacho-border-strong transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="text-2xl">⚡</div>
                                            <div className="flex-1">
                                                <div className="font-bold text-white mb-1">WASM Export</div>
                                                <div className="text-xs text-nacho-subtext">
                                                    For transpiled games. Faster and smaller (~1-5MB).
                                                    Requires prior transpilation.
                                                </div>
                                                <div className="mt-2 text-[10px] text-nacho-primary font-mono">
                                                    ⚡ Fast • Optimized
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                {isExporting && (
                                    <div className="flex items-center justify-center gap-3 py-4">
                                        <div className="w-5 h-5 border-2 border-nacho-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="text-nacho-subtext">Generating export...</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ControlButton = ({ icon, onClick, danger, label, active }: any) => (
    <button
        onClick={onClick}
        className={`p-3 rounded-full transition-all hover:scale-105 active:scale-95 group relative
            ${danger ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 
              active ? 'bg-nacho-primary/20 text-nacho-primary' :
              'hover:bg-white/10 text-nacho-subtext hover:text-white'}`}
        title={label}
    >
        {icon}
    </button>
);
