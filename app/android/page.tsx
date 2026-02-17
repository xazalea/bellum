'use client';

import { Button } from '@/components/ui/Button';
import { useCallback, useEffect, useRef, useState } from 'react';

type RunState = 'idle' | 'loading' | 'running' | 'error';

interface LogEntry {
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

// Challenger Deep - Matte Dark Blue Theme
type ThemeColors = {
  bg: string;
  surface: string;
  elevated: string;
  accent: string;
  accentBright: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
};

const theme: ThemeColors = {
  bg: '#0a0f1a',
  surface: '#0d1929',
  elevated: '#112240',
  accent: '#1e4976',
  accentBright: '#2d5a8a',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: '#1e3a5f',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
};

export default function AndroidPage() {
  const displayRef = useRef<HTMLDivElement | null>(null);
  const bootManagerRef = useRef<any>(null);
  const [state, setState] = useState<RunState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [perfStats, setPerfStats] = useState<{ fps: number; jitCompiles: number; gpuKernels: number } | null>(null);
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
    setPerfStats(null);
    addLog('Runtime stopped', 'info');
  }, [addLog]);

  const runAPK = useCallback(async (file: File) => {
    try {
      setError(null);
      setLogs([]);
      setElapsed(null);
      setPerfStats(null);
      setFileName(file.name);
      setFileSize(file.size);
      setState('loading');

      const startTime = performance.now();
      addLog(`Loading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');

      // Validate file
      if (file.size < 1024) {
        throw new Error('File too small - may be corrupted');
      }
      if (file.size > 500 * 1024 * 1024) {
        throw new Error('File too large - max 500MB supported');
      }

      // Wait a tick for React to render the display surface
      await new Promise((r) => requestAnimationFrame(r));

      const display = displayRef.current;
      if (!display) throw new Error('Display container unavailable');
      display.innerHTML = '';

      addLog('Initializing ART runtime...', 'info');
      
      // Dynamic import with error handling
      let APKLoader;
      try {
        const module = await import('@/lib/engine/loaders/apk-loader');
        APKLoader = module.APKLoader;
      } catch (importErr: any) {
        console.error('Failed to load APK loader:', importErr);
        throw new Error('Failed to load Android runtime. Please refresh and try again.');
      }
      
      const loader = new APKLoader();

      loader.onStatusUpdate = (status, detail) => {
        addLog(`${status}${detail ? ' - ' + detail : ''}`, 'info');
      };

      // Read file as ArrayBuffer instead of using blob URL
      addLog('Reading APK file...', 'info');
      const arrayBuffer = await file.arrayBuffer();
      addLog('Booting Android framework...', 'info');
      
      // Set a timeout for the loading process
      const loadTimeout = setTimeout(() => {
        addLog('Still loading... Large apps may take a moment', 'warn');
      }, 10000);
      
      // Pass ArrayBuffer directly instead of blob URL
      await loader.loadFromBuffer(display, arrayBuffer, file.name);
      clearTimeout(loadTimeout);

      const ms = performance.now() - startTime;
      setElapsed(ms);
      addLog(`APK launched in ${ms.toFixed(0)}ms`, 'success');
      setState('running');
      
      // Start performance monitoring
      startPerfMonitoring(loader);
    } catch (e: any) {
      const msg = e?.message || 'Failed to run APK';
      console.error('APK load error:', e);
      setError(msg);
      setState('error');
      addLog(`Error: ${msg}`, 'error');
      
      // Auto-reset after error
      setTimeout(() => {
        if (state === 'error') {
          setState('idle');
          setError(null);
        }
      }, 5000);
    }
  }, [addLog, state]);

  const startPerfMonitoring = (loader: any) => {
    const interval = setInterval(() => {
      try {
        const stats = loader.getPerformanceStats?.();
        if (stats) {
          setPerfStats(stats);
        }
      } catch {
        clearInterval(interval);
      }
    }, 1000);
  };

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
    <main className="mx-auto w-full max-w-7xl px-6 py-10" style={{ background: theme.bg }}>
      {/* Header */}
      <div className="flex items-end justify-between gap-6 border-b-2 pb-6" style={{ borderColor: theme.border }}>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-pixel text-lg" style={{ color: theme.text }}>CHALLENGER DEEP</h1>
            <span className="font-pixel text-[8px] px-2 py-1" style={{ color: theme.accentBright, border: `2px solid ${theme.accent}`, background: theme.surface }}>
              ANDROID RUNTIME
            </span>
          </div>
          <p className="font-mono text-sm" style={{ color: theme.textSecondary }}>
            Deepest execution layer on the web — drop an APK to run at unmatched speeds
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Button onClick={stop} style={{ borderColor: `${theme.error}33`, color: theme.error }}>
              <span className="material-symbols-outlined mr-1.5 text-[16px]">stop</span>
              Stop
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-md border px-4 py-3 text-sm flex items-center justify-between" style={{ borderColor: `${theme.error}33`, color: theme.error, background: `${theme.error}11` }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ color: theme.error }} className="hover:opacity-80 ml-3">✕</button>
        </div>
      )}

      {isActive && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs" style={{ color: theme.textMuted }}>
          {fileName && <span>File: <span style={{ color: theme.text }} className="font-medium">{fileName}</span></span>}
          {fileSize > 0 && <span>Size: <span style={{ color: theme.text }} className="font-medium">{(fileSize / 1024 / 1024).toFixed(2)} MB</span></span>}
          <span>Runtime: <span style={{ color: theme.accentBright }} className="font-medium">ART + WebGPU</span></span>
          {elapsed !== null && <span>Load: <span style={{ color: theme.text }} className="font-medium">{elapsed.toFixed(0)}ms</span></span>}
          <span>Status: <span className={state === 'running' ? 'font-medium' : 'font-medium'} style={{ color: state === 'running' ? theme.success : theme.warning }}>{state === 'loading' ? 'Initializing...' : 'Running'}</span></span>
        </div>
      )}

      {/* Performance Stats */}
      {perfStats && isActive && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: theme.textMuted }}>
          <span>FPS: <span style={{ color: theme.success }} className="font-medium">{perfStats.fps}</span></span>
          <span>JIT: <span style={{ color: theme.accentBright }} className="font-medium">{perfStats.jitCompiles}</span></span>
          <span>GPU Kernels: <span style={{ color: theme.accentBright }} className="font-medium">{perfStats.gpuKernels}</span></span>
        </div>
      )}

      {/* Main content */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_0.4fr] gap-4">
        {/* Display area (always mounted) */}
        <div className="overflow-hidden rounded-md border relative" style={{ borderColor: theme.border, background: '#000' }} ref={dropRef}>
          {/* Status bar — visible when active */}
          {isActive && (
            <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: theme.border, background: theme.surface }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.textMuted }}>
                <span className={`h-1.5 w-1.5 rounded-full ${state === 'running' ? 'animate-pulse' : ''}`} style={{ background: state === 'running' ? theme.success : theme.warning }} />
                <span>{state === 'loading' ? 'Loading...' : 'Running'}</span>
                {fileName && <span style={{ color: theme.textSecondary }}>· {fileName}</span>}
              </div>
              <div className="text-[11px] font-mono" style={{ color: theme.textMuted }}>ART Runtime</div>
            </div>
          )}

          {/* Display surface — always in DOM so ref is available */}
          <div ref={displayRef} className={`w-full bg-black ${isActive ? 'h-[70vh]' : 'h-0 overflow-hidden'}`} />

          {/* Drop zone overlay — visible when idle */}
          {!isActive && (
            <div className={`flex flex-col items-center justify-center h-[70vh] transition-colors`} style={{ background: isDragging ? `${theme.accent}11` : theme.surface }}>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: `${theme.accent}22`, border: `1px solid ${theme.accent}44` }}>
                  <span className="material-symbols-outlined text-3xl" style={{ color: theme.accentBright }}>android</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium" style={{ color: theme.text }}>{isDragging ? 'Drop APK here' : 'Drop an APK file to run'}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>The APK is decoded and executed through the Android framework stack</p>
                </div>
                <label className="inline-flex">
                  <input ref={fileInputRef} type="file" accept=".apk" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} style={{ borderColor: theme.accent, color: theme.accentBright }}>
                    <span className="material-symbols-outlined mr-1.5 text-[16px]">upload_file</span>
                    Choose APK
                  </Button>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Log panel */}
        <div className="overflow-hidden rounded-md border flex flex-col" style={{ borderColor: theme.border, background: theme.surface }}>
          <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: theme.border }}>
            <span className="text-xs font-medium" style={{ color: theme.textMuted }}>Log</span>
            <span className="text-[10px] font-mono" style={{ color: theme.textMuted }}>{logs.length}</span>
          </div>
          <div className="flex-1 h-[70vh] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-0.5">
            {logs.length === 0 ? (
              <div style={{ color: theme.textMuted }}>Drop an APK to begin...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ color: log.level === 'error' ? theme.error : log.level === 'warn' ? theme.warning : log.level === 'success' ? theme.success : theme.textSecondary }}>
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
          <InfoCard icon="unarchive" title="Decode" description="APK is extracted and DEX bytecode is parsed through the ART runtime." theme={theme} />
          <InfoCard icon="bolt" title="Compile" description="Dalvik opcodes are JIT-compiled to WASM for near-native execution speed." theme={theme} />
          <InfoCard icon="display_settings" title="Render" description="Android framework + SurfaceFlinger composite UI through WebGPU." theme={theme} />
        </div>
      )}
    </main>
  );
}

function InfoCard({ icon, title, description, theme }: { icon: string; title: string; description: string; theme: ThemeColors }) {
  return (
    <div className="rounded-md border p-5 space-y-2" style={{ borderColor: theme.border, background: theme.surface }}>
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]" style={{ color: theme.accentBright }}>{icon}</span>
        <h3 className="text-sm font-medium" style={{ color: theme.text }}>{title}</h3>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>{description}</p>
    </div>
  );
}