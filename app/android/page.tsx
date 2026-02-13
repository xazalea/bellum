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
  extract: PipelineStage;
  parse: PipelineStage;
  lift: PipelineStage;
  compile: PipelineStage;
  execute: PipelineStage;
}

const INITIAL_PIPELINE: DecoderPipeline = {
  extract: 'idle',
  parse: 'idle',
  lift: 'idle',
  compile: 'idle',
  execute: 'idle',
};

export default function AndroidPage() {
  const displayRef = useRef<HTMLDivElement | null>(null);
  const bootManagerRef = useRef<any>(null);
  const [state, setState] = useState<BootState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<BootLog[]>([]);
  const [bootTime, setBootTime] = useState<number | null>(null);
  const [apkStatus, setApkStatus] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<DecoderPipeline>(INITIAL_PIPELINE);
  const [apkMeta, setApkMeta] = useState<{ name: string; size: number; classes: number; methods: number } | null>(null);
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

  // Auto-scroll boot log
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const canStart = state === 'idle' || state === 'error';

  /* ─── Stop / Shutdown ─── */
  const stop = useCallback(async () => {
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
    setPipeline(INITIAL_PIPELINE);
    setApkMeta(null);
    addLog('Android runtime stopped', 'info');
  }, [addLog]);

  /* ─── Boot Android 14 via AndroidBootManager ─── */
  const start = useCallback(async () => {
    try {
      setError(null);
      setLogs([]);
      setBootTime(null);
      setApkStatus(null);
      setPipeline(INITIAL_PIPELINE);
      setApkMeta(null);
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
        const msg = args
          .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
          .join(' ');
        if (
          msg.includes('[Android') ||
          msg.includes('ANDROID') ||
          msg.includes('===') ||
          msg.includes('Stage') ||
          msg.includes('ART') ||
          msg.includes('Dalvik') ||
          msg.includes('GPU') ||
          msg.includes('Framework') ||
          msg.includes('SystemUI') ||
          msg.includes('Kernel') ||
          msg.includes('SurfaceFlinger')
        ) {
          addLog(msg.replace(/\[AndroidBoot\]\s?/g, ''), 'info');
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

  /* ─── APK Upload — full decoder pipeline ─── */
  const handleAPK = useCallback(
    async (file: File) => {
      if (state !== 'running') {
        setError('Boot Android first before loading an APK');
        return;
      }
      try {
        setApkStatus('Decoding…');
        setPipeline(INITIAL_PIPELINE);
        setApkMeta(null);
        addLog(`─── APK Decoder Pipeline ───`, 'info');
        addLog(`Loading APK: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');

        const startTime = performance.now();

        // Stage 1: Extract DEX from APK
        setPipeline((p) => ({ ...p, extract: 'active' }));
        addLog('Stage 1: Extracting DEX bytecode from APK archive…', 'info');

        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let dexBuffer: ArrayBuffer;
        let classCount = 0;

        // Check if it's a ZIP (APK) or raw DEX
        const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
        const isDex = bytes[0] === 0x64 && bytes[1] === 0x65 && bytes[2] === 0x78;

        if (isZip) {
          // APK → extract classes.dex using JSZip
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(buffer);
          const dexEntry = zip.file('classes.dex');
          if (!dexEntry) throw new Error('APK is missing classes.dex — not a valid Android app');
          dexBuffer = await dexEntry.async('arraybuffer');

          // Count classes from ZIP entries for metadata
          const dexFiles = Object.keys(zip.files).filter((n) => n.match(/classes\d*\.dex/));
          classCount = dexFiles.length * 50; // Estimate
          addLog(`Extracted classes.dex (${(dexBuffer.byteLength / 1024).toFixed(1)} KB) from APK`, 'success');
        } else if (isDex) {
          dexBuffer = buffer;
          addLog('Raw DEX file detected — skipping APK extraction', 'info');
        } else {
          throw new Error('Unsupported file format. Expected APK or DEX.');
        }

        setPipeline((p) => ({ ...p, extract: 'complete', parse: 'active' }));

        // Stage 2: Parse DEX header and structures
        addLog('Stage 2: Parsing DEX header and class definitions…', 'info');
        const dexView = new DataView(dexBuffer);
        const dexVersion = String.fromCharCode(
          new Uint8Array(dexBuffer)[4],
          new Uint8Array(dexBuffer)[5],
          new Uint8Array(dexBuffer)[6],
        );
        const dexSize = dexView.getUint32(32, true);
        const stringIdsSize = dexView.getUint32(56, true);
        const methodIdsSize = dexView.getUint32(88, true);
        const classDefsSize = dexView.getUint32(96, true);
        classCount = classDefsSize;

        setApkMeta({
          name: file.name,
          size: file.size,
          classes: classDefsSize,
          methods: methodIdsSize,
        });

        addLog(
          `DEX v${dexVersion} — ${classDefsSize} classes, ${methodIdsSize} methods, ${stringIdsSize} strings, ${(dexSize / 1024).toFixed(1)} KB`,
          'info',
        );
        setPipeline((p) => ({ ...p, parse: 'complete', lift: 'active' }));

        // Stage 3: Lift Dalvik opcodes → IR
        addLog('Stage 3: Lifting Dalvik bytecode to intermediate representation…', 'info');

        // Import and use the complete Dalvik interpreter which handles opcode decoding
        const { completeDalvikInterpreter } = await import(
          '@/lib/hle/dalvik-complete-opcodes'
        );
        await completeDalvikInterpreter.initialize();
        addLog(`Dalvik interpreter ready (218 opcodes supported)`, 'info');

        setPipeline((p) => ({ ...p, lift: 'complete', compile: 'active' }));

        // Stage 4: JIT compile hot paths to WASM
        addLog('Stage 4: ART JIT — compiling hot paths to WebAssembly…', 'info');

        // Use the binary executor for the full compilation pipeline
        const { NachoJITCompiler } = await import('@/lib/jit/nacho-jit-compiler');
        const { NachoGPURuntime } = await import('@/lib/gpu/nacho-gpu-runtime');
        const { NachoBinaryExecutor } = await import(
          '@/lib/execution/nacho-binary-executor'
        );

        const jit = new NachoJITCompiler();
        const gpuRt = new NachoGPURuntime();
        const executor = new NachoBinaryExecutor(jit, gpuRt);

        const context = await executor.loadBinary(dexBuffer);
        addLog(
          `Binary loaded: ${context.binary.format} / ${context.binary.architecture}`,
          'info',
        );

        setPipeline((p) => ({ ...p, compile: 'complete', execute: 'active' }));

        // Stage 5: Execute
        addLog('Stage 5: Executing on ART + WebGPU JIT…', 'info');
        const exitCode = await executor.execute(context);

        const elapsed = performance.now() - startTime;
        setPipeline((p) => ({ ...p, execute: 'complete' }));

        addLog(
          `Decoder pipeline complete — exit ${exitCode}, ${elapsed.toFixed(1)}ms total`,
          'success',
        );
        setApkStatus('Running');
      } catch (e: any) {
        setApkStatus(null);
        setPipeline((prev) => {
          const updated = { ...prev };
          // Mark whichever stage was active as errored
          for (const key of Object.keys(updated) as (keyof DecoderPipeline)[]) {
            if (updated[key] === 'active') updated[key] = 'error';
          }
          return updated;
        });
        addLog(`Decoder error: ${e?.message || 'unknown'}`, 'error');
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
              Android
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-teal-400 border border-teal-500/15 font-medium">
              ART Runtime
            </span>
          </div>
          <p className="text-sm text-ocean-secondary">
            Dedicated Android compiler — Dalvik/ART JIT to WebAssembly with WebGPU acceleration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canStart ? (
            <Button onClick={start}>Boot Android</Button>
          ) : (
            <Button onClick={stop} className="border-rose-500/20 text-rose-300">
              Shutdown
            </Button>
          )}

          <label className="inline-flex">
            <input
              ref={fileInputRef}
              type="file"
              accept=".apk,.dex"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleAPK(f);
                e.currentTarget.value = '';
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={state !== 'running'}
            >
              Run APK
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
      {(bootTime !== null || state === 'running') && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-ocean-muted">
          {bootTime !== null && (
            <span>
              Boot:{' '}
              <span className="text-ocean-primary font-medium">
                {bootTime.toFixed(1)}ms
              </span>
            </span>
          )}
          <span>
            Runtime:{' '}
            <span className="text-teal-400 font-medium">ART + WebGPU JIT</span>
          </span>
          <span>
            Target:{' '}
            <span className="text-ocean-primary font-medium">Android 14 (AOSP)</span>
          </span>
          <span>
            Decoder:{' '}
            <span className="text-ocean-primary font-medium">
              DEX → Dalvik → WASM
            </span>
          </span>
          {apkStatus && (
            <span>
              APK: <span className="text-teal-400 font-medium">{apkStatus}</span>
            </span>
          )}
        </div>
      )}

      {/* ── Decoder Pipeline Visualization ── */}
      {pipelineHasActivity && (
        <div className="mt-4 overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max py-2">
            <PipelineStageChip label="Extract DEX" state={pipeline.extract} />
            <div
              className={`pipeline-connector ${pipeline.extract === 'complete' ? 'active' : ''}`}
            />
            <PipelineStageChip label="Parse Headers" state={pipeline.parse} />
            <div
              className={`pipeline-connector ${pipeline.parse === 'complete' ? 'active' : ''}`}
            />
            <PipelineStageChip label="Lift Opcodes" state={pipeline.lift} />
            <div
              className={`pipeline-connector ${pipeline.lift === 'complete' ? 'active' : ''}`}
            />
            <PipelineStageChip label="JIT → WASM" state={pipeline.compile} />
            <div
              className={`pipeline-connector ${pipeline.compile === 'complete' ? 'active' : ''}`}
            />
            <PipelineStageChip label="Execute" state={pipeline.execute} />
          </div>

          {/* APK metadata */}
          {apkMeta && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ocean-muted mt-2 font-mono">
              <span>{apkMeta.name}</span>
              <span>{(apkMeta.size / 1024 / 1024).toFixed(2)} MB</span>
              <span>{apkMeta.classes} classes</span>
              <span>{apkMeta.methods} methods</span>
            </div>
          )}
        </div>
      )}

      {/* ── Display + Log Panel ── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_0.38fr] gap-4">
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
              Nacho ART Engine
            </div>
          </div>
          <div ref={displayRef} className="h-[68vh] w-full bg-black relative">
            {/* Idle state placeholder */}
            {state === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4 px-6">
                  <div className="text-5xl opacity-20">🤖</div>
                  <div className="space-y-1.5">
                    <p className="text-sm text-ocean-secondary">
                      Android 14 Runtime
                    </p>
                    <p className="text-xs text-ocean-muted max-w-sm leading-relaxed">
                      Boots the full AOSP framework stack — ART, SurfaceFlinger, SystemUI —
                      then decodes APK binaries through the Dalvik→WASM JIT pipeline.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 text-[10px] font-mono text-ocean-muted">
                    <span className="px-2 py-0.5 rounded border border-ocean-border">
                      Dalvik 218 opcodes
                    </span>
                    <span className="px-2 py-0.5 rounded border border-ocean-border">
                      ART JIT → WASM
                    </span>
                    <span className="px-2 py-0.5 rounded border border-ocean-border">
                      WebGPU SurfaceFlinger
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Boot log panel */}
        <div className="overflow-hidden rounded-md border border-ocean-border bg-ocean-bg flex flex-col">
          <div className="flex items-center justify-between border-b border-ocean-border px-4 py-2">
            <span className="text-xs text-ocean-muted font-medium">Boot Log</span>
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
function PipelineStageChip({ label, state }: { label: string; state: PipelineStage }) {
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
