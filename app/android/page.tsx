'use client';

import { Button } from '@/components/ui/Button';
import { useCallback, useEffect, useRef, useState } from 'react';

type BootState = 'idle' | 'booting' | 'running' | 'error';

interface BootLog {
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export default function AndroidPage() {
  const displayRef = useRef<HTMLDivElement | null>(null);
  const bootManagerRef = useRef<any>(null);
  const [state, setState] = useState<BootState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<BootLog[]>([]);
  const [bootTime, setBootTime] = useState<number | null>(null);
  const [apkStatus, setApkStatus] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const consoleRestore = useRef<{ log: typeof console.log; warn: typeof console.warn; error: typeof console.error } | null>(null);

  const addLog = useCallback((message: string, level: BootLog['level'] = 'info') => {
    setLogs((prev) => [...prev, { message, level }]);
  }, []);

  // Auto-scroll boot log
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const canStart = state === 'idle' || state === 'error';

  /* ─── Stop / Shutdown ─── */
  const stop = useCallback(async () => {
    // Restore console if overridden
    if (consoleRestore.current) {
      console.log = consoleRestore.current.log;
      console.warn = consoleRestore.current.warn;
      console.error = consoleRestore.current.error;
      consoleRestore.current = null;
    }
    try {
      await bootManagerRef.current?.shutdown?.();
    } catch {
      // ignore
    }
    bootManagerRef.current = null;
    setState('idle');
    setApkStatus(null);
    addLog('Android runtime stopped', 'info');
  }, [addLog]);

  /* ─── Boot Android 14 via AndroidBootManager ─── */
  const start = useCallback(async () => {
    try {
      setError(null);
      setLogs([]);
      setBootTime(null);
      setApkStatus(null);
      setState('booting');

      if (!displayRef.current) throw new Error('missing_display_container');
      displayRef.current.innerHTML = '';

      addLog('Importing Android Boot Manager…', 'info');

      // Dynamic import avoids SSR issues with WebGPU / SharedArrayBuffer
      const { androidBootManager } = await import('@/lib/nexus/os/android-boot');
      bootManagerRef.current = androidBootManager;

      // Intercept console to surface boot logs in the UI panel
      const origLog = console.log;
      const origWarn = console.warn;
      const origError = console.error;
      consoleRestore.current = { log: origLog, warn: origWarn, error: origError };

      console.log = (...args: any[]) => {
        origLog.apply(console, args);
        const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        if (msg.includes('[Android') || msg.includes('ANDROID') || msg.includes('===') || msg.includes('Stage') || msg.includes('ART') || msg.includes('Dalvik') || msg.includes('GPU') || msg.includes('Framework') || msg.includes('SystemUI') || msg.includes('Kernel') || msg.includes('SurfaceFlinger')) {
          addLog(msg.replace(/\[AndroidBoot\]\s?/g, ''), 'info');
        }
      };
      console.warn = (...args: any[]) => {
        origWarn.apply(console, args);
        const msg = args.join(' ');
        addLog(msg, 'warn');
      };
      console.error = (...args: any[]) => {
        origError.apply(console, args);
        const msg = args.join(' ');
        addLog(msg, 'error');
      };

      addLog('Booting Android 14…', 'info');
      await androidBootManager.boot(displayRef.current);

      // Restore console
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
      consoleRestore.current = null;

      const status = androidBootManager.getBootStatus();
      setBootTime(status.bootTimeMs);
      addLog(`Boot complete in ${status.bootTimeMs.toFixed(1)}ms`, 'success');
      setState('running');
    } catch (e: any) {
      // Restore console on error
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

  /* ─── APK Upload ─── */
  const handleAPK = useCallback(
    async (file: File) => {
      if (state !== 'running') {
        setError('Boot Android first before loading an APK');
        return;
      }
      try {
        setApkStatus('Loading…');
        addLog(`Loading APK: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');

        const { APKLoader } = await import('@/lib/engine/loaders/apk-loader');
        const loader = new APKLoader();
        loader.onStatusUpdate = (status, detail) => {
          setApkStatus(`${status}${detail ? `: ${detail}` : ''}`);
          addLog(`${status}${detail ? ' — ' + detail : ''}`, 'info');
        };

        if (!displayRef.current) throw new Error('missing_display');

        const url = URL.createObjectURL(file);
        await loader.load(displayRef.current, url);

        setApkStatus('Running');
        addLog('APK launched successfully', 'success');
      } catch (e: any) {
        setApkStatus(null);
        addLog(`APK load failed: ${e?.message || 'unknown'}`, 'error');
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
            <h1 className="text-2xl font-semibold tracking-tight text-ocean-primary">Android</h1>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-teal-400 border border-teal-500/15">
              ART Runtime
            </span>
          </div>
          <p className="text-sm text-ocean-secondary">
            Android 14 with Dalvik/ART JIT compilation and WebGPU acceleration.
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
              accept=".apk"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleAPK(f);
                e.currentTarget.value = '';
              }}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={state !== 'running'}>
              <span className="material-symbols-outlined mr-1.5 text-[16px]">android</span>
              Run APK
            </Button>
          </label>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mt-6 rounded-md border border-rose-500/20 px-4 py-3 text-sm text-rose-300">{error}</div>
      )}

      {/* ── Metrics bar ── */}
      {bootTime !== null && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ocean-muted">
          <span>
            Boot: <span className="text-ocean-primary font-medium">{bootTime.toFixed(1)}ms</span>
          </span>
          <span>
            Runtime: <span className="text-teal-400 font-medium">ART + WebGPU JIT</span>
          </span>
          <span>
            Target: <span className="text-ocean-primary font-medium">Android 14 (AOSP)</span>
          </span>
          {apkStatus && (
            <span>
              APK: <span className="text-teal-400 font-medium">{apkStatus}</span>
            </span>
          )}
        </div>
      )}

      {/* ── Display + Log Panel ── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_0.4fr] gap-4">
        {/* Main display surface */}
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
            <div className="text-[11px] text-ocean-muted font-mono">Nacho ART Engine</div>
          </div>
          <div ref={displayRef} className="h-[70vh] w-full bg-black" />
        </div>

        {/* Boot log panel */}
        <div className="overflow-hidden rounded-md border border-ocean-border bg-ocean-bg flex flex-col">
          <div className="flex items-center justify-between border-b border-ocean-border px-4 py-2">
            <span className="text-xs text-ocean-muted font-medium">Boot Log</span>
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
