'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Play,
  Pause,
  Camera,
  Maximize2,
  ChevronDown,
  Cpu,
  MemoryStick,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { FPSCounter } from '@/components/benchmark/fps-counter';
import { cn } from '@/lib/utils';

type RunState =
  | 'idle'
  | 'parsing'
  | 'translating'
  | 'compiling'
  | 'loading'
  | 'running'
  | 'paused'
  | 'error';
type BinaryType = 'apk' | 'exe' | 'dex' | 'unknown';

const stageLabels: Record<RunState, string> = {
  idle: '',
  parsing: 'Parsing binary...',
  translating: 'Translating to IR...',
  compiling: 'JIT compiling to WASM...',
  loading: 'Loading runtime...',
  running: 'Running',
  paused: 'Paused',
  error: '',
};

const binaryTypeLabel: Record<BinaryType, string> = {
  apk: 'APK',
  exe: 'EXE',
  dex: 'DEX',
  unknown: 'Unknown',
};

function detectBinaryType(bytes: Uint8Array): BinaryType {
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) return 'exe';
  if (
    bytes[0] === 0x64 &&
    bytes[1] === 0x65 &&
    bytes[2] === 0x78 &&
    bytes[3] === 0x0a
  )
    return 'dex';
  if (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  )
    return 'apk';
  return 'unknown';
}

// Minimal frame-time histogram for the perf panel
function FrameHistogram({ frameTimes }: { frameTimes: number[] }) {
  const buckets = 10;
  const max = Math.max(...frameTimes, 33);
  const counts = Array(buckets).fill(0);
  for (const t of frameTimes) {
    const idx = Math.min(buckets - 1, Math.floor((t / max) * buckets));
    counts[idx]++;
  }
  const maxCount = Math.max(...counts, 1);

  return (
    <div className="flex items-end gap-0.5 h-12 w-full">
      {counts.map((c, i) => (
        <div
          key={i}
          className="flex-1 bg-primary/50 rounded-sm transition-all duration-300"
          style={{ height: `${(c / maxCount) * 100}%` }}
        />
      ))}
    </div>
  );
}

