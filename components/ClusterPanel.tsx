"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Network, Zap, Cpu, Share2, Shield, Activity } from 'lucide-react';

export const ClusterPanel = () => {
  const peers = [
    { id: 'Alpha-1', role: 'Leader', ping: 12, load: 45, gpu: 'RTX 4090' },
    { id: 'Beta-Node', role: 'Worker', ping: 24, load: 80, gpu: 'M2 Ultra' },
    { id: 'Gamma-Ray', role: 'Worker', ping: 18, load: 10, gpu: 'iPhone 15' },
    { id: 'Delta-V', role: 'Worker', ping: 45, load: 60, gpu: 'Generic' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24">
        
        {/* Header */}
        <div className="mb-12 flex justify-between items-end">
            <div>
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Network className="text-blue-500" />
                    AetherNet Cluster
                </h2>
                <p className="text-white/60">Distributed Computing Mesh • {peers.length} Active Nodes</p>
            </div>
            <div className="flex gap-4 text-right">
                <div>
                    <div className="text-xs text-white/40 uppercase">Total Compute</div>
                    <div className="text-xl font-mono font-bold text-green-400">128 TFLOPS</div>
                </div>
                <div>
                    <div className="text-xs text-white/40 uppercase">Latency</div>
                    <div className="text-xl font-mono font-bold text-blue-400">~18ms</div>
                </div>
            </div>
        </div>

        {/* Visualizer (Abstract) */}
        <div className="w-full h-64 bellum-card mb-8 relative overflow-hidden flex items-center justify-center">
            {/* Animated Mesh Lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
                <line x1="20%" y1="50%" x2="50%" y2="50%" stroke="white" strokeDasharray="4" className="animate-pulse" />
                <line x1="80%" y1="50%" x2="50%" y2="50%" stroke="white" strokeDasharray="4" className="animate-pulse" />
                <line x1="50%" y1="20%" x2="50%" y2="50%" stroke="white" strokeDasharray="4" className="animate-pulse" />
                <line x1="50%" y1="80%" x2="50%" y2="50%" stroke="white" strokeDasharray="4" className="animate-pulse" />
                <circle cx="50%" cy="50%" r="40" fill="none" stroke="#3b82f6" strokeWidth="2" />
            </svg>
            
            <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center backdrop-blur-md border border-blue-500/50 mx-auto mb-4 animate-pulse">
                    <Zap size={32} className="text-blue-400" />
                </div>
                <div className="text-sm font-mono text-blue-300">Self (Master)</div>
            </div>
        </div>

        {/* Peer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {peers.map((peer, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bellum-card p-6 border-l-4 border-l-blue-500"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="font-bold text-lg">{peer.id}</div>
                        <div className={`text-xs px-2 py-1 rounded bg-white/5 
                            ${peer.role === 'Leader' ? 'text-yellow-400 border border-yellow-400/20' : 'text-white/60'}`}>
                            {peer.role}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm text-white/60">
                            <Cpu size={16} />
                            <span>{peer.gpu}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/60">
                            <Activity size={16} />
                            <span>Load: {peer.load}%</span>
                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500" 
                                    style={{ width: `${peer.load}%` }} 
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/60">
                            <Share2 size={16} />
                            <span>Ping: {peer.ping}ms</span>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                        <button className="flex-1 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 rounded transition-colors text-white/80">
                            Offload Task
                        </button>
                        <button className="flex-1 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 rounded transition-colors text-white/80">
                            Sync Memory
                        </button>
                    </div>
                </motion.div>
            ))}

            {/* Add Node */}
            <div className="bellum-card border-dashed border-white/10 flex flex-col items-center justify-center gap-2 p-6 cursor-pointer hover:border-white/40 transition-colors">
                <Shield size={32} className="text-white/20" />
                <span className="text-white/40 font-medium">Connect New Peer</span>
            </div>
        </div>
    </div>
  );
};
