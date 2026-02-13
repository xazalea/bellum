'use client';

import { Button } from '@/components/ui/Button';
import { useCallback, useEffect, useRef, useState } from 'react';

type RunState = 'idle' | 'loading' | 'running' | 'error';

interface LogEntry {
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export default function WindowsPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<any>(null);
  const [state, setState] = useState<RunState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'info') => {
    setLogs((prev) => [...prev, { message, level }]);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  /* ─── Stop ─── */
  const stop = useCallback(() => {
    try {
      runtimeRef.current?.stop?.();
    } catch { /* ignore */ }
    runtimeRef.current = null;
    setState('idle');
    setFileName(null);
    setFileSize(0);
    setElapsed(null);
    addLog('Runtime stopped', 'info');
  }, [addLog]);

  /* ─── Run EXE ─── */
  const runEXE = useCallback(async (file: File) => {
    try {
      setError(null);
      setLogs([]);
      setElapsed(null);
      setState('loading');
      setFileName(file.name);
      setFileSize(file.size);

      if (!canvasRef.current) throw new Error('Canvas missing');

      const canvas = canvasRef.current;
      canvas.width = canvas.clientWidth || 800;
      canvas.height = canvas.clientHeight || 600;

      const startTime = performance.now();

      addLog(`Loading ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');

      // Dynamic imports to avoid SSR issues
      addLog('Initializing Win32 runtime…', 'info');
      const { WebGPUContext } = await import('@/lib/nacho/gpu/webgpu');
      const { WindowsRuntime } = await import('@/lib/nacho/windows/runtime');

      const gpu = new WebGPUContext(canvas);
      try {
        await gpu.initialize();
        addLog('WebGPU initialized', 'success');
      } catch (e: any) {
        addLog(`WebGPU not available, using Canvas 2D fallback`, 'warn');
      }

      const runtime = new WindowsRuntime(gpu);
      runtime.setCanvas(canvas);
      runtimeRef.current = runtime;

      addLog('Booting Win32 subsystem…', 'info');
      await runtime.boot();
      addLog('Kernel32 + User32 + GDI loaded', 'success');

      // Read the file and load PE
      addLog('Parsing PE headers…', 'info');
      const buffer = await file.arrayBuffer();
      await runtime.loadPE(buffer);

      const elapsed = performance.now() - startTime;
      setElapsed(elapsed);
      addLog(`Executable loaded in ${elapsed.toFixed(0)}ms`, 'success');
      setState('running');
    } catch (e: any) {
      const msg = e?.message || 'Failed to run EXE';
      setError(msg);
      setState('error');
      addLog(`Error: ${msg}`, 'error');
    }
  }, [addLog]);

  /* ─── File handler ─── */
  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.exe')) {
      setError('Only .exe files are supported');
      return;
    }
    void runEXE(file);
  }, [runEXE]);

  /* ─── Drag and drop ─── */
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const onEnter = (e: DragEvent) => { prevent(e); setIsDragging(true); };
    const onLeave = (e: DragEvent) => { prevent(e); setIsDragging(false); };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) handleFile(file);
    };

    el.addEventListener('dragenter', onEnter);
    el.addEventListener('dragover', prevent);
    el.addEventListener('dragleave', onLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragenter', onEnter);
      el.removeEventListener('dragover', prevent);
      el.removeEventListener('dragleave', onLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [handleFile]);

  useEffect(() => {
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = state === 'loading' || state === 'running';

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
            Drop an EXE to decode and run it with the Win32 emulation layer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isActive && (
            <Button onClick={stop} className="border-rose-500/20 text-rose-300">
              <span className="material-symbols-outlined mr-1.5 text-[16px]">stop</span>
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mt-6 rounded-md border border-rose-500/20 px-4 py-3 text-sm text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300 ml-3">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* ── Metrics bar ── */}
      {isActive && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ocean-muted">
          {fileName && (
            <span>
              File: <span className="text-ocean-primary font-medium">{fileName}</span>
            </span>
          )}
          {fileSize > 0 && (
            <span>
              Size: <span className="text-ocean-primary font-medium">{(fileSize / 1024).toFixed(1)} KB</span>
            </span>
          )}
          <span>
            Runtime: <span className="text-blue-400 font-medium">NTR (x86 → WASM)</span>
          </span>
          {elapsed !== null && (
            <span>
              Load: <span className="text-ocean-primary font-medium">{elapsed.toFixed(0)}ms</span>
            </span>
          )}
          <span>
            Status:{' '}
            <span className={state === 'running' ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
              {state === 'loading' ? 'Initializing…' : 'Running'}
            </span>
          </span>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_0.4fr] gap-4">
        {/* Canvas / Drop Zone */}
        <div className="overflow-hidden rounded-md border border-ocean-border bg-black" ref={dropRef}>
          {!isActive ? (
            /* Drop zone */
            <div
              className={`flex flex-col items-center justify-center h-[70vh] transition-colors ${
                isDragging ? 'bg-blue-500/5 border-blue-500/20' : 'bg-ocean-bg'
              }`}
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/15 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl text-blue-400">laptop_windows</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ocean-primary">
                    {isDragging ? 'Drop EXE here' : 'Drop an EXE file to run'}
                  </p>
                  <p className="text-xs text-ocean-muted">
                    The PE binary is decoded and executed through the Win32 emulation layer
                  </p>
                </div>
                <label className="inline-flex">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".exe"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.currentTarget.value = '';
                    }}
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <span className="material-symbols-outlined mr-1.5 text-[16px]">upload_file</span>
                    Choose EXE
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            /* Running canvas */
            <>
              <div className="flex items-center justify-between border-b border-ocean-border bg-ocean-bg px-4 py-2">
                <div className="flex items-center gap-2 text-xs text-ocean-muted">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      state === 'running' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <span>{state === 'loading' ? 'Loading…' : 'Running'}</span>
                  {fileName && <span className="text-ocean-secondary">· {fileName}</span>}
                </div>
                <div className="text-[11px] text-ocean-muted font-mono">NTR Engine</div>
              </div>
              <canvas ref={canvasRef} className="h-[70vh] w-full bg-black" />
            </>
          )}
        </div>

        {/* Log panel */}
        <div className="overflow-hidden rounded-md border border-ocean-border bg-ocean-bg flex flex-col">
          <div className="flex items-center justify-between border-b border-ocean-border px-4 py-2">
            <span className="text-xs text-ocean-muted font-medium">Log</span>
            <span className="text-[10px] text-ocean-muted font-mono">{logs.length}</span>
          </div>
          <div className="flex-1 h-[70vh] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-0.5">
            {logs.length === 0 ? (
              <div className="text-ocean-muted">Drop an EXE to begin…</div>
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

      {/* ── How it works ── */}
      {!isActive && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            icon="code"
            title="Parse PE"
            description="PE headers and sections are extracted, imports resolved against Win32 API shims."
          />
          <InfoCard
            icon="memory"
            title="Decode x86"
            description="x86 instructions are decoded and interpreted through the NTR engine cycle."
          />
          <InfoCard
            icon="display_settings"
            title="Render"
            description="GDI/DirectX calls are translated to WebGPU for hardware-accelerated display."
          />
        </div>
      )}
    </main>
  );
}

function InfoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-md border border-ocean-border p-5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-blue-400">{icon}</span>
        <h3 className="text-sm font-medium text-ocean-primary">{title}</h3>
      </div>
      <p className="text-xs text-ocean-secondary leading-relaxed">{description}</p>
    </div>
  );
}
