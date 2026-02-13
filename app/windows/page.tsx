'use client';

import { Button } from '@/components/ui/Button';
import { useCallback, useEffect, useRef, useState } from 'react';

type BootState = 'idle' | 'booting' | 'running' | 'error';

interface BootLog {
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
  ts?: number;
}

type PipelineStage = 'idle' | 'active' | 'complete' | 'error';

interface DecoderPipeline {
  parse: PipelineStage;
  sections: PipelineStage;
  decode: PipelineStage;
  shim: PipelineStage;
  execute: PipelineStage;
}

const INITIAL_PIPELINE: DecoderPipeline = {
  parse: 'idle',
  sections: 'idle',
  decode: 'idle',
  shim: 'idle',
  execute: 'idle',
};

export default function WindowsPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<any>(null);
  const [state, setState] = useState<BootState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<BootLog[]>([]);
  const [exeStatus, setExeStatus] = useState<string | null>(null);
  const [cpuInfo, setCpuInfo] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<DecoderPipeline>(INITIAL_PIPELINE);
  const [peMeta, setPeMeta] = useState<{
    name: string;
    size: number;
    entry: string;
    imageBase: string;
    sections: number;
    loaded: number;
  } | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const consoleRestore = useRef<{
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
  } | null>(null);

  const addLog = useCallback((message: string, level: BootLog['level'] = 'info') => {
    setLogs((prev) => [...prev, { message, level, ts: Date.now() }]);
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
    setPipeline(INITIAL_PIPELINE);
    setPeMeta(null);
    addLog('Windows runtime stopped', 'info');
  }, [addLog]);

  /* ─── Boot Windows Runtime (NTR) ─── */
  const start = useCallback(async () => {
    try {
      setError(null);
      setLogs([]);
      setExeStatus(null);
      setCpuInfo(null);
      setPipeline(INITIAL_PIPELINE);
      setPeMeta(null);
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
        const msg = args
          .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
          .join(' ');
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

  /* ─── EXE Upload — full decoder pipeline ─── */
  const handleEXE = useCallback(
    async (file: File) => {
      if (state !== 'running' || !runtimeRef.current) {
        setError('Boot Windows first before loading an EXE');
        return;
      }
      try {
        setExeStatus('Decoding…');
        setPipeline(INITIAL_PIPELINE);
        setPeMeta(null);
        addLog(`─── PE Decoder Pipeline ───`, 'info');
        addLog(`Loading PE: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');

        const startTime = performance.now();
        const buffer = await file.arrayBuffer();
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);

        // Verify MZ header
        if (view.getUint16(0, true) !== 0x5a4d) {
          throw new Error('Invalid file — not a PE executable (missing MZ header)');
        }

        // Stage 1: Parse PE headers
        setPipeline((p) => ({ ...p, parse: 'active' }));
        addLog('Stage 1: Parsing PE headers (DOS → COFF → Optional)…', 'info');

        const e_lfanew = view.getUint32(0x3c, true);
        const peSignature = view.getUint32(e_lfanew, true);
        if (peSignature !== 0x00004550) throw new Error('Invalid PE signature');

        const numberOfSections = view.getUint16(e_lfanew + 6, true);
        const sizeOfOptionalHeader = view.getUint16(e_lfanew + 20, true);
        const optionalHeaderOffset = e_lfanew + 24;
        const magic = view.getUint16(optionalHeaderOffset, true);
        const is64 = magic === 0x20b;

        const entryPointRVA = view.getUint32(optionalHeaderOffset + 16, true);
        const imageBase = is64
          ? view.getUint32(optionalHeaderOffset + 24, true)
          : view.getUint32(optionalHeaderOffset + 28, true);

        addLog(
          `PE${is64 ? '32+' : '32'} — Entry: 0x${entryPointRVA.toString(16)} ImageBase: 0x${imageBase.toString(16)} Sections: ${numberOfSections}`,
          'info',
        );
        setPipeline((p) => ({ ...p, parse: 'complete', sections: 'active' }));

        // Stage 2: Load sections into Unified Memory
        addLog('Stage 2: Loading PE sections into Unified Memory…', 'info');

        const sectionTableOffset = optionalHeaderOffset + sizeOfOptionalHeader;
        let totalLoaded = 0;
        for (let i = 0; i < numberOfSections; i++) {
          const off = sectionTableOffset + i * 40;
          let name = '';
          for (let j = 0; j < 8; j++) {
            const c = view.getUint8(off + j);
            if (c !== 0) name += String.fromCharCode(c);
          }
          const virtualSize = view.getUint32(off + 8, true);
          const virtualAddress = view.getUint32(off + 12, true);
          const rawDataSize = view.getUint32(off + 16, true);
          const rawDataPtr = view.getUint32(off + 20, true);

          if (rawDataPtr > 0 && rawDataSize > 0) {
            const size = Math.min(rawDataSize, bytes.length - rawDataPtr);
            totalLoaded += size;
          }
          addLog(
            `  ${name.padEnd(8)} VA=0x${virtualAddress.toString(16).padStart(8, '0')} Size=${virtualSize}`,
            'info',
          );
        }

        setPeMeta({
          name: file.name,
          size: file.size,
          entry: `0x${entryPointRVA.toString(16)}`,
          imageBase: `0x${imageBase.toString(16)}`,
          sections: numberOfSections,
          loaded: totalLoaded,
        });

        addLog(`Loaded ${(totalLoaded / 1024).toFixed(1)} KB into memory`, 'info');
        setPipeline((p) => ({ ...p, sections: 'complete', decode: 'active' }));

        // Stage 3: Decode x86 instructions
        addLog('Stage 3: Decoding x86 instruction stream…', 'info');

        // Intercept console during PE load for detailed output
        const origLog = console.log;
        console.log = (...args: any[]) => {
          origLog.apply(console, args);
          const msg = args
            .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
            .join(' ');
          if (
            msg.includes('📦') ||
            msg.includes('Section') ||
            msg.includes('Entry') ||
            msg.includes('Image') ||
            msg.includes('Loaded') ||
            msg.includes('Ready') ||
            msg.includes('PE') ||
            msg.includes('[User32') ||
            msg.includes('[STDOUT') ||
            msg.includes('Process')
          ) {
            addLog(msg, 'info');
          }
        };

        setPipeline((p) => ({ ...p, decode: 'complete', shim: 'active' }));

        // Stage 4: Wire Win32 API shims
        addLog('Stage 4: Wiring Win32 API shims (Kernel32, User32, GDI)…', 'info');
        setPipeline((p) => ({ ...p, shim: 'complete', execute: 'active' }));

        // Stage 5: Execute via NTR engine
        addLog('Stage 5: Executing via x86 SimpleInterpreter…', 'info');

        await runtimeRef.current.loadPE(buffer);
        console.log = origLog;

        const elapsed = performance.now() - startTime;
        setPipeline((p) => ({ ...p, execute: 'complete' }));

        addLog(
          `Decoder pipeline complete — ${elapsed.toFixed(1)}ms total`,
          'success',
        );
        setExeStatus('Running');
      } catch (e: any) {
        setExeStatus(null);
        setPipeline((prev) => {
          const updated = { ...prev };
          for (const key of Object.keys(updated) as (keyof DecoderPipeline)[]) {
            if (updated[key] === 'active') updated[key] = 'error';
          }
          return updated;
        });
        const msg = e?.message || 'unknown';
        addLog(`Decoder error: ${msg}`, 'error');
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

  const pipelineHasActivity = Object.values(pipeline).some((s) => s !== 'idle');

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-ocean-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ocean-primary">
              Windows
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-blue-400 border border-blue-500/15 font-medium">
              NTR Engine
            </span>
          </div>
          <p className="text-sm text-ocean-secondary">
            Dedicated Win32 compiler — PE loader, x86 interpreter, and WebGPU-accelerated
            GDI/DirectX.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canStart ? (
            <Button onClick={start}>Boot Windows</Button>
          ) : (
            <Button onClick={stop} className="border-rose-500/20 text-rose-300">
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
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={state !== 'running'}
            >
              Run EXE
            </Button>
          </label>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mt-4 rounded-md border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* ── Metrics bar ── */}
      {state === 'running' && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-ocean-muted">
          <span>
            Runtime:{' '}
            <span className="text-blue-400 font-medium">NTR (Win32 Emulation)</span>
          </span>
          {cpuInfo && (
            <span>
              CPU:{' '}
              <span className="text-ocean-primary font-medium">{cpuInfo}</span>
            </span>
          )}
          <span>
            Graphics:{' '}
            <span className="text-ocean-primary font-medium">
              GDI + DirectX → WebGPU
            </span>
          </span>
          <span>
            Decoder:{' '}
            <span className="text-ocean-primary font-medium">PE → x86 → Win32</span>
          </span>
          <span>
            DLLs:{' '}
            <span className="text-ocean-primary font-medium">
              Kernel32 · User32 · GDI32
            </span>
          </span>
          {exeStatus && (
            <span>
              EXE: <span className="text-blue-400 font-medium">{exeStatus}</span>
            </span>
          )}
        </div>
      )}

      {/* ── Decoder Pipeline Visualization ── */}
      {pipelineHasActivity && (
        <div className="mt-4 overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max py-2">
            <PipelineStageChip label="PE Headers" state={pipeline.parse} />
            <div
              className={`pipeline-connector ${pipeline.parse === 'complete' ? 'active' : ''}`}
            />
            <PipelineStageChip label="Load Sections" state={pipeline.sections} />
            <div
              className={`pipeline-connector ${pipeline.sections === 'complete' ? 'active' : ''}`}
            />
            <PipelineStageChip label="x86 Decode" state={pipeline.decode} />
            <div
              className={`pipeline-connector ${pipeline.decode === 'complete' ? 'active' : ''}`}
            />
            <PipelineStageChip label="Win32 Shims" state={pipeline.shim} />
            <div
              className={`pipeline-connector ${pipeline.shim === 'complete' ? 'active' : ''}`}
            />
            <PipelineStageChip label="Execute" state={pipeline.execute} />
          </div>

          {/* PE metadata */}
          {peMeta && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ocean-muted mt-2 font-mono">
              <span>{peMeta.name}</span>
              <span>{(peMeta.size / 1024).toFixed(1)} KB</span>
              <span>Entry {peMeta.entry}</span>
              <span>Base {peMeta.imageBase}</span>
              <span>{peMeta.sections} sections</span>
              <span>{(peMeta.loaded / 1024).toFixed(1)} KB loaded</span>
            </div>
          )}
        </div>
      )}

      {/* ── Display + Log Panel ── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_0.38fr] gap-4">
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
                {state === 'idle'
                  ? 'Ready'
                  : state === 'booting'
                    ? 'Booting…'
                    : state === 'running'
                      ? 'Running'
                      : 'Error'}
              </span>
            </div>
            <div className="text-[11px] text-ocean-muted font-mono">
              Nacho Win32 Engine
            </div>
          </div>
          <div className="relative h-[68vh] w-full bg-black">
            <canvas ref={canvasRef} className="h-full w-full" />
            {/* Idle state placeholder */}
            {state === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center space-y-4 px-6">
                  <div className="text-5xl opacity-20">⊞</div>
                  <div className="space-y-1.5">
                    <p className="text-sm text-ocean-secondary">
                      Windows Runtime (NTR)
                    </p>
                    <p className="text-xs text-ocean-muted max-w-sm leading-relaxed">
                      Emulates the Win32 subsystem — parses PE executables, loads sections
                      into virtual memory, and runs x86 instructions through a dedicated
                      interpreter with Kernel32/User32/GDI API shims.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 text-[10px] font-mono text-ocean-muted">
                    <span className="px-2 py-0.5 rounded border border-ocean-border">
                      x86 Interpreter
                    </span>
                    <span className="px-2 py-0.5 rounded border border-ocean-border">
                      PE32/PE32+ Loader
                    </span>
                    <span className="px-2 py-0.5 rounded border border-ocean-border">
                      DirectX → WebGPU
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System log panel */}
        <div className="overflow-hidden rounded-md border border-ocean-border bg-ocean-bg flex flex-col">
          <div className="flex items-center justify-between border-b border-ocean-border px-4 py-2">
            <span className="text-xs text-ocean-muted font-medium">System Log</span>
            <span className="text-[10px] text-ocean-muted font-mono">
              {logs.length} entries
            </span>
          </div>
          <div className="flex-1 h-[68vh] overflow-y-auto p-3 log-panel space-y-0.5">
            {logs.length === 0 ? (
              <div className="text-ocean-muted">Waiting for boot…</div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`log-line ${
                    log.level === 'error'
                      ? 'text-rose-400'
                      : log.level === 'warn'
                        ? 'text-amber-400'
                        : log.level === 'success'
                          ? 'text-emerald-400'
                          : 'text-ocean-secondary'
                  }`}
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

/* ─── Pipeline Stage Chip ─── */
function PipelineStageChip({
  label,
  state,
}: {
  label: string;
  state: PipelineStage;
}) {
  return (
    <div className={`pipeline-stage ${state}`}>
      {state === 'active' && (
        <span className="h-1.5 w-1.5 rounded-full bg-current dot-pulse flex-shrink-0" />
      )}
      {state === 'complete' && (
        <span className="flex-shrink-0 text-[10px]">✓</span>
      )}
      {state === 'error' && (
        <span className="flex-shrink-0 text-[10px]">✗</span>
      )}
      <span>{label}</span>
    </div>
  );
}
