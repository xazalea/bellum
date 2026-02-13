'use client';

import { Button } from '@/components/ui/Button';
import { useCallback, useEffect, useRef, useState } from 'react';

type BootState = 'idle' | 'booting' | 'running' | 'error';

interface BootLog {
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export default function WindowsPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<any>(null);
  const [state, setState] = useState<BootState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<BootLog[]>([]);
  const [exeStatus, setExeStatus] = useState<string | null>(null);
  const [cpuInfo, setCpuInfo] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const consoleRestore = useRef<{ log: typeof console.log; warn: typeof console.warn; error: typeof console.error } | null>(null);

  const addLog = useCallback((message: string, level: BootLog['level'] = 'info') => {
    setLogs((prev) => [...prev, { message, level }]);
  }, []);

  // Auto-scroll log panel
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const canStart = state === 'idle' || state === 'error';

  /* ─── Stop ─── */
  const stop = useCallback(() => {
    if (consoleRestore.current) {
      console.log = consoleRestore.current.log;
      console.warn = consoleRestore.current.warn;
      console.error = consoleRestore.current.error;
      consoleRestore.current = null;
    }
    try {
      runtimeRef.current?.stop?.();
    } catch {
      // ignore
    }
    runtimeRef.current = null;
    setState('idle');
    setExeStatus(null);
    setCpuInfo(null);
    addLog('Windows runtime stopped', 'info');
  }, [addLog]);

  /* ─── Boot Windows Runtime (NTR) ─── */
  const start = useCallback(async () => {
    try {
      setError(null);
      setLogs([]);
      setExeStatus(null);
      setCpuInfo(null);
      setState('booting');

      if (!canvasRef.current) throw new Error('missing_canvas');

      const canvas = canvasRef.current;
      canvas.width = canvas.clientWidth || 800;
      canvas.height = canvas.clientHeight || 600;

      addLog('Importing Windows Runtime modules…', 'info');

      // Intercept console for boot logs
      const origLog = console.log;
      const origWarn = console.warn;
      const origError = console.error;
      consoleRestore.current = { log: origLog, warn: origWarn, error: origError };

      console.log = (...args: any[]) => {
        origLog.apply(console, args);
        const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        if (
          msg.includes('[User32') ||
          msg.includes('[SYSCALL') ||
          msg.includes('[STDOUT') ||
          msg.includes('🪟') ||
          msg.includes('📦') ||
          msg.includes('🚀') ||
          msg.includes('Booting') ||
          msg.includes('Kernel32') ||
          msg.includes('User32') ||
          msg.includes('PE ') ||
          msg.includes('GDI') ||
          msg.includes('DirectX') ||
          msg.includes('System Server') ||
          msg.includes('Ready to Execute') ||
          msg.includes('Runtime') ||
          msg.includes('Memory') ||
          msg.includes('Unified') ||
          msg.includes('WebGPU')
        ) {
          addLog(msg, 'info');
        }
      };
      console.warn = (...args: any[]) => {
        origWarn.apply(console, args);
        addLog(args.join(' '), 'warn');
      };
      console.error = (...args: any[]) => {
        origError.apply(console, args);
        addLog(args.join(' '), 'error');
      };

      // Dynamic imports to avoid SSR issues
      const { WebGPUContext } = await import('@/lib/nacho/gpu/webgpu');
      const { WindowsRuntime } = await import('@/lib/nacho/windows/runtime');

      addLog('Initializing WebGPU context…', 'info');
      const gpu = new WebGPUContext(canvas);
      try {
        await gpu.initialize();
        addLog('WebGPU initialized (hardware-accelerated GDI/DirectX)', 'success');
      } catch (e: any) {
        addLog(`WebGPU not available: ${e?.message}. Canvas 2D fallback active.`, 'warn');
      }

      addLog('Allocating Unified Memory…', 'info');
      addLog('Initializing x86 Interpreter…', 'info');

      const runtime = new WindowsRuntime(gpu);
      runtime.setCanvas(canvas);
      runtimeRef.current = runtime;

      addLog('Booting Nacho Windows Runtime (NTR)…', 'info');
      await runtime.boot();

      // Restore console
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
      consoleRestore.current = null;

      addLog('Loading Kernel32.dll shim…', 'success');
      addLog('Loading User32.dll shim…', 'success');
      addLog('Loading GDI+ (WebGPU accelerated)…', 'success');
      addLog('Win32 Subsystem ready', 'success');
      addLog('Ready to load PE executables (.exe)', 'info');

      setCpuInfo('x86 SimpleInterpreter');
      setState('running');
    } catch (e: any) {
      if (consoleRestore.current) {
        console.log = consoleRestore.current.log;
        console.warn = consoleRestore.current.warn;
        console.error = consoleRestore.current.error;
        consoleRestore.current = null;
      }
      const msg = e?.message || 'boot_failed';
      setError(msg);
      setState('error');
      addLog(`Boot failed: ${msg}`, 'error');
    }
  }, [addLog]);