export default function RunPage() {
  const [runState, setRunState] = useState<RunState>('idle');
  const [binaryType, setBinaryType] = useState<BinaryType>('unknown');
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPerfPanel, setShowPerfPanel] = useState(false);
  const [progress, setProgress] = useState(0);
  const [frameTimes, setFrameTimes] = useState<number[]>([16, 17, 16, 18, 17, 16, 20, 16, 17, 16]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number>(0);

  // Simulate canvas drawing when running
  useEffect(() => {
    if (runState !== 'running') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let last = performance.now();

    function draw(now: number) {
      const delta = now - last;
      last = now;

      setFrameTimes((prev) => {
        const next = [...prev, delta];
        if (next.length > 30) next.shift();
        return next;
      });

      if (!canvas || !ctx) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated placeholder grid
      const cols = 8;
      const rows = 5;
      const cw = canvas.width / cols;
      const ch = canvas.height / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const phase = ((frame + r * cols + c) % 60) / 60;
          const alpha = 0.03 + phase * 0.05;
          ctx.fillStyle = `hsla(217,91%,60%,${alpha})`;
          ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.font = `${Math.max(12, canvas.width * 0.018)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(
        `${binaryType.toUpperCase()} runtime active · ${fileName}`,
        canvas.width / 2,
        canvas.height / 2,
      );
      frame++;
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [runState, fileName, binaryType]);

  async function handleFile(file: File) {
    setFileName(file.name);
    setErrorMsg('');
    setProgress(0);

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
    const type = detectBinaryType(bytes);
    setBinaryType(type);

    if (type === 'unknown') {
      setErrorMsg('Unsupported file format. Please upload an APK, EXE, or DEX file.');
      setRunState('error');
      return;
    }

    const stages: Array<[RunState, number, number]> = [
      ['parsing', 15, 400],
      ['translating', 40, 800],
      ['compiling', 70, 1200],
      ['loading', 90, 600],
      ['running', 100, 0],
    ];

    for (const [stage, pct, delay] of stages) {
      setRunState(stage);
      setProgress(pct);
      if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
    }
  }

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  function handlePauseResume() {
    setRunState((s) => (s === 'running' ? 'paused' : 'running'));
  }

  function handleScreenshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenshot-${Date.now()}.png`;
    a.click();
  }

  function handleFullscreen() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.requestFullscreen) canvas.requestFullscreen();
  }

  function handleRetry() {
    setRunState('idle');
    setProgress(0);
    setErrorMsg('');
    setFileName('');
    setBinaryType('unknown');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const isProcessing =
    runState === 'parsing' ||
    runState === 'translating' ||
    runState === 'compiling' ||
    runState === 'loading';

  const isActive = runState === 'running' || runState === 'paused';

  return (
    <div className="min-h-screen bg-background">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, hsl(var(--primary)/0.06) 0%, transparent 60%)',
        }}
      />

      <div className="cd-container py-8 md:py-12 relative">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Run{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-[hsl(var(--primary)/0.7)]">
              APK / EXE
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload an Android APK or Windows EXE and run it instantly in your browser.
          </p>
        </div>

        {/* ── IDLE: drop zone ── */}
        {runState === 'idle' && (
          <GlassCard padding="none">
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-4 rounded-xl',
                'min-h-[320px] md:min-h-[400px] cursor-pointer',
                'border-2 border-dashed transition-colors duration-200',
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 hover:border-border',
              )}
            >
              <Upload
                className={cn(
                  'h-12 w-12 transition-colors duration-200',
                  isDragOver ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">
                  Drop your APK or EXE here
                </p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              </div>
              <div className="flex gap-2">
                {['APK', 'EXE', 'DEX'].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2 py-0.5 rounded-full text-xs font-mono border border-border/60 bg-muted/30 text-muted-foreground"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/60">Supports: APK, EXE, DEX</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".apk,.exe,.dex"
              className="hidden"
              onChange={onFileInputChange}
            />
          </GlassCard>
        )}

        {/* ── PROCESSING: progress bar + stage ── */}
        {isProcessing && (
          <GlassCard padding="lg" className="flex flex-col items-center gap-6 min-h-[320px] justify-center">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-primary mb-2">
                <Zap className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-medium uppercase tracking-widest">
                  {binaryTypeLabel[binaryType]}
                </span>
              </div>
              <p className="text-foreground font-semibold text-lg">{fileName}</p>
            </div>

            <div className="w-full max-w-md">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{stageLabels[runState]}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1 bg-border rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-[hsl(var(--primary)/0.7)] rounded transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              {(
                [
                  ['parsing', 'Parsing'],
                  ['translating', 'IR'],
                  ['compiling', 'WASM'],
                  ['loading', 'Loading'],
                ] as Array<[RunState, string]>
              ).map(([stage, label]) => {
                const stages: RunState[] = ['parsing', 'translating', 'compiling', 'loading'];
                const currentIdx = stages.indexOf(runState);
                const stageIdx = stages.indexOf(stage);
                const done = stageIdx < currentIdx;
                const active = stageIdx === currentIdx;
                return (
                  <div key={stage} className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full transition-all duration-300',
                        done
                          ? 'bg-primary'
                          : active
                          ? 'bg-primary animate-pulse'
                          : 'bg-border',
                      )}
                    />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* ── RUNNING / PAUSED: canvas ── */}
        {isActive && (
          <div className="flex flex-col gap-4">
            <GlassCard padding="none" className="relative">
              <canvas
                ref={canvasRef}
                className="w-full aspect-video bg-black rounded-xl"
              />
              {/* FPS Counter overlay */}
              <div className="absolute top-3 right-3">
                <FPSCounter />
              </div>
              {/* Paused overlay */}
              {runState === 'paused' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  <div className="text-white/80 text-lg font-semibold tracking-widest uppercase">
                    Paused
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Controls bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={handlePauseResume}
                variant="outline"
                size="sm"
                className="gap-2 border-primary/40 hover:border-primary hover:text-primary"
              >
                {runState === 'running' ? (
                  <>
                    <Pause className="h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Resume
                  </>
                )}
              </Button>

              <Button
                onClick={handleScreenshot}
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <Camera className="h-4 w-4" /> Screenshot
              </Button>

              <Button
                onClick={handleFullscreen}
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <Maximize2 className="h-4 w-4" /> Fullscreen
              </Button>

              <div className="flex-1" />

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono text-primary">
                  {binaryTypeLabel[binaryType]}
                </span>
                <span className="text-border">·</span>
                <span className="truncate max-w-[160px]">{fileName}</span>
              </div>
            </div>

            {/* Perf panel toggle */}
            <GlassCard padding="none" goldBorder className="overflow-hidden">
              <button
                onClick={() => setShowPerfPanel((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  Performance
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    showPerfPanel && 'rotate-180',
                  )}
                />
              </button>

              {showPerfPanel && (
                <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/40">
                  <div>
                    <p className="text-xs text-muted-foreground mb-3 mt-4 font-medium uppercase tracking-wider">
                      Frame Time Distribution
                    </p>
                    <FrameHistogram frameTimes={frameTimes} />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0ms</span>
                      <span>33ms</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {[
                      {
                        icon: Zap,
                        label: 'Runtime',
                        value: binaryTypeLabel[binaryType] + ' / WASM',
                      },
                      {
                        icon: Cpu,
                        label: 'JIT',
                        value: 'Active',
                      },
                      {
                        icon: MemoryStick,
                        label: 'Heap',
                        value: '—',
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <item.icon className="h-3.5 w-3.5" />
                          {item.label}
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* ── ERROR state ── */}
        {runState === 'error' && (
          <GlassCard
            padding="lg"
            className="flex flex-col items-center gap-5 min-h-[280px] justify-center text-center"
          >
            <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <Upload className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground mb-1">
                Failed to load binary
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">{errorMsg}</p>
            </div>
            <Button onClick={handleRetry} variant="outline" size="sm" className="mt-2">
              Try again
            </Button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
