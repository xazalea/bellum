'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { APKLoader } from '@/lib/engine/loaders/apk-loader';
import { BinaryAnalyzer, FileType } from '@/lib/engine/analyzers/binary-analyzer';
import { FramePacer } from '@/lib/engine/frame-pacer';
import { SingleFileBundler } from '@/lib/compiler/single-file-bundler';
import { UnifiedRuntime, type RuntimeState } from '../../src/engine/runtime/unified-runtime';

type RunStatus = 'idle' | 'loading' | 'booting' | 'running' | 'paused' | 'error' | 'exporting' | 'exported';

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

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<APKLoader | null>(null);
  const runtimeRef = useRef<UnifiedRuntime | null>(null);
  const framePacerRef = useRef<FramePacer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const pacer = new FramePacer();
    pacer.onFpsUpdate = (fps, quality) => {
      setPerfStats({ fps, quality });
    };
    framePacerRef.current = pacer;
    return () => {
      pacer.stop();
      loaderRef.current?.stop();
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

      const loader = new APKLoader();
      loaderRef.current = loader;

      loader.onStatusUpdate = (s, detail) => {
        setStatusDetail(detail || s);
        if (s === 'Running') {
          setStatus('running');
          framePacerRef.current?.start();
        } else if (s === 'Error' || s === 'Boot failed') {
          setError(detail || 'Boot failed');
          setStatus('error');
        }
      };

      if (!containerRef.current) {
        setError('Container not ready');
        setStatus('error');
        return;
      }

      if (detectedType === FileType.APK || detectedType === FileType.PE_EXE) {
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
              framePacerRef.current?.start();
            } else if (s === 'halted') {
              setStatusDetail('Program exited');
            } else if (s === 'error') {
              setError('Runtime error');
              setStatus('error');
            }
          },
          onLog: (msg: string) => setStatusDetail(msg.replace(/^\[Runtime\]\s*/, '')),
          onFPS: (fps: number) => setPerfStats(prev => ({ ...prev, fps })),
        });

        await runtime.boot();

        if (detectedType === FileType.APK) {
          await runtime.loadAPK(buffer);
        } else {
          await runtime.loadEXE(buffer);
        }

        runtimeRef.current = runtime;
        runtime.run();
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
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const stopExecution = useCallback(() => {
    loaderRef.current?.stop();
    runtimeRef.current?.destroy();
    runtimeRef.current = null;
    framePacerRef.current?.stop();
    setStatus('idle');
    setStatusDetail('');
    setFileName('');
    setFileBuffer(null);
    setError('');
    setExportUrl(null);
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

  return (
    <div className="min-h-screen">
      <div className="cd-container py-6">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-sm font-medium text-foreground tracking-tight">Run</h1>
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
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground/30 mx-auto mb-4 group-hover:text-muted-foreground/50 transition-colors"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <p className="text-xs text-muted-foreground mb-1">Drop APK or EXE here</p>
                <p className="text-[10px] text-muted-foreground/40">or click to browse</p>
                <div className="mt-4 flex gap-2 justify-center">
                  {['.apk', '.exe'].map((f) => (
                    <span key={f} className="tag">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading / Booting */}
          {(status === 'loading' || status === 'booting') && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="text-center">
                <div className="spinner mx-auto mb-4" />
                <p className="text-[11px] text-muted-foreground">
                  {status === 'loading' ? `Loading ${fileName}...` : statusDetail}
                </p>
              </div>
            </div>
          )}

          {/* Canvas — always in DOM so ref is available during boot */}
          <canvas
            ref={canvasRef}
            className={`runtime-canvas w-full h-full absolute inset-0 ${
              (status === 'running' || status === 'paused') ? '' : 'invisible pointer-events-none'
            }`}
            tabIndex={0}
          />

          {/* Running overlay controls — auto-hide */}
          {status === 'running' && (
            <>
              {/* FPS counter — always visible */}
              <div className="absolute top-3 right-3 z-20 perf-overlay">
                <span className={fpsClass}>{Math.round(perfStats.fps)}</span>
                <span className="text-muted-foreground/60 ml-1">FPS</span>
                {perfStats.quality < 1.0 && (
                  <span className="ml-2 text-muted-foreground/40">{Math.round(perfStats.quality * 100)}%</span>
                )}
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
              <p className="text-[11px] text-foreground/70 mt-0.5 font-mono">{Math.round(perfStats.quality * 100)}%</p>
            </div>
            <div className="ml-auto">
              <p className="text-[9px] text-muted-foreground/40">Press <kbd className="px-1 py-0.5 bg-accent border border-border text-[9px] font-mono">F</kbd> for fullscreen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
