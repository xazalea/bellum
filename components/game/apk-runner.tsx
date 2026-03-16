'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Square, AlertCircle, Upload, Activity } from 'lucide-react';

export function ApkRunner() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [statusDetail, setStatusDetail] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fps, setFps] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<{ stop: () => void; getPerformanceStats?: () => { fps: number } } | null>(null);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFile = useCallback((f: File) => {
    if (f.name.endsWith('.apk')) {
      setFile(f);
      setStatus('ready');
      setStatusDetail(f.name + ' (' + (f.size / 1024 / 1024).toFixed(1) + ' MB)');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleRun = useCallback(async () => {
    if (!file || !containerRef.current) return;

    setIsRunning(true);
    setStatus('initializing');
    setStatusDetail('Loading Android runtime...');

    try {
      const { APKLoader } = await import('@/lib/engine/loaders/apk-loader');
      const loader = new APKLoader();
      loaderRef.current = loader;

      loader.onStatusUpdate = (s: string, detail?: string) => {
        setStatus(s);
        setStatusDetail(detail || '');
      };

      fpsIntervalRef.current = setInterval(() => {
        if (loader.getPerformanceStats) {
          setFps(loader.getPerformanceStats().fps);
        }
      }, 1000);

      const buffer = await file.arrayBuffer();
      await loader.loadFromBuffer(containerRef.current, buffer, file.name);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus('error');
      setStatusDetail(message);
      setIsRunning(false);
    }
  }, [file]);

  const handleStop = useCallback(() => {
    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current);
      fpsIntervalRef.current = null;
    }
    if (loaderRef.current) {
      loaderRef.current.stop();
      loaderRef.current = null;
    }
    setIsRunning(false);
    setFps(0);
    setStatus('stopped');
    setStatusDetail('');
    if (containerRef.current) containerRef.current.innerHTML = '';
  }, []);

  useEffect(() => {
    return () => {
      if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
    };
  }, []);

  const statusColor = status === 'error' ? 'text-destructive' : status === 'Running' ? 'text-green-500' : 'text-muted-foreground';

  return (
    <div className="space-y-4">
      {!isRunning && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
        >
          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            {file ? file.name : 'Drop APK file here or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Supports .apk files'}
          </p>
          <Input
            type="file"
            accept=".apk"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleRun}
          disabled={!file || isRunning}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          {isRunning ? 'Running...' : 'Run APK'}
        </Button>
        {isRunning && (
          <Button onClick={handleStop} variant="destructive" className="gap-2">
            <Square className="h-4 w-4" />
            Stop
          </Button>
        )}
        {isRunning && fps > 0 && (
          <div className="flex items-center gap-1.5 text-sm font-mono">
            <Activity className={`h-4 w-4 ${fps >= 40 ? 'text-green-500' : fps >= 20 ? 'text-yellow-500' : 'text-red-500'}`} />
            <span className={fps >= 40 ? 'text-green-500' : fps >= 20 ? 'text-yellow-500' : 'text-red-500'}>
              {fps} FPS
            </span>
          </div>
        )}
      </div>

      {status !== 'idle' && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
          status === 'error' ? 'bg-destructive/10' : 'bg-muted'
        }`}>
          {status === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
          {status === 'initializing' && (
            <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <span className={`font-medium ${statusColor}`}>{status}</span>
          {statusDetail && <span className="truncate text-muted-foreground">— {statusDetail}</span>}
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full aspect-video bg-black rounded-lg overflow-hidden border relative"
        style={{ minHeight: '400px' }}
      >
        {!isRunning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-white/30">APK output will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
