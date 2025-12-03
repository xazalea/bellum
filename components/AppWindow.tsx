'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AppInstance } from '../../lib/app-manager/types';
import { AppRunner } from '../../lib/engine/runner';
import { X, Minimize2, Maximize2, Cpu, Zap, Activity, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

interface AppWindowProps {
  app: AppInstance;
  onClose: () => void;
}

export const AppWindow: React.FC<AppWindowProps> = ({ app, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<AppRunner | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [detail, setDetail] = useState<string>('');
  const [cpuUsage, setCpuUsage] = useState<number>(0);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (containerRef.current && !runnerRef.current) {
      const runner = new AppRunner();
      runnerRef.current = runner;

      // Hook into status updates
      // @ts-ignore - Accessing internal loader for stats
      if (runner.loader) {
          runner.loader.onStatusUpdate = (s, d) => {
              setStatus(s);
              if (d) setDetail(d);
          };
      }

      runner.run(app, containerRef.current).catch(err => {
        console.error('App crashed:', err);
        setStatus('CRASHED');
        setDetail(err.message);
      });

      // Mock Stats
      const interval = setInterval(() => {
          setCpuUsage(Math.floor(Math.random() * 30) + 10);
      }, 1000);

      return () => {
        clearInterval(interval);
        runner.stop();
        runnerRef.current = null;
      };
    }
  }, [app]);

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`fixed ${isMaximized ? 'inset-0' : 'inset-10'} bg-[#111] border border-[#333] rounded-xl shadow-2xl overflow-hidden flex flex-col z-50`}
    >
      {/* Header */}
      <div className="h-10 bg-[#1a1a1a] border-b border-[#333] flex items-center justify-between px-4 select-none">
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">{app.name}</span>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-900/30 border border-blue-800/50 rounded text-[10px] text-blue-300">
                <Cpu size={10} />
                <span>NACHO-VM</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMaximized(!isMaximized)} className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors">
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative bg-black">
        <div ref={containerRef} className="absolute inset-0" />
        
        {/* Boot Overlay */}
        {status !== 'Running' && (
             <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center font-mono z-10">
                <div className="w-64 space-y-4">
                    <div className="text-xs text-gray-500 mb-2 border-b border-gray-800 pb-2">
                        NACHO HYPERVISOR v2.0
                    </div>
                    <div className="space-y-2">
                        <StatusRow label="KERNEL" value="ONLINE" active />
                        <StatusRow label="WEBGPU" value="ACTIVE" active />
                        <StatusRow label="NEURAL" value="READY" active />
                        <StatusRow label="MEMORY" value="SHARED" active />
                    </div>
                    <div className="h-px bg-gray-800 my-4" />
                    <div className="text-green-500 text-sm animate-pulse">
                        {'>'} {status}
                    </div>
                    <div className="text-gray-500 text-xs">
                        {detail}
                    </div>
                </div>
             </div>
        )}
      </div>

      {/* Debug Footer */}
      <div className="h-8 bg-[#0a0a0a] border-t border-[#333] flex items-center px-4 gap-6 text-[10px] font-mono text-gray-400">
        <div className="flex items-center gap-2">
            <Activity size={12} className="text-green-500" />
            <span>CPU: {cpuUsage}%</span>
        </div>
        <div className="flex items-center gap-2">
            <Zap size={12} className="text-yellow-500" />
            <span>JIT: ENABLED</span>
        </div>
        <div className="flex items-center gap-2">
            <Monitor size={12} className="text-blue-500" />
            <span>GPU: SIMULATED</span>
        </div>
        <div className="ml-auto text-gray-600">
            {app.id.split('-')[0]}
        </div>
      </div>
    </motion.div>
  );
};

const StatusRow = ({ label, value, active }: { label: string, value: string, active?: boolean }) => (
    <div className="flex justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className={active ? "text-green-500" : "text-gray-700"}>[{value}]</span>
    </div>
);

