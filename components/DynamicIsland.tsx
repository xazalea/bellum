"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Cpu, Activity, Settings, X, Terminal, Globe, Maximize2 } from 'lucide-react';

interface DynamicIslandProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({ activeTab, onTabChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    { id: 'home', icon: LayoutGrid, label: 'Home' },
    { id: 'library', icon: Cpu, label: 'Library' },
    { id: 'runner', icon: Terminal, label: 'Runner' },
    { id: 'cluster', icon: Globe, label: 'Cluster' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <motion.div
        layout
        initial={false}
        animate={{
          width: isExpanded ? 480 : 160,
          height: isExpanded ? 220 : 44,
          borderRadius: isExpanded ? 32 : 22,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        className="bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden relative cursor-pointer"
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {/* Collapsed State Content */}
        {!isExpanded && (
          <motion.div 
            className="w-full h-full flex items-center justify-center gap-3 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold text-white/90">BellumOS</span>
            <div className="w-[1px] h-4 bg-white/20" />
            <Activity size={14} className="text-white/70" />
          </motion.div>
        )}

        {/* Expanded State Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 w-full h-full flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-bold text-lg">System Active</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Grid */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabChange(item.id);
                      setIsExpanded(false);
                    }}
                    className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                      activeTab === item.id 
                        ? 'bg-white text-black scale-105' 
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Quick Stats Footer */}
              <div className="mt-auto pt-4 border-t border-white/10 flex justify-between text-xs text-white/40 font-mono">
                <span>CPU: 12%</span>
                <span>MEM: 2.4GB</span>
                <span>GPU: 45%</span>
                <span>NET: P2P</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
