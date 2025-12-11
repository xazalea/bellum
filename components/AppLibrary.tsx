"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, MoreVertical, Smartphone, Monitor } from 'lucide-react';

export const AppLibrary = () => {
  const apps = [
    { id: 1, name: 'Minecraft', version: '1.20', size: '150MB', type: 'Android', icon: 'M' },
    { id: 2, name: 'WinAmp', version: '5.66', size: '20MB', type: 'Windows', icon: 'W' },
    { id: 3, name: 'Termux', version: '0.118', size: '45MB', type: 'Android', icon: 'T' },
    { id: 4, name: 'Paint.NET', version: '4.3', size: '200MB', type: 'Windows', icon: 'P' },
    { id: 5, name: 'RetroArch', version: '1.16', size: '300MB', type: 'Android', icon: 'R' },
    { id: 6, name: '7-Zip', version: '23.01', size: '5MB', type: 'Windows', icon: '7' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 min-h-screen">
      
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h2 className="text-3xl font-bold">Library</h2>
            <p className="text-white/40">{apps.length} Applications Installed</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <input 
                    type="text" 
                    placeholder="Search apps..." 
                    className="bellum-input pl-10 py-2"
                />
            </div>
            <button className="bellum-btn-secondary p-2 rounded-lg border-white/20">
                <Filter size={20} />
            </button>
        </div>
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {apps.map((app, i) => (
            <motion.div
                key={app.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bellum-card p-6 flex flex-col gap-4 group cursor-pointer relative"
            >
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold
                        ${app.type === 'Android' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {app.icon}
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded">
                        <MoreVertical size={16} />
                    </button>
                </div>

                {/* Info */}
                <div>
                    <h3 className="font-bold text-lg group-hover:text-blue-400 transition-colors">{app.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                        {app.type === 'Android' ? <Smartphone size={12} /> : <Monitor size={12} />}
                        <span>{app.type}</span>
                        <span>•</span>
                        <span>v{app.version}</span>
                    </div>
                </div>

                {/* Actions (Slide up on hover) */}
                <div className="pt-4 mt-auto border-t border-white/5 flex justify-between items-center text-xs font-mono text-white/40">
                    <span>{app.size}</span>
                    <span className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">Ready</span>
                </div>
            </motion.div>
        ))}
        
        {/* Add New Card */}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bellum-card border-dashed border-white/10 flex flex-col items-center justify-center gap-4 min-h-[200px] hover:border-white/40 cursor-pointer"
        >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Download size={24} className="text-white/60" />
            </div>
            <p className="font-medium text-white/60">Install Local File</p>
        </motion.div>
      </div>
    </div>
  );
};
