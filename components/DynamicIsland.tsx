"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { LayoutGrid, Settings, X, Terminal, Boxes, Sparkles, User } from 'lucide-react';

interface DynamicIslandProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenRunner?: () => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({ activeTab, onTabChange, onOpenRunner }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [idleMs, setIdleMs] = useState<number>(0);
  const lastActiveRef = useRef<number>(Date.now());

  useEffect(() => {
    const onAnyActivity = () => {
      lastActiveRef.current = Date.now();
      setIdleMs(0);
    };

    window.addEventListener('mousemove', onAnyActivity);
    window.addEventListener('keydown', onAnyActivity);
    window.addEventListener('pointerdown', onAnyActivity);

    const idleTimer = window.setInterval(() => {
      setIdleMs(Date.now() - lastActiveRef.current);
    }, 250);

    return () => {
      window.removeEventListener('mousemove', onAnyActivity);
      window.removeEventListener('keydown', onAnyActivity);
      window.removeEventListener('pointerdown', onAnyActivity);
      window.clearInterval(idleTimer);
    };
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    // Collapse after inactivity
    if (idleMs > 4500) setIsExpanded(false);
  }, [idleMs, isExpanded]);

  const primaryNav = useMemo(
    () => [
      { id: 'home', icon: LayoutGrid, label: 'Home' },
      { id: 'apps', icon: Boxes, label: 'Apps' },
      { id: 'runner', icon: Terminal, label: 'Run' },
      { id: 'xfabric', icon: Sparkles, label: 'XFabric' },
    ],
    [],
  );

  const activeLabel = useMemo(() => {
    return primaryNav.find((x) => x.id === activeTab)?.label ?? 'Nacho';
  }, [activeTab, primaryNav]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 select-none">
      <motion.div
        layout
        initial={false}
        animate={{
          width: isExpanded ? 460 : 210,
          height: isExpanded ? 186 : 40,
          borderRadius: isExpanded ? 34 : 999,
        }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="bg-[rgba(41,44,60,0.88)] backdrop-blur-xl border-2 border-white/10 shadow-2xl overflow-hidden relative"
        onMouseEnter={() => { lastActiveRef.current = Date.now(); }}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {!isExpanded && (
          <motion.div
            className="w-full h-full flex items-center justify-center gap-3 px-4 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white/10">
              <Image
                src="/branding/nacho.jpeg"
                alt="Nacho"
                width={28}
                height={28}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-white/95 tracking-wide">Nacho</span>
              <span className="text-xs text-white/45">{activeLabel}</span>
            </div>
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
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/10">
                    <Image
                      src="/branding/nacho.jpeg"
                      alt="Nacho"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      priority
                    />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <div className="font-bold text-base">Nacho</div>
                    <div className="text-[11px] text-white/45">{activeLabel}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange('account');
                      setIsExpanded(false);
                    }}
                    className="p-2 rounded-full border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                    title="Account"
                  >
                    <User size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange('settings');
                      setIsExpanded(false);
                    }}
                    className="p-2 rounded-full border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                    title="Settings"
                  >
                    <Settings size={16} />
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

              <div className="grid grid-cols-4 gap-2 mb-3">
                {primaryNav.map((item) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'runner') onOpenRunner?.();
                      onTabChange(item.id);
                      setIsExpanded(false);
                    }}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
