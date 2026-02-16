'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

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
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 border-b border-ocean-border pb-6">
        <div className="space-y-2">
          <h1 className="font-pixel text-lg text-ocean-accent retro-glow">
            VIRTUAL MACHINES
          </h1>
          <p className="font-mono text-sm text-ocean-secondary">
            Boot a full operating system directly in your browser.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Button onClick={shutdown} className="border-rose-500/20 text-rose-300">
              <span className="material-symbols-outlined mr-1.5 text-[16px]">power_settings_new</span>
              Shut Down
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-md border border-rose-500/20 px-4 py-3 text-sm text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300 ml-3">✕</button>
        </div>
      )}

      {/* Status bar when active */}
      {isActive && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ocean-muted">
          <span>OS: <span className="text-ocean-primary font-medium">{selectedOS === 'android' ? 'Android 14' : 'Windows NT'}</span></span>
          {elapsed !== null && <span>Boot: <span className="text-ocean-primary font-medium">{elapsed.toFixed(0)}ms</span></span>}
          <span>Status: <span className={bootState === 'running' ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
            {bootState === 'booting' ? 'Booting…' : 'Running'}
          </span></span>
        </div>
      )}

      {/* ─── OS Selection (idle state) ─── */}
      {!isActive && (
        <div className="mt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OSCard
              title="Android 14"
              engine="ART Runtime + WebGPU"
              description="Full AOSP framework with SystemUI, SurfaceFlinger compositing, Binder IPC, and Dalvik JIT."
              features={['Android Framework', 'ART JIT → WASM', 'SurfaceFlinger', 'Binder IPC', 'SystemUI']}
              accentColor="teal"
              onBoot={bootAndroid}
              icon="android"
            />
            <OSCard
              title="Windows NT"
              engine="NTR Engine + WebGPU"
              description="Win32 subsystem with Kernel32, User32, GDI32, and DirectX→WebGPU translation."
              features={['Win32 Subsystem', 'Kernel32 + GDI', 'DirectX → WebGPU', 'PE Loader', 'Virtual Memory']}
              accentColor="blue"
              onBoot={bootWindows}
              icon="laptop_windows"
            />
          </div>
          
          {/* Quick Actions */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionCard 
              title="Run APK Directly" 
              description="Skip the full OS - drop an APK file to run it immediately"
              href="/android"
              icon="android"
              color="teal"
            />
            <QuickActionCard 
              title="Run EXE Directly" 
              description="Skip the full OS - drop an EXE file to run it immediately"
              href="/windows"
              icon="laptop_windows"
              color="blue"
            />
            <QuickActionCard 
              title="Browse Games" 
              description="20,000+ HTML5 games ready to play instantly"
              href="/games"
              icon="sports_esports"
              color="purple"
            />
          </div>
        </div>
      )}

      {/* ─── Boot display (active state) ─── */}
      {isActive && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_0.35fr] gap-4">
          {/* Display surface */}
          <div className="overflow-hidden rounded-md border border-ocean-border bg-black relative">
            {/* OS status bar */}
            <div className="flex items-center justify-between border-b border-ocean-border bg-ocean-bg px-4 py-2">
              <div className="flex items-center gap-2 text-xs text-ocean-muted">
                <span className={`h-1.5 w-1.5 rounded-full ${bootState === 'running' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <span>{bootState === 'booting' ? 'Booting…' : 'Running'}</span>
                <span className="text-ocean-secondary">·</span>
                <span className="text-ocean-secondary">{selectedOS === 'android' ? 'Android 14' : 'Windows NT'}</span>
              </div>
              <div className="text-[11px] text-ocean-muted font-mono">
                {selectedOS === 'android' ? 'ART Runtime' : 'NTR Engine'}
              </div>
            </div>

            {/* Android display div */}
            {selectedOS === 'android' && (
              <div ref={displayRef} className="w-full h-[70vh] bg-black" />
            )}

            {/* Windows canvas */}
            {selectedOS === 'windows' && (
              <canvas ref={canvasRef} className="w-full h-[70vh] bg-black" />
            )}
          </div>

          {/* Log panel */}
          <div className="overflow-hidden rounded-md border border-ocean-border bg-ocean-bg flex flex-col">
            <div className="flex items-center justify-between border-b border-ocean-border px-4 py-2">
              <span className="text-xs text-ocean-muted font-medium">Boot Log</span>
              <span className="text-[10px] text-ocean-muted font-mono">{logs.length}</span>
            </div>
            <div className="flex-1 h-[70vh] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-0.5">
              {logs.length === 0 ? (
                <div className="text-ocean-muted">Select an OS to boot…</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={
                    log.level === 'error' ? 'text-rose-400' :
                    log.level === 'warn' ? 'text-amber-400' :
                    log.level === 'success' ? 'text-emerald-400' :
                    'text-ocean-secondary'
                  }>
                    {log.message}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* ─── App Decoder links ─── */}
      {!isActive && (
        <section className="mt-14">
          <h2 className="font-pixel text-sm text-ocean-accent mb-4">APP DECODERS</h2>
          <p className="text-sm text-ocean-secondary mb-6">
            Don&apos;t need a full OS? Drop individual APK or EXE files to decode and run them directly.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/android" className="block">
              <Card className="p-5 flex items-center gap-4 hover:border-ocean-border-hover transition-colors">
                <div className="p-2.5 rounded-md bg-teal-500/8 border border-teal-500/10 flex-shrink-0">
                  <span className="material-symbols-outlined text-xl text-teal-400">android</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ocean-primary">Android APK Decoder</h3>
                  <p className="text-xs text-ocean-secondary mt-0.5">Drop an .apk → decoded via ART runtime</p>
                </div>
              </Card>
            </Link>
            <Link href="/windows" className="block">
              <Card className="p-5 flex items-center gap-4 hover:border-ocean-border-hover transition-colors">
                <div className="p-2.5 rounded-md bg-blue-500/8 border border-blue-500/10 flex-shrink-0">
                  <span className="material-symbols-outlined text-xl text-blue-400">laptop_windows</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ocean-primary">Windows EXE Decoder</h3>
                  <p className="text-xs text-ocean-secondary mt-0.5">Drop an .exe → decoded via NTR engine</p>
                </div>
              </Card>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function OSCard({
  title,
  engine,
  description,
  features,
  accentColor,
  onBoot,
  icon,
}: {
  title: string;
  engine: string;
  description: string;
  features: string[];
  accentColor: 'teal' | 'blue';
  onBoot: () => void;
  icon: string;
}) {
  const accent = accentColor === 'teal'
    ? { text: 'text-teal-400', border: 'border-teal-500/15', bg: 'bg-teal-500/8', hover: 'hover:shadow-[0_0_30px_rgba(20,184,166,0.15)]' }
    : { text: 'text-blue-400', border: 'border-blue-500/15', bg: 'bg-blue-500/8', hover: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]' };

  return (
    <Card className={`flex flex-col p-6 h-full transition-all duration-300 ${accent.hover}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${accent.bg} border ${accent.border}`}>
          <span className={`material-symbols-outlined text-2xl ${accent.text}`}>
            {icon}
          </span>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider border font-medium ${accent.text} ${accent.border} ${accent.bg}`}>
          {engine}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-ocean-primary mb-2">{title}</h3>
      <p className="text-sm text-ocean-secondary leading-relaxed mb-4">{description}</p>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {features.map((f) => (
          <span key={f} className="px-2 py-0.5 rounded-md text-[10px] font-mono text-ocean-muted border border-ocean-border bg-ocean-surface/30">
            {f}
          </span>
        ))}
      </div>

      <div className="mt-auto">
        <Button variant="primary" className="w-full" onClick={onBoot}>
          <span className="material-symbols-outlined mr-1.5 text-[16px]">power_settings_new</span>
          Boot {title}
        </Button>
      </div>
    </Card>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: 'teal' | 'blue' | 'purple';
}) {
  const colorStyles = {
    teal: { text: 'text-teal-400', border: 'border-teal-500/20', bg: 'bg-teal-500/10', hover: 'hover:border-teal-500/40 hover:bg-teal-500/15' },
    blue: { text: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10', hover: 'hover:border-blue-500/40 hover:bg-blue-500/15' },
    purple: { text: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/10', hover: 'hover:border-purple-500/40 hover:bg-purple-500/15' },
  };
  
  const c = colorStyles[color];
  
  return (
    <Link href={href} className="group block">
      <div className={`rounded-xl border ${c.border} ${c.bg} p-5 transition-all duration-300 ${c.hover}`}>
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-lg ${c.bg} border ${c.border}`}>
            <span className={`material-symbols-outlined text-xl ${c.text}`}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-ocean-primary mb-1 group-hover:text-ocean-accent transition-colors">
              {title}
            </h4>
            <p className="text-xs text-ocean-secondary leading-relaxed">
              {description}
            </p>
          </div>
          <span className="material-symbols-outlined text-ocean-muted group-hover:text-ocean-accent transition-colors">
            arrow_forward
          </span>
        </div>
      </div>
    </Link>
  );
}
