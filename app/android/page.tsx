'use client';

import { Button } from '@/components/ui/Button';
import { useCallback, useEffect, useRef, useState } from 'react';

type RunState = 'idle' | 'loading' | 'running' | 'error';

interface LogEntry {
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export default function AndroidPage() {
  const displayRef = useRef<HTMLDivElement | null>(null);
  const bootManagerRef = useRef<any>(null);
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

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const stop = useCallback(async () => {
    try {
      await bootManagerRef.current?.shutdown?.();
    } catch { /* ignore */ }
    bootManagerRef.current = null;
    setState('idle');
    setFileName(null);
    setFileSize(0);
    setElapsed(null);
    addLog('Runtime stopped', 'info');
  }, [addLog]);

  const runAPK = useCallback(async (file: File) => {
    try {
      setError(null);
      setLogs([]);
      setElapsed(null);
      setFileName(file.name);
      setFileSize(file.size);
      setState('loading');

      const startTime = performance.now();
      addLog(`Loading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');

      // Wait a tick for React to render the display surface
      await new Promise((r) => requestAnimationFrame(r));

      const display = displayRef.current;
      if (!display) throw new Error('Display container unavailable');
      display.innerHTML = '';

      const { APKLoader } = await import('@/lib/engine/loaders/apk-loader');
      const loader = new APKLoader();

      loader.onStatusUpdate = (status, detail) => {
        addLog(`${status}${detail ? ' — ' + detail : ''}`, 'info');
      };

      const url = URL.createObjectURL(file);
      addLog('Initializing Android framework…', 'info');
      await loader.load(display, url);

      const ms = performance.now() - startTime;
      setElapsed(ms);
      addLog(`APK launched in ${ms.toFixed(0)}ms`, 'success');
      setState('running');
    } catch (e: any) {
      const msg = e?.message || 'Failed to run APK';
      setError(msg);
      setState('error');
      addLog(`Error: ${msg}`, 'error');
    }
  }, [addLog]);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.apk')) {
      setError('Only .apk files are supported');
      return;
    }
    void runAPK(file);
  }, [runAPK]);

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
      {/* Header */}
      <div className="flex items-end justify-between gap-6 border-b border-ocean-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ocean-primary">Android</h1>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-teal-400 border border-teal-500/15">
              ART Runtime
            </span>
          </div>
          <p className="text-sm text-ocean-secondary">
            Drop an APK to decode and run it with the Android framework stack.
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

      {error && (
        <div className="mt-6 rounded-md border border-rose-500/20 px-4 py-3 text-sm text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300 ml-3">✕</button>
        </div>
      )}

      {isActive && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ocean-muted">
          {fileName && <span>File: <span className="text-ocean-primary font-medium">{fileName}</span></span>}
          {fileSize > 0 && <span>Size: <span className="text-ocean-primary font-medium">{(fileSize / 1024 / 1024).toFixed(2)} MB</span></span>}
          <span>Runtime: <span className="text-teal-400 font-medium">ART + WebGPU</span></span>
          {elapsed !== null && <span>Load: <span className="text-ocean-primary font-medium">{elapsed.toFixed(0)}ms</span></span>}
          <span>Status: <span className={state === 'running' ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>{state === 'loading' ? 'Initializing…' : 'Running'}</span></span>
        </div>
      )}

      {/* Main content */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_0.4fr] gap-4">
        {/* Display area (always mounted) */}
        <div className="overflow-hidden rounded-md border border-ocean-border bg-black relative" ref={dropRef}>
          {/* Status bar — visible when active */}
          {isActive && (
            <div className="flex items-center justify-between border-b border-ocean-border bg-ocean-bg px-4 py-2">
              <div className="flex items-center gap-2 text-xs text-ocean-muted">
                <span className={`h-1.5 w-1.5 rounded-full ${state === 'running' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <span>{state === 'loading' ? 'Loading…' : 'Running'}</span>
                {fileName && <span className="text-ocean-secondary">· {fileName}</span>}
              </div>
              <div className="text-[11px] text-ocean-muted font-mono">ART Runtime</div>
            </div>
          )}

          {/* Display surface — always in DOM so ref is available */}
          <div ref={displayRef} className={`w-full bg-black ${isActive ? 'h-[70vh]' : 'h-0 overflow-hidden'}`} />

          {/* Drop zone overlay — visible when idle */}
          {!isActive && (
            <div className={`flex flex-col items-center justify-center h-[70vh] transition-colors ${isDragging ? 'bg-teal-500/5' : 'bg-ocean-bg'}`}>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/15 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl text-teal-400">android</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ocean-primary">{isDragging ? 'Drop APK here' : 'Drop an APK file to run'}</p>
                  <p className="text-xs text-ocean-muted">The APK is decoded and executed through the Android framework stack</p>
                </div>
                <label className="inline-flex">
                  <input ref={fileInputRef} type="file" accept=".apk" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <span className="material-symbols-outlined mr-1.5 text-[16px]">upload_file</span>
                    Choose APK
                  </Button>
                </label>
              </div>
            </div>
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
              <div className="text-ocean-muted">Drop an APK to begin…</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={log.level === 'error' ? 'text-rose-400' : log.level === 'warn' ? 'text-amber-400' : log.level === 'success' ? 'text-emerald-400' : 'text-ocean-secondary'}>
                  {log.message}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {!isActive && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard icon="unarchive" title="Decode" description="APK is extracted and DEX bytecode is parsed through the ART runtime." />
          <InfoCard icon="bolt" title="Compile" description="Dalvik opcodes are JIT-compiled to WASM for near-native execution speed." />
          <InfoCard icon="display_settings" title="Render" description="Android framework + SurfaceFlinger composit UI through WebGPU." />
        </div>
      )}
    </main>
  );
}

function InfoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-md border border-ocean-border p-5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-teal-400">{icon}</span>
        <h3 className="text-sm font-medium text-ocean-primary">{title}</h3>
      </div>
      <p className="text-xs text-ocean-secondary leading-relaxed">{description}</p>
    </div>
  );
}
