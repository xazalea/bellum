'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { APKLoader } from '@/lib/engine/loaders/apk-loader';
import { BinaryAnalyzer, FileType } from '@/lib/engine/analyzers/binary-analyzer';
import { FramePacer } from '@/lib/engine/frame-pacer';
import { SingleFileBundler } from '@/lib/compiler/single-file-bundler';

type RunStatus = 'idle' | 'loading' | 'booting' | 'running' | 'error' | 'exporting' | 'exported';

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

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<APKLoader | null>(null);
  const framePacerRef = useRef<FramePacer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      if (detectedType === FileType.APK) {
        await loader.loadFromBuffer(containerRef.current, buffer, file.name);
      } else if (detectedType === FileType.PE_EXE) {
        await loader.loadFromBuffer(containerRef.current, buffer, file.name);
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
    framePacerRef.current?.stop();
    setStatus('idle');
    setStatusDetail('');
    setFileName('');
    setFileBuffer(null);
    setError('');
    setExportUrl(null);
  }, []);

  const exportToHtml = useCallback(async () => {
    if (!fileBuffer || !fileName) return;

    setStatus('exporting');
    setStatusDetail('Compiling standalone HTML...');

    try {
      const bundler = new SingleFileBundler();

      const html = await bundler.compileFromBuffers({
        v86Js: new ArrayBuffer(0),
        v86Wasm: new ArrayBuffer(0),
        bios: new ArrayBuffer(0),
        vgaBios: new ArrayBuffer(0),
        osImage: new ArrayBuffer(0),
        appBinary: fileBuffer,
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
  }, [fileBuffer, fileName]);

  const fpsClass = perfStats.fps >= 40 ? 'fps-good' : perfStats.fps >= 20 ? 'fps-warn' : 'fps-bad';

  return (
    <div className="min-h-screen">
      <div className="cd-container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium text-foreground">Run</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {status === 'idle' ? 'Drop an APK or EXE to run it in your browser' :
               status === 'running' ? `${fileName} — running` :
               status === 'exporting' ? statusDetail :
               status === 'exported' ? 'Export complete' :
               statusDetail || 'Processing...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {status === 'running' && (
              <>
                <button
                  onClick={exportToHtml}
                  className="px-3 h-7 text-[10px] font-medium border border-border text-foreground hover:bg-accent transition-colors"
                >
                  Export HTML
                </button>
                <button
                  onClick={stopExecution}
                  className="px-3 h-7 text-[10px] font-medium border border-border text-muted-foreground hover:bg-accent transition-colors"
                >
                  Stop
                </button>
              </>
            )}
            {status === 'error' && (
              <button
                onClick={() => { setStatus('idle'); setError(''); setFileName(''); }}
                className="px-3 h-7 text-[10px] font-medium border border-border text-foreground hover:bg-accent transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {(status === 'running') && (
          <div className="perf-overlay">
            <span className={fpsClass}>{Math.round(perfStats.fps)} FPS</span>
            {perfStats.quality < 1.0 && (
              <span className="ml-2 text-muted-foreground">{Math.round(perfStats.quality * 100)}%</span>
            )}
          </div>
        )}

        <div
          ref={containerRef}
          className={`relative w-full border ${dragOver ? 'border-foreground/50' : 'border-border'} bg-card overflow-hidden transition-colors`}
          style={{ minHeight: status === 'idle' ? '400px' : '600px' }}
          onDrop={status === 'idle' ? onDrop : undefined}
          onDragOver={status === 'idle' ? onDragOver : undefined}
          onDragLeave={status === 'idle' ? onDragLeave : undefined}
        >
          {status === 'idle' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".apk,.exe"
                className="hidden"
                onChange={onFileChange}
              />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/40 mb-4">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <p className="text-xs text-muted-foreground mb-1">Drop APK or EXE here</p>
              <p className="text-[10px] text-muted-foreground/50">or click to browse</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="text-center">
                <div className="w-4 h-4 border border-foreground/30 border-t-foreground mx-auto mb-3 animate-spin" />
                <p className="text-[11px] text-muted-foreground">Loading {fileName}...</p>
              </div>
            </div>
          )}

          {status === 'booting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="text-center">
                <div className="w-4 h-4 border border-foreground/30 border-t-foreground mx-auto mb-3 animate-spin" />
                <p className="text-[11px] text-muted-foreground">{statusDetail}</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="text-center max-w-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40 mx-auto mb-3">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <p className="text-xs text-foreground mb-1">{fileName}</p>
                <p className="text-[11px] text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {status === 'exporting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
              <div className="text-center">
                <div className="w-4 h-4 border border-foreground/30 border-t-foreground mx-auto mb-3 animate-spin" />
                <p className="text-[11px] text-muted-foreground">{statusDetail}</p>
              </div>
            </div>
          )}
        </div>

        {status === 'running' && (
          <div className="mt-4 flex items-center gap-6 border-t border-border pt-4">
            <div>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">File</p>
              <p className="text-xs text-foreground mt-0.5 font-mono">{fileName}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Type</p>
              <p className="text-xs text-foreground mt-0.5 font-mono">{fileType}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">FPS</p>
              <p className={`text-xs mt-0.5 font-mono ${fpsClass}`}>{Math.round(perfStats.fps)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Quality</p>
              <p className="text-xs text-foreground mt-0.5 font-mono">{Math.round(perfStats.quality * 100)}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
