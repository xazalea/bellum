'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { RuntimeManager } from '@/lib/engine/runtime-manager';
import { puterClient } from '@/lib/storage/hiberfile';

type RunState = 'idle' | 'loading' | 'running' | 'error';

export default function AndroidPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<RuntimeManager | null>(null);
  const [state, setState] = useState<RunState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);

  useEffect(() => {
    runtimeRef.current = RuntimeManager.getInstance();
    return () => {
      try {
        runtimeRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const runFile = async (file: File) => {
    try {
      setError(null);
      setState('loading');
      if (!containerRef.current) throw new Error('missing_container');
      if (!runtimeRef.current) throw new Error('runtime_unavailable');

      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `uploads/${Date.now()}/${safeName}`;
      await puterClient.writeFile(path, file, { compress: false });

      const { type, config } = await runtimeRef.current.prepareRuntime(path);
      containerRef.current.innerHTML = '';
      await runtimeRef.current.launch(containerRef.current, type, path, config);

      setActivePath(path);
      setState('running');
    } catch (e: any) {
      setError(e?.message || 'run_failed');
      setState('error');
    }
  };

  const stop = () => {
    try {
      runtimeRef.current?.stop();
    } catch {
      // ignore
    } finally {
      setActivePath(null);
      setState('idle');
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10">
      <div className="flex items-end justify-between gap-6 border-b border-nacho-border pb-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-nacho-primary">Android</h1>
          <p className="text-sm text-nacho-secondary">Android OS in the browser (APK runtime).</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept=".apk"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runFile(f);
                e.currentTarget.value = '';
              }}
            />
            <span className="nacho-btn inline-flex items-center justify-center">
              <span className="material-symbols-outlined mr-2 text-[16px]">upload_file</span>
              Upload APK
            </span>
          </label>

          {state === 'running' && (
            <Button onClick={stop} className="border-rose-500/30 bg-rose-500/10 text-rose-200">
              <span className="material-symbols-outlined mr-2 text-[16px]">stop</span>
              Stop
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-nacho-border bg-black">
        <div className="flex items-center justify-between border-b border-nacho-border bg-nacho-surface px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-nacho-secondary">
            <span
              className={`h-2 w-2 rounded-full ${
                state === 'running' ? 'bg-emerald-400' : state === 'loading' ? 'bg-amber-400' : 'bg-slate-500'
              }`}
            />
            <span>{state === 'idle' ? 'Ready' : state === 'loading' ? 'Loading…' : state === 'running' ? 'Running' : 'Error'}</span>
          </div>
          <div className="text-[11px] text-nacho-muted">{activePath ? activePath.split('/').slice(-1)[0] : 'no app'}</div>
        </div>

        <div ref={containerRef} className="min-h-[70vh] w-full" />
      </div>
    </main>
  );
}
