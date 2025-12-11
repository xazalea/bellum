"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, Sliders, Smartphone, Monitor } from 'lucide-react';

export const Dashboard = () => {
  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 space-y-8">
      
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end"
      >
        <div>
            <h1 className="text-5xl font-bold mb-2 tracking-tight">Bellum<span className="text-white/40">OS</span></h1>
            <p className="text-xl text-white/60">Distributed Web Runtime Environment</p>
        </div>
        <div className="flex gap-4">
            <button className="bellum-btn flex items-center gap-2">
                <Play size={18} fill="currentColor" />
                Launch App
            </button>
            <button className="bellum-btn bellum-btn-secondary flex items-center gap-2">
                <Plus size={18} />
                Install
            </button>
        </div>
      </motion.div>

      {/* Stats / Hero Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bellum-card p-8 h-64 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
            <Monitor size={120} />
        </div>
        
        <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
                <h2 className="text-2xl font-bold mb-1">System Status</h2>
                <div className="flex gap-2 items-center text-green-400 text-sm font-mono">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Running • 60 FPS
                </div>
            </div>
            
            <div className="grid grid-cols-4 gap-8">
                <div>
                    <div className="text-white/40 text-xs uppercase tracking-widest mb-1">WASM Heap</div>
                    <div className="text-2xl font-mono">256 MB</div>
                </div>
                <div>
                    <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Peers</div>
                    <div className="text-2xl font-mono">12 Nodes</div>
                </div>
                <div>
                    <div className="text-white/40 text-xs uppercase tracking-widest mb-1">GPU Compute</div>
                    <div className="text-2xl font-mono">Idle</div>
                </div>
                <div>
                    <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Storage</div>
                    <div className="text-2xl font-mono">OPFS</div>
                </div>
            </div>
        </div>
        
        {/* Abstract Background Graphic */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </motion.div>

      {/* Quick Launch / Recent */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
            { title: "Minecraft PE", type: "Android", icon: Smartphone, color: "bg-green-500/20 text-green-400" },
            { title: "Notepad++", type: "Windows", icon: Monitor, color: "bg-blue-500/20 text-blue-400" },
            { title: "VS Code", type: "Web", icon: Sliders, color: "bg-purple-500/20 text-purple-400" },
        ].map((app, i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="bellum-card p-6 flex items-center gap-4 cursor-pointer hover:bg-white/5"
            >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${app.color}`}>
                    <app.icon size={24} />
                </div>
                <div>
                    <h3 className="font-bold">{app.title}</h3>
                    <p className="text-sm text-white/40">{app.type} • Local</p>
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={16} />
                </div>
            </motion.div>
        ))}
      </div>

    </div>
  );
};