  /* ─── EXE Upload + Load ─── */
  const handleEXE = useCallback(
    async (file: File) => {
      if (state !== 'running' || !runtimeRef.current) {
        setError('Boot Windows first before loading an EXE');
        return;
      }
      try {
        setExeStatus('Loading…');
        addLog(`Loading PE: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');

        const buffer = await file.arrayBuffer();
        addLog('Parsing PE headers and loading sections…', 'info');

        // Intercept console during PE load
        const origLog = console.log;
        console.log = (...args: any[]) => {
          origLog.apply(console, args);
          const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
          if (msg.includes('📦') || msg.includes('Section') || msg.includes('Entry') || msg.includes('Image') || msg.includes('Loaded') || msg.includes('Ready') || msg.includes('PE') || msg.includes('[User32') || msg.includes('[STDOUT') || msg.includes('Process')) {
            addLog(msg, 'info');
          }
        };

        await runtimeRef.current.loadPE(buffer);

        console.log = origLog;

        setExeStatus('Running');
        addLog('PE executable loaded and executing', 'success');
      } catch (e: any) {
        setExeStatus(null);
        const msg = e?.message || 'unknown';
        addLog(`PE load failed: ${msg}`, 'error');
        setError(`Failed to load EXE: ${msg}`);
      }
    },
    [state, addLog],
  );

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-6 border-b border-ocean-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ocean-primary">Windows</h1>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-blue-400 border border-blue-500/15">
              NTR Engine
            </span>
          </div>
          <p className="text-sm text-ocean-secondary">
            Win32 emulation with x86 interpreter, PE loader, and WebGPU-accelerated GDI/DirectX.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canStart ? (
            <Button onClick={start}>
              <span className="material-symbols-outlined mr-1.5 text-[16px]">play_arrow</span>
              Boot
            </Button>
          ) : (
            <Button onClick={stop} className="border-rose-500/20 text-rose-300">
              <span className="material-symbols-outlined mr-1.5 text-[16px]">stop</span>
              Shutdown
            </Button>
          )}

          <label className="inline-flex">
            <input
              ref={fileInputRef}
              type="file"
              accept=".exe"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleEXE(f);
                e.currentTarget.value = '';
              }}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={state !== 'running'}>
              <span className="material-symbols-outlined mr-1.5 text-[16px]">terminal</span>
              Run EXE
            </Button>
          </label>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mt-6 rounded-md border border-rose-500/20 px-4 py-3 text-sm text-rose-300">{error}</div>
      )}

      {/* ── Metrics bar ── */}
      {state === 'running' && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ocean-muted">
          <span>
            Runtime: <span className="text-blue-400 font-medium">NTR (Win32 Emulation)</span>
          </span>
          {cpuInfo && (
            <span>
              CPU: <span className="text-ocean-primary font-medium">{cpuInfo}</span>
            </span>
          )}
          <span>
            Graphics: <span className="text-ocean-primary font-medium">GDI + DirectX → WebGPU</span>
          </span>
          <span>
            DLLs: <span className="text-ocean-primary font-medium">Kernel32 · User32 · GDI32</span>
          </span>
          {exeStatus && (
            <span>
              EXE: <span className="text-blue-400 font-medium">{exeStatus}</span>
            </span>
          )}
        </div>
      )}

      {/* ── Display + Log Panel ── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_0.4fr] gap-4">
        {/* Main canvas */}
        <div className="overflow-hidden rounded-md border border-ocean-border bg-black">
          <div className="flex items-center justify-between border-b border-ocean-border bg-ocean-bg px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-ocean-muted">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  state === 'running'
                    ? 'bg-emerald-400'
                    : state === 'booting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                }`}
              />
              <span>
                {state === 'idle' ? 'Ready' : state === 'booting' ? 'Booting…' : state === 'running' ? 'Running' : 'Error'}
              </span>
            </div>
            <div className="text-[11px] text-ocean-muted font-mono">Nacho Win32 Engine</div>
          </div>
          <canvas ref={canvasRef} className="h-[70vh] w-full bg-black" />
        </div>

        {/* System log panel */}
        <div className="overflow-hidden rounded-md border border-ocean-border bg-ocean-bg flex flex-col">
          <div className="flex items-center justify-between border-b border-ocean-border px-4 py-2">
            <span className="text-xs text-ocean-muted font-medium">System Log</span>
            <span className="text-[10px] text-ocean-muted font-mono">{logs.length} entries</span>
          </div>
          <div className="flex-1 h-[70vh] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-0.5">
            {logs.length === 0 ? (
              <div className="text-ocean-muted">Waiting for boot…</div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.level === 'error'
                      ? 'text-rose-400'
                      : log.level === 'warn'
                        ? 'text-amber-400'
                        : log.level === 'success'
                          ? 'text-emerald-400'
                          : 'text-ocean-secondary'
                  }
                >
                  {log.message}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </main>
  );
}
