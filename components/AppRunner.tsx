"use client";

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Power, RefreshCw, Mic, Volume2 } from 'lucide-react';

export interface AppRunnerProps {
  filePath?: string;
  onExit?: () => void;
}

export const AppRunner: React.FC<AppRunnerProps> = ({ filePath, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Initialize NachoOS / Runtime here
    const canvas = canvasRef.current;
    if (canvas) {
        // Mock init
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = '20px monospace';
            ctx.fillStyle = '#0f0';
            ctx.fillText('> NachoOS Runtime Initialized', 20, 40);
            if (filePath) {
              ctx.fillStyle = '#8b8b8b';
              ctx.font = '14px monospace';
              ctx.fillText(`file: ${filePath}`, 20, 66);
            }
        }
    }
  }, [filePath]);

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
                    Running
                </div>
                <div className="w-[1px] h-4 bg-white/20 my-auto" />
                <div className="flex gap-4 text-xs font-mono items-center">
                    <span>60 FPS</span>
                    <span>GPU: 45%</span>
                    <span>MEM: 1.2GB</span>
                </div>
            </motion.div>

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
