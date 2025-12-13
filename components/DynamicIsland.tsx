"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Activity, Settings, X, Terminal, Globe, Boxes, User } from 'lucide-react';

interface DynamicIslandProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenRunner?: () => void;
}

function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(1)}GB`;
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)}MB`;
  const kb = 1024;
  if (bytes >= kb) return `${(bytes / kb).toFixed(0)}KB`;
  return `${bytes}B`;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({ activeTab, onTabChange, onOpenRunner }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [idleMs, setIdleMs] = useState<number>(0);
  const lastActiveRef = useRef<number>(Date.now());

  // Lightweight, real metrics (best-effort): memory + event-loop delay
  const [memUsed, setMemUsed] = useState<number | null>(null);
  const [loopDelayMs, setLoopDelayMs] = useState<number | null>(null);

  useEffect(() => {
    const onAnyActivity = () => {
      lastActiveRef.current = Date.now();
      setIdleMs(0);
    };

    window.addEventListener('mousemove', onAnyActivity);
    window.addEventListener('keydown', onAnyActivity);
    window.addEventListener('pointerdown', onAnyActivity);

    const memTimer = window.setInterval(() => {
      // performance.memory is Chromium-only
      const anyPerf = performance as any;
      if (anyPerf?.memory?.usedJSHeapSize) {
        setMemUsed(anyPerf.memory.usedJSHeapSize);
      } else {
        setMemUsed(null);
      }
    }, 1000);

    // Event loop delay approximation
    let expected = performance.now() + 250;
    const loopTimer = window.setInterval(() => {
      const now = performance.now();
      const drift = Math.max(0, now - expected);
      setLoopDelayMs(Math.round(drift));
      expected = now + 250;
    }, 250);

    const idleTimer = window.setInterval(() => {
      setIdleMs(Date.now() - lastActiveRef.current);
    }, 250);

    return () => {
      window.removeEventListener('mousemove', onAnyActivity);
      window.removeEventListener('keydown', onAnyActivity);
      window.removeEventListener('pointerdown', onAnyActivity);
      window.clearInterval(memTimer);
      window.clearInterval(loopTimer);
      window.clearInterval(idleTimer);
    };
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    // Collapse after inactivity
    if (idleMs > 4500) setIsExpanded(false);
  }, [idleMs, isExpanded]);

  const navItems = useMemo(() => [
    { id: 'home', icon: LayoutGrid, label: 'Home' },
    { id: 'apps', icon: Boxes, label: 'Apps' },
    { id: 'archives', icon: Globe, label: 'Archives' },
    { id: 'account', icon: User, label: 'Account' },
    { id: 'cluster', icon: Activity, label: 'Cluster' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ], []);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 select-none">
      <motion.div
        layout
        initial={false}
        animate={{
          width: isExpanded ? 520 : 172,
          height: isExpanded ? 248 : 40,
          borderRadius: isExpanded ? 34 : 999,
        }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="bg-[#020612]/85 backdrop-blur-xl border-2 border-white/15 shadow-2xl overflow-hidden relative"
        onMouseEnter={() => { lastActiveRef.current = Date.now(); }}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {!isExpanded && (
          <motion.div
            className="w-full h-full flex items-center justify-center gap-3 px-4 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.7)]" />
            <span className="text-sm font-semibold text-white/95 tracking-wide">Nacho</span>
            <div className="w-[1px] h-4 bg-white/20" />
            <Terminal size={14} className="text-white/70" />
          </motion.div>
        )}

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5 w-full h-full flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.7)]" />
                  <div className="font-bold text-base">NachoOS</div>
                  <div className="text-[11px] text-white/50 font-mono">{memUsed ? `heap ${formatBytes(memUsed)}` : 'heap n/a'}</div>
                  <div className="text-[11px] text-white/50 font-mono">{loopDelayMs !== null ? `lag ${loopDelayMs}ms` : 'lag n/a'}</div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Runner quick action (icon only) */}
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRunner?.();
                      onTabChange('runner');
                      setIsExpanded(false);
                    }}
                    className="p-2 rounded-full border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                    title="Run"
                  >
                    <Terminal size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="p-2 rounded-full border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2 mb-3">
                {navItems.map((item) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      setIsExpanded(false);
                    }}
                    whileHover={{ y: -2, scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex flex-col items-center gap-2 p-2 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                      activeTab === item.id
                        ? 'bg-white text-black border-white'
                        : 'text-white/70 border-white/10 hover:border-white/35 hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{item.label}</span>
                  </motion.button>
                ))}
              </div>

              <div className="mt-auto pt-3 border-t border-white/10 flex justify-between text-[11px] text-white/45 font-mono">
                <span>runtime: online</span>
                <span>cluster: connecting</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
