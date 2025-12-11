"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Shield, Database, Wifi, Monitor, Cpu, Code } from 'lucide-react';

export const SettingsPanel = () => {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'performance', label: 'Performance', icon: Cpu },
    { id: 'network', label: 'Network', icon: Wifi },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'developer', label: 'Developer', icon: Code },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 flex gap-8 min-h-screen">
      
      {/* Sidebar */}
      <div className="w-64 flex flex-col gap-2">
        <h2 className="text-2xl font-bold mb-6 px-4">Settings</h2>
        {tabs.map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    activeTab === tab.id 
                    ? 'bg-white text-black font-semibold shadow-lg shadow-white/10' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
            >
                <tab.icon size={18} />
                <span>{tab.label}</span>
            </button>
        ))}
      </div>

      {/* Main Content */}
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 space-y-6"
      >
        <div className="bellum-card p-8 space-y-8">
            {/* Header */}
            <div>
                <h3 className="text-xl font-bold mb-2">System Configuration</h3>
                <p className="text-white/40 text-sm">Manage your runtime environment and preferences.</p>
            </div>

            {/* Example Settings Section */}
            <div className="space-y-6">
                
                {/* Toggle Group */}
                <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold">Runtime Features</h4>
                    
                    {[
                        { label: 'WebGPU Acceleration', desc: 'Use hardware graphics acceleration via WGSL' },
                        { label: 'P2P Cluster Discovery', desc: 'Automatically connect to local mesh peers' },
                        { label: 'Persistent OPFS Storage', desc: 'Save app data to Origin Private File System' }
                    ].map((setting, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                            <div>
                                <div className="font-semibold">{setting.label}</div>
                                <div className="text-xs text-white/40">{setting.desc}</div>
                            </div>
                            
                            {/* Toggle Switch */}
                            <div className="w-12 h-6 bg-blue-500 rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Group */}
                <div className="space-y-4 pt-6 border-t border-white/5">
                     <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold">Performance Tuning</h4>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-2 text-white/70">Max WASM Memory (MB)</label>
                            <input type="number" className="bellum-input" defaultValue={4096} />
                        </div>
                        <div>
                            <label className="block text-sm mb-2 text-white/70">Thread Pool Size</label>
                            <input type="number" className="bellum-input" defaultValue={8} />
                        </div>
                     </div>
                </div>

                {/* Pro / Advanced Mode */}
                <div className="pt-6 border-t border-white/5">
                    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-6 rounded-xl border border-blue-500/20">
                        <div className="flex items-center gap-3 mb-2">
                            <Shield size={20} className="text-blue-400" />
                            <h4 className="font-bold text-blue-100">Pro Mode</h4>
                        </div>
                        <p className="text-sm text-blue-200/60 mb-4">
                            Unlock experimental features including direct kernel access and unsafe JIT optimizations.
                        </p>
                        <button className="bellum-btn text-sm py-2 px-4">
                            Enable Advanced Features
                        </button>
                    </div>
                </div>

            </div>
        </div>
      </motion.div>
    </div>
  );
};
