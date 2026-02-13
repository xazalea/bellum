'use client';

import { Button } from '@/components/ui/Button';
import { OptimizedV86 } from '@/lib/emulators/optimized-v86';
import { useEffect, useMemo, useRef, useState } from 'react';

type BootState = 'idle' | 'booting' | 'running' | 'error';

export default function AndroidPage() {
  const screenRef = useRef<HTMLDivElement | null>(null);
  const emulatorRef = useRef<OptimizedV86 | null>(null);
  const [state, setState] = useState<BootState>('idle');
  const [error, setError] = useState<string | null>(null);

  const canStart = state === 'idle' || state === 'error';

  const statusText = useMemo(() => {
    if (state === 'idle') return 'Ready';
    if (state === 'booting') return 'Booting Android…';
    if (state === 'running') return 'Running';
    return 'Error';
  }, [state]);

  const stop = () => {
    try {
      const emu = emulatorRef.current?.getEmulator?.();
      emu?.stop?.();
    } catch {
      // ignore
    } finally {
      emulatorRef.current = null;
      setState('idle');
    }
  };

  const start = async () => {
    try {
      setError(null);
      setState('booting');
      if (!screenRef.current) throw new Error('missing_screen_container');

      screenRef.current.innerHTML = '';

      const isoUrl = '/api/isos/android-x86-9.0-r2';

      const optimized = await OptimizedV86.create({
        wasm_path: '/v86/v86.wasm',
        screen_container: screenRef.current,
        memory_size: 1024 * 1024 * 1024,
        vga_memory_size: 16 * 1024 * 1024,
        bios: { url: '/v86/bios/seabios.bin' },
        vga_bios: { url: '/v86/bios/vgabios.bin' },
        cdrom: { url: isoUrl },
        autostart: true,
      });
      emulatorRef.current = optimized;
      setState('running');
    } catch (e: any) {
      setError(e?.message || 'boot_failed');
      setState('error');
    }
  };

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="flex items-end justify-between gap-6 border-b border-ocean-border pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ocean-primary">Android</h1>
          <p className="text-sm text-ocean-secondary">Android OS in the browser.</p>
        </div>

        <div className="flex items-center gap-2">
          {canStart ? (
            <Button onClick={start}>
              <span className="material-symbols-outlined mr-1.5 text-[16px]">play_arrow</span>
              Start
            </Button>
          ) : (
            <Button onClick={stop} className="border-rose-500/20 text-rose-300">
              <span className="material-symbols-outlined mr-1.5 text-[16px]">stop</span>
              Stop
            </Button>
          )}

          <Button onClick={() => (window.location.href = '/library')} variant="outline">
            <span className="material-symbols-outlined mr-1.5 text-[16px]">bolt</span>
            Run APK
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-md border border-rose-500/20 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-md border border-ocean-border bg-black">
        <div className="flex items-center justify-between border-b border-ocean-border bg-ocean-bg px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-ocean-muted">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                state === 'running' ? 'bg-emerald-400' : state === 'booting' ? 'bg-amber-400' : 'bg-slate-500'
              }`}
            />
            <span>{statusText}</span>
          </div>
          <div className="text-[11px] text-ocean-muted">v86</div>
        </div>

        <div ref={screenRef} className="h-[70vh] w-full" />
      </div>
    </main>
  );
}
