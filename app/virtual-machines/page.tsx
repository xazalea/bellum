'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// Icons
function VMIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 20.5l2-2m-2 2l-2-2m2 2v-6m-6 6h12a2 2 0 002-2v-9a2 2 0 00-2-2h-3.5a2 2 0 00-1.5.7l-1.5 1.8a2 2 0 01-1.5.7H6a2 2 0 00-2 2v4a2 2 0 002 2z" />
    </svg>
  );
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function PowerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function PowerOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

type OSType = 'android' | 'windows' | null;
type BootState = 'idle' | 'booting' | 'running' | 'error';

interface LogEntry {
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export default function VirtualMachinesPage() {
  const [selectedOS, setSelectedOS] = useState<OSType>(null);
  const [bootState, setBootState] = useState<BootState>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const bootManagerRef = useRef<any>(null);

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'info') => {
    setLogs((prev) => [...prev, { message, level }]);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const shutdown = useCallback(async () => {
    try {
      await bootManagerRef.current?.shutdown?.();
    } catch { /* ignore */ }
    bootManagerRef.current = null;
    setBootState('idle');
    setSelectedOS(null);
    setElapsed(null);
    addLog('System shut down', 'info');
  }, [addLog]);

  const bootAndroid = useCallback(async () => {
    try {
      setError(null);
      setLogs([]);
      setElapsed(null);
      setSelectedOS('android');
      setBootState('booting');

      const startTime = performance.now();
      addLog('Initializing Android 14...', 'info');

      await new Promise((r) => requestAnimationFrame(r));

      const display = displayRef.current;
      if (!display) throw new Error('Display container unavailable');
      display.innerHTML = '';

      addLog('Loading Android boot manager...', 'info');
      const { androidBootManager } = await import('@/lib/nexus/os/android-boot');
      bootManagerRef.current = androidBootManager;

      addLog('Stage 1: WebGPU + Persistent Kernels', 'info');
      addLog('Stage 2: Linux Kernel (init, zygote)', 'info');
      addLog('Stage 3: Android Framework services', 'info');
      addLog('Stage 4: SystemUI (launcher, status bar)', 'info');

      await androidBootManager.boot(display);

      const ms = performance.now() - startTime;
      setElapsed(ms);
      addLog(`Android 14 booted in ${ms.toFixed(0)}ms`, 'success');
      setBootState('running');
    } catch (e: any) {
      const msg = e?.message || 'Failed to boot Android';
      setError(msg);
      setBootState('error');
      addLog(`Error: ${msg}`, 'error');
    }
  }, [addLog]);

  const bootWindows = useCallback(async () => {
    try {
      setError(null);
      setLogs([]);
      setElapsed(null);
      setSelectedOS('windows');
      setBootState('booting');

      const startTime = performance.now();
      addLog('Initializing Windows NT...', 'info');

      await new Promise((r) => requestAnimationFrame(r));

      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas unavailable');
      canvas.width = canvas.clientWidth || 1024;
      canvas.height = canvas.clientHeight || 768;

      addLog('Loading Win32 subsystem...', 'info');
      const { WebGPUContext } = await import('@/lib/nacho/gpu/webgpu');
      const { WindowsRuntime } = await import('@/lib/nacho/windows/runtime');

      const gpu = new WebGPUContext(canvas);
      try {
        await gpu.initialize();
        addLog('WebGPU initialized', 'success');
      } catch {
        addLog('WebGPU unavailable — using Canvas 2D fallback', 'warn');
      }

      const runtime = new WindowsRuntime(gpu);
      runtime.setCanvas(canvas);
      bootManagerRef.current = runtime;

      addLog('Booting Win32 subsystem (Kernel32 + User32 + GDI)...', 'info');
      await runtime.boot();
      addLog('Kernel32 · User32 · GDI loaded', 'success');

      const ms = performance.now() - startTime;
      setElapsed(ms);
      addLog(`Windows booted in ${ms.toFixed(0)}ms`, 'success');
      setBootState('running');
    } catch (e: any) {
      const msg = e?.message || 'Failed to boot Windows';
      setError(msg);
      setBootState('error');
      addLog(`Error: ${msg}`, 'error');
    }
  }, [addLog]);

  useEffect(() => {
    return () => { shutdown(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = bootState === 'booting' || bootState === 'running';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <VMIcon className="w-7 h-7 text-cyan-400" />
            Virtual Machines
          </h1>
          <p className="text-slate-400 mt-1">
            Boot full operating systems directly in your browser
          </p>
        </div>
        
        {isActive && (
          <button
            onClick={shutdown}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
          >
            <PowerOffIcon className="w-4 h-4" />
            Shut Down
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <PowerOffIcon className="w-5 h-5 flex-shrink-0" />
          <p className="flex-1 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            ✕
          </button>
        </div>
      )}

      {/* Status Bar */}
      {isActive && (
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">OS:</span>
            <span className="text-sm font-medium text-white">
              {selectedOS === 'android' ? 'Android 14' : 'Windows NT'}
            </span>
          </div>
          {elapsed !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Boot:</span>
              <span className="text-sm font-medium text-white">{elapsed.toFixed(0)}ms</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Status:</span>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
              bootState === 'running' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${bootState === 'running' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              {bootState === 'booting' ? 'Booting...' : 'Running'}
            </div>
          </div>
        </div>
      )}

      {/* OS Selection */}
      {!isActive && (
        <div className="space-y-8">
          {/* Main OS Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Android Card */}
            <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-6 hover:border-emerald-500/40 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
              
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                    <AndroidIcon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                    ART Runtime
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">Android 14</h3>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                  Full AOSP framework with SystemUI, SurfaceFlinger compositing, 
                  Binder IPC, and Dalvik JIT compilation.
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {['Android Framework', 'ART JIT → WASM', 'SurfaceFlinger', 'Binder IPC', 'SystemUI'].map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={bootAndroid}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all"
                >
                  <PowerIcon className="w-5 h-5" />
                  Boot Android
                </button>
              </div>
            </div>

            {/* Windows Card */}
            <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-6 hover:border-cyan-500/40 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
              
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
                    <WindowsIcon className="w-8 h-8 text-cyan-400" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium">
                    NTR Engine
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">Windows NT</h3>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                  Win32 subsystem with Kernel32, User32, GDI32, and DirectX→WebGPU 
                  translation layer.
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {['Win32 Subsystem', 'Kernel32 + GDI', 'DirectX → WebGPU', 'PE Loader', 'Virtual Memory'].map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={bootWindows}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-cyan-500 transition-all"
                >
                  <PowerIcon className="w-5 h-5" />
                  Boot Windows
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/android"
                className="group flex items-center gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
              >
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <AndroidIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white text-sm">Run APK Directly</h4>
                  <p className="text-xs text-slate-400">Skip the full OS</p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                href="/windows"
                className="group flex items-center gap-4 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all"
              >
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <WindowsIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white text-sm">Run EXE Directly</h4>
                  <p className="text-xs text-slate-400">Skip the full OS</p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                href="/games"
                className="group flex items-center gap-4 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all"
              >
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <VMIcon className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white text-sm">Browse Games</h4>
                  <p className="text-xs text-slate-400">20,000+ games ready</p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Active VM Display */}
      {isActive && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
          {/* Display */}
          <div className="rounded-2xl overflow-hidden border border-cyan-500/20 bg-[#0a1628]">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/10 bg-[#0a1628]/80">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${bootState === 'running' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <span className="text-sm text-slate-400">
                  {bootState === 'booting' ? 'Booting...' : 'Running'}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-sm text-slate-400">
                  {selectedOS === 'android' ? 'Android 14' : 'Windows NT'}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {selectedOS === 'android' ? 'ART Runtime' : 'NTR Engine'}
              </span>
            </div>

            {/* Display Area */}
            <div className="relative bg-black">
              {selectedOS === 'android' && (
                <div ref={displayRef} className="w-full h-[60vh] min-h-[400px]" />
              )}
              {selectedOS === 'windows' && (
                <canvas ref={canvasRef} className="w-full h-[60vh] min-h-[400px]" />
              )}
            </div>
          </div>

          {/* Log Panel */}
          <div className="rounded-2xl overflow-hidden border border-cyan-500/20 bg-[#0a1628] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/10">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">Boot Log</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">{logs.length} entries</span>
            </div>
            <div className="flex-1 h-[60vh] min-h-[400px] overflow-y-auto p-4 font-mono text-xs space-y-1">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">Waiting for boot sequence...</div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={`${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-amber-400' :
                      log.level === 'success' ? 'text-emerald-400' :
                      'text-slate-400'
                    }`}
                  >
                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>{' '}
                    {log.message}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
