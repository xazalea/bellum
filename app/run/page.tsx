'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { BinaryAnalyzer, FileType } from '@/lib/engine/analyzers/binary-analyzer';
import { FramePacer } from '@/lib/engine/frame-pacer';
import { SingleFileBundler } from '@/lib/compiler/single-file-bundler';
import { UnifiedRuntime, type RuntimeState } from '../../src/engine/runtime/unified-runtime';
import { ErrorBoundary } from '@/components/error-boundary';
import { animate, spring, ease, dur } from '@/lib/hooks/use-anime';
import { AlertTriangle } from 'lucide-react';
import { getRecentlyPlayed } from '@/lib/recently-played';

type RunStatus = 'idle' | 'loading' | 'booting' | 'running' | 'paused' | 'halted' | 'error' | 'exporting' | 'exported';
const VISIBLE_STATUSES = ['running', 'paused', 'halted', 'error'] as const;
type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';

interface PerfStats {
  fps: number;
  quality: number;
}

export default function RunPage() {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [statusDetail, setStatusDetail] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<FileType>(FileType.UNKNOWN);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState('');
  const [perfStats, setPerfStats] = useState<PerfStats>({ fps: 0, quality: 1.0 });
  const [dragOver, setDragOver] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('high');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<UnifiedRuntime | null>(null);
  const framePacerRef = useRef<FramePacer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle ?id= URL param (from games/[id] redirects)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    const titleParam = params.get('title');
    if (idParam) {
      const recent = getRecentlyPlayed();
      const found = recent.find(g => g.id === idParam);
      if (found) {
        setFileName(found.title);
        setStatusDetail(`Session: ${found.title}`);
      } else if (titleParam) {
        setFileName(titleParam);
        setStatusDetail(`Session not found in history — drop the original file to re-run`);
      }
      // Clear the URL params after reading them
      window.history.replaceState({}, '', '/run');
    }
  }, []);

  useEffect(() => {
    const pacer = new FramePacer();
    pacer.onFpsUpdate = (fps, quality) => {
      setPerfStats({ fps, quality });
    };
    framePacerRef.current = pacer;
    return () => {
      pacer.stop();
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Click-outside handler for quality menu
  useEffect(() => {
    if (!showQualityMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-quality-menu]')) {
        setShowQualityMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showQualityMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture keys when user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen();
      }
      if (e.key === 'f' && status === 'running' && !e.metaKey && !e.ctrlKey) {
        toggleFullscreen();
      }
      if (e.key === ' ' && status === 'running') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, isFullscreen, toggleFullscreen]);

  const loadFile = useCallback(async (file: File) => {
    setStatus('loading');
    setFileName(file.name);
    setError('');
    setExportUrl(null);

    try {
      const buffer = await file.arrayBuffer();
      const detectedType = await BinaryAnalyzer.detectType(buffer, file.name);
      setFileType(detectedType);
      setFileBuffer(buffer);

      if (detectedType !== FileType.APK && detectedType !== FileType.PE_EXE) {
        setError(`Unsupported file type: ${detectedType}. Drop an APK or EXE file.`);
        setStatus('error');
        return;
      }

      setStatus('booting');
      setStatusDetail('Initializing runtime...');
      setSessionStartTime(null);

      if (!canvasRef.current) {
        setError('Canvas not ready');
        setStatus('error');
        return;
      }

      const runtime = new UnifiedRuntime({
        canvas: canvasRef.current,
        type: detectedType === FileType.APK ? 'apk' : 'exe',
        onStateChange: (s: RuntimeState) => {
          if (s === 'running') {
            setStatus('running');
            setSessionStartTime(Date.now());
          } else if (s === 'halted') {
            setStatus('halted');
            setStatusDetail('Program exited');
            setSessionStartTime(null);
            framePacerRef.current?.stop();
          } else if (s === 'error') {
            setError('Runtime error');
            setStatus('error');
            framePacerRef.current?.stop();
          }
        },
        onLog: (msg: string) => setStatusDetail(msg.replace(/^\[Runtime\]\s*/, '')),
        onFPS: (fps: number) => setPerfStats(prev => ({ ...prev, fps })),
      });

      await runtime.boot();
      setStatusDetail('Loading binary...');

      if (detectedType === FileType.APK) {
        await runtime.loadAPK(buffer);
      } else {
        await runtime.loadEXE(buffer);
      }

      runtimeRef.current = runtime;
      runtime.run();

      // Animate canvas in
      const canvas = document.querySelector('[data-anime="runtime-canvas"]');
      if (canvas) animate(canvas, { opacity: [0, 1], scale: [0.98, 1], ease: spring({ bounce: 0.15 }), duration: dur.slow });

      // Wire FramePacer → runtime.tick() — the main execution loop
      const pacer = framePacerRef.current;
      if (pacer) {
        pacer.onFrame = (dt: number, _fps: number) => {
          try {
            if (runtimeRef.current?.state === 'running') {
              runtimeRef.current.tick(dt);
            }
          } catch (e: any) {
            console.error('[RunPage] Runtime tick error:', e);
            setError(e?.message || 'Runtime execution error');
            setStatus('error');
            pacer.stop();
          }
        };
        pacer.start();
      }
    } catch (e: any) {
      const msg = e?.message || 'Unknown error';
      setError(msg);
      setStatus('error');
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dragOver) {
      setDragOver(true);
      if (containerRef.current) animate(containerRef.current, { borderColor: 'hsl(var(--foreground) / 0.4)', scale: [1, 1.005], ease: spring({ bounce: 0.2 }), duration: dur.fast });
    }
  }, [dragOver]);

  const onDragLeave = useCallback(() => {
    setDragOver(false);
    if (containerRef.current) animate(containerRef.current, { borderColor: 'hsl(var(--border))', scale: 1, ease: ease.out, duration: dur.fast });
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const stopExecution = useCallback(() => {
    runtimeRef.current?.destroy();
    runtimeRef.current = null;
    framePacerRef.current?.stop();
    setStatus('idle');
    setStatusDetail('');
    setFileName('');
    setFileBuffer(null);
    setError('');
    setExportUrl(null);
    setSessionStartTime(null);
    setElapsedTime(0);
  }, []);

  const exportToHtml = useCallback(async () => {
    if (!fileBuffer && !runtimeRef.current) return;

    setStatus('exporting');
    setStatusDetail('Compiling standalone HTML...');

    try {
      if (runtimeRef.current && fileType === FileType.PE_EXE) {
        runtimeRef.current.exportToHTML(
          fileName.replace(/\.(apk|exe)$/i, '') + '.html'
        );
        setStatus('exported');
        setStatusDetail('HTML file exported');
        return;
      }

      const bundler = new SingleFileBundler();
      const html = await bundler.compileFromBuffers({
        v86Js: new ArrayBuffer(0),
        v86Wasm: new ArrayBuffer(0),
        bios: new ArrayBuffer(0),
        vgaBios: new ArrayBuffer(0),
        osImage: new ArrayBuffer(0),
        appBinary: fileBuffer!,
      });

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setExportUrl(url);

      const downloadName = fileName.replace(/\.(apk|exe)$/i, '') + '.html';
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setStatus('exported');
      setStatusDetail('HTML file exported');
    } catch (e: any) {
      setError(`Export failed: ${e?.message || 'unknown'}`);
      setStatus('running');
    }
  }, [fileBuffer, fileName, fileType]);

  const fpsClass = perfStats.fps >= 40 ? 'fps-good' : perfStats.fps >= 20 ? 'fps-warn' : 'fps-bad';

  // Detect SharedArrayBuffer support (requires COOP/COEP headers)
  const [sabAvailable] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return typeof SharedArrayBuffer !== 'undefined';
    } catch {
      return false;
    }
  });

  // Elapsed time tracker
  useEffect(() => {
    if (status !== 'running' || !sessionStartTime) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, sessionStartTime]);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Quality preset — UI placeholder until runtime supports dynamic target FPS
  const qualitySettings: Record<QualityPreset, { label: string; targetFps: number; description: string }> = {
    low: { label: 'Low', targetFps: 30, description: 'Max compatibility' },
    medium: { label: 'Medium', targetFps: 40, description: 'Balanced' },
    high: { label: 'High', targetFps: 60, description: 'Recommended' },
    ultra: { label: 'Ultra', targetFps: 120, description: 'High refresh rate' },
  };

  return (
    <ErrorBoundary>
    <div className="min-h-screen">
      <div className="cd-container py-6">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-sm font-medium text-foreground tracking-tight">Run</h1>
            {!sabAvailable && (
              <p className="text-[10px] text-yellow-500/70 mt-0.5">
                <AlertTriangle size={10} className="inline mr-1" />COOP/COEP headers missing — performance may be limited
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {status === 'idle' ? 'Drop an APK or EXE to run it in your browser' :
               status === 'running' ? `${fileName} — running` :
               status === 'exporting' ? statusDetail :
               status === 'exported' ? 'Export complete' :
               statusDetail || 'Processing...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {status === 'running' && (
              <>
                <button onClick={exportToHtml} className="btn-ghost">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Export
                </button>
                <button onClick={toggleFullscreen} className="btn-ghost">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                    <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                  </svg>
                  {isFullscreen ? 'Exit' : 'Fullscreen'}
                </button>
                <button onClick={stopExecution} className="btn-ghost text-muted-foreground/60 hover:text-destructive">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mr-1.5">
                    <rect x="6" y="6" width="12" height="12" />
                  </svg>
                  Stop
                </button>
              </>
            )}
            {status === 'error' && (
              <button
                onClick={() => { setStatus('idle'); setError(''); setFileName(''); }}
                className="btn-secondary"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Runtime Viewport */}
        <div
          ref={containerRef}
          className={`relative w-full border bg-card overflow-hidden transition-all duration-200 ${
            dragOver ? 'border-foreground/40' : 'border-border'
          } ${status === 'running' ? 'cursor-crosshair' : ''} ${
            isFullscreen ? 'rounded-none border-0' : 'rounded-sm'
          }`}
          style={{ minHeight: status === 'idle' ? '400px' : '70vh' }}
          onMouseMove={status === 'running' ? showControlsTemporarily : undefined}
          onDrop={status === 'idle' ? onDrop : undefined}
          onDragOver={status === 'idle' ? onDragOver : undefined}
          onDragLeave={status === 'idle' ? onDragLeave : undefined}
        >
          {/* Idle state — drop zone */}
          {status === 'idle' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".apk,.exe"
                className="hidden"
                onChange={onFileChange}
              />
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  {/* Animated dashed ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-muted-foreground/20 group-hover:border-primary/30 transition-colors animate-spin" style={{ animationDuration: '12s' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-xl border border-border bg-card/80 flex items-center justify-center group-hover:border-primary/25 group-hover:bg-primary/5 transition-all duration-300">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/30 group-hover:text-primary/60 transition-colors">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Drop APK or EXE here</p>
                <p className="text-[10px] text-muted-foreground/40">or click to browse · No install needed</p>
                <div className="mt-4 flex gap-2 justify-center">
                  <span className="tag">.apk</span>
                  <span className="tag">.exe</span>
                </div>
                <div className="mt-4 flex items-center justify-center gap-4 text-[9px] text-muted-foreground/25">
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-green-500/40" />
                    40+ FPS
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary/40" />
                    WebGL2
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary/40" />
                    Sandboxed
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Loading / Booting */}
          {(status === 'loading' || status === 'booting') && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/95 backdrop-blur-sm">
              <div className="text-center max-w-xs">
                <div className="relative w-16 h-16 mx-auto mb-5">
                  {/* Animated ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary/70 animate-spin" style={{ animationDuration: '1s' }} />
                  <div className="absolute inset-2 rounded-full border border-transparent border-b-primary/40 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {fileType === FileType.APK ? (
                      <span className="text-[10px] font-bold text-primary/80">A</span>
                    ) : fileType === FileType.PE_EXE ? (
                      <span className="text-[10px] font-bold text-primary/80">E</span>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
                    )}
                  </div>
                </div>
                <p className="text-xs font-medium text-foreground mb-3">
                  {status === 'loading' ? `Loading ${fileName}` : statusDetail}
                </p>
                {/* Animated loading steps */}
                <div className="flex flex-col items-start gap-2 mx-auto w-fit">
                  <div className={`loading-step ${status === 'loading' ? 'active' : 'completed'}`}>
                    <span className="step-indicator" />
                    <span>Detecting format</span>
                  </div>
                  <div className={`loading-step ${status === 'booting' && statusDetail.includes('Initializing') ? 'active' : status === 'booting' ? 'completed' : ''}`}>
                    <span className="step-indicator" />
                    <span>Initializing runtime</span>
                  </div>
                  <div className={`loading-step ${status === 'booting' && !statusDetail.includes('Initializing') && statusDetail !== 'Initializing runtime...' ? 'active' : ''}`}>
                    <span className="step-indicator" />
                    <span>Booting system</span>
                  </div>
                  <div className="loading-step">
                    <span className="step-indicator" />
                    <span>Starting execution</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Canvas — always in DOM so ref is available during boot */}
          <canvas
            ref={canvasRef}
            data-anime="runtime-canvas"
            className={`runtime-canvas w-full h-full absolute inset-0 ${
              VISIBLE_STATUSES.includes(status as RunStatus) ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            tabIndex={0}
          />

          {/* Running overlay controls — auto-hide */}
          {status === 'running' && (
            <>
              {/* FPS counter & streaming indicator — always visible */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-3">
                {/* Streaming indicator */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/70 backdrop-blur-sm border border-border/50">
                  <span className="telemetry-dot w-1.5 h-1.5 rounded-full bg-green-500/70 inline-block" />
                  <span className="text-[9px] text-green-400/80 font-medium uppercase tracking-wider">Live</span>
                </div>
                {/* Quality preset badge */}
                <button
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="px-2 py-1 rounded-md bg-background/70 backdrop-blur-sm border border-border/50 text-[9px] text-muted-foreground/60 font-mono hover:text-foreground transition-colors"
                  data-quality-menu
                >
                  {qualitySettings[qualityPreset].label}
                </button>
                {showQualityMenu && (
                  <div className="absolute top-8 right-0 z-30 bg-popover border border-border rounded-lg shadow-xl overflow-hidden min-w-[140px]" data-quality-menu>
                    {(Object.entries(qualitySettings) as [QualityPreset, typeof qualitySettings[QualityPreset]][]).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => { setQualityPreset(key); setShowQualityMenu(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[10px] transition-colors ${qualityPreset === key ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                      >
                        <span className="font-medium">{val.label}</span>
                        <span className="text-muted-foreground/50 font-mono">{val.targetFps}fps</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* FPS display */}
                <div className="perf-overlay">
                  <span className={fpsClass}>{Math.round(perfStats.fps)}</span>
                  <span className="text-muted-foreground/60 ml-1">FPS</span>
                  {perfStats.quality < 1.0 && (
                    <span className="ml-2 text-muted-foreground/40">{Math.round(perfStats.quality * 100)}%</span>
                  )}
                </div>
              </div>

              {/* Bottom controls — auto-hide */}
              <div
                className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
                  showControls || isFullscreen ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="bg-gradient-to-t from-background/90 to-transparent pt-12 pb-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-muted-foreground font-mono">{fileName}</span>
                      <span className="tag">{fileType === FileType.APK ? 'APK' : 'EXE'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={exportToHtml} className="btn-ghost text-[10px] h-6 px-2">
                        Export HTML
                      </button>
                      <button onClick={toggleFullscreen} className="btn-ghost text-[10px] h-6 px-2">
                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      </button>
                      <button onClick={stopExecution} className="btn-ghost text-[10px] h-6 px-2 text-muted-foreground/60 hover:text-destructive">
                        Stop
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Halted overlay — app exited, show final frame with exit banner */}
          {status === 'halted' && (
            <div className="absolute inset-0 z-20">
              {/* The canvas underneath shows the final frame */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent pt-12 pb-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="status-badge status-badge-idle">Exited</span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{fileName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={exportToHtml} className="btn-ghost text-[10px] h-7 px-2">
                      Export HTML
                    </button>
                    <button
                      onClick={() => stopExecution()}
                      className="btn-primary text-[10px] h-7 px-3"
                    >
                      Run Another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="text-center max-w-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground/40 mx-auto mb-3">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <p className="text-xs text-foreground mb-1">{fileName}</p>
                <p className="text-[11px] text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {/* Exporting overlay */}
          {status === 'exporting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20 backdrop-blur-sm">
              <div className="text-center">
                <div className="spinner mx-auto mb-3" />
                <p className="text-[11px] text-muted-foreground">{statusDetail}</p>
              </div>
            </div>
          )}

          {/* Exported success */}
          {status === 'exported' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-20 backdrop-blur-sm">
              <div className="text-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground/60 mx-auto mb-2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <p className="text-xs text-foreground">{statusDetail}</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats bar */}
        {status === 'running' && !isFullscreen && (
          <div className="mt-3 flex items-center gap-6 border-t border-border pt-3">
            <div>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">File</p>
              <p className="text-[11px] text-foreground/70 mt-0.5 font-mono truncate max-w-[200px]">{fileName}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Type</p>
              <p className="text-[11px] text-foreground/70 mt-0.5 font-mono">{fileType === FileType.APK ? 'APK' : 'EXE'}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">FPS</p>
              <p className={`text-[11px] mt-0.5 font-mono ${fpsClass}`}>{Math.round(perfStats.fps)}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Quality</p>
              <p className="text-[11px] text-foreground/70 mt-0.5 font-mono">{Math.round(perfStats.quality * 100)}% · {qualitySettings[qualityPreset].label}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Time</p>
              <p className="text-[11px] text-foreground/70 mt-0.5 font-mono tabular-nums">{formatElapsed(elapsedTime)}</p>
            </div>
            <div className="ml-auto">
              <p className="text-[9px] text-muted-foreground/40">Press <kbd className="px-1 py-0.5 bg-accent border border-border text-[9px] font-mono">F</kbd> for fullscreen · <kbd className="px-1 py-0.5 bg-accent border border-border text-[9px] font-mono">Esc</kbd> exit</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
