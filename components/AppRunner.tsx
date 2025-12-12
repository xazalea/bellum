"use client";

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Power, RefreshCw, Mic, Volume2 } from 'lucide-react';
import { authService } from '@/lib/firebase/auth-service';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { downloadClusterFile } from '@/lib/storage/chunked-download';
import { os } from '@/src/nacho_os';
import type { InstalledApp } from '@/lib/apps/apps-service';
import { opfsReadBytes, opfsWriteBytes } from '@/lib/storage/local-opfs';

export interface AppRunnerProps {
  appId?: string;
  onExit?: () => void;
}

export const AppRunner: React.FC<AppRunnerProps> = ({ appId, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string>('Idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [app, setApp] = useState<InstalledApp | null>(null);

  const user = authService.getCurrentUser();

  const canRun = useMemo(() => !!user && !!appId, [user, appId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setProgress(0);
      setApp(null);

      if (!user || !appId) {
        setStatus('No app selected');
        return;
      }

      setStatus('Loading metadata…');
      const ref = doc(db, 'users', user.uid, 'apps', appId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setStatus('App not found');
        return;
      }
      const appData = { id: snap.id, ...(snap.data() as any) } as InstalledApp;
      if (cancelled) return;
      setApp(appData);

      const canvas = canvasRef.current;
      if (!canvas) {
        setStatus('Canvas missing');
        return;
      }

      setStatus('Booting NachoOS…');
      await os.boot(canvas);
      if (cancelled) return;

      setStatus('Downloading from cluster…');
      // Prefer local OPFS cache, fall back to cluster download.
      let bytes = await opfsReadBytes(appData.fileId);
      if (!bytes) {
        const dl = await downloadClusterFile(appData.fileId, {
          compressedChunks: appData.compression === 'gzip-chunked',
          onProgress: (p) => {
            setProgress(Math.round(((p.chunkIndex + 1) / p.totalChunks) * 100));
          },
        });
        bytes = dl.bytes;
        // Best-effort cache
        void opfsWriteBytes(appData.fileId, bytes).catch(() => {});
      } else {
        setProgress(100);
      }
      if (cancelled) return;

      setStatus('Launching…');
      // Ensure ArrayBuffer-backed payload (File/Blob typings exclude SharedArrayBuffer).
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const file = new File([copy.buffer], appData.originalName, { type: 'application/octet-stream' });
      await os.run(file);

      setStatus('Running');
    })().catch((e: any) => {
      setError(e?.message || 'Failed to run app');
      setStatus('Error');
    });

    return () => {
      cancelled = true;
    };
  }, [user, appId]);

  return (
    <div className="fixed inset-0 bg-black z-40 flex flex-col">
        
        {/* Fullscreen Canvas */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <canvas 
                ref={canvasRef}
                className="w-full h-full object-contain"
                width={1920}
                height={1080}
            />

            {/* Minimal Overlay UI */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-6 py-2 flex gap-6 text-white/80"
            >
                <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {status}
                </div>
                <div className="w-[1px] h-4 bg-white/20 my-auto" />
                <div className="flex gap-4 text-xs font-mono items-center">
                    {app ? <span>{app.name}</span> : <span>—</span>}
                    <span>{progress ? `${progress}%` : ''}</span>
                </div>
            </motion.div>

            {error && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 bellum-card p-4 border-2 border-red-400/30 bg-red-500/10 text-red-200 max-w-[720px]">
                {error}
              </div>
            )}

            {/* Floating Action Bar (Fade out on idle would be added here) */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4"
            >
                <button
                    type="button"
                    onClick={onExit}
                    className="p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all hover:scale-110"
                >
                    <Power size={20} className="text-red-400" />
                </button>
                <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all hover:scale-110">
                    <RefreshCw size={20} />
                </button>
                <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all hover:scale-110">
                    <Mic size={20} />
                </button>
                <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all hover:scale-110">
                    <Volume2 size={20} />
                </button>
                <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all hover:scale-110">
                    <Maximize2 size={20} />
                </button>
            </motion.div>
        </div>
    </div>
  );
};
