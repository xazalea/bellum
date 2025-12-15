'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { ACHIEVEMENTS, getAchievementProgress, isUnlocked, subscribeAchievements } from '@/lib/gamification/achievements';

export function AchievementsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const unsub = subscribeAchievements(() => setTick((t) => t + 1));
    return () => unsub();
  }, [open]);

  const progress = useMemo(() => {
    void tick;
    return getAchievementProgress();
  }, [tick]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-20"
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="w-full max-w-2xl bellum-card border-2 border-white/10 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
                  <Trophy size={18} className="text-amber-200" />
                </div>
                <div>
                  <div className="font-extrabold text-white">Achievements</div>
                  <div className="text-xs text-white/45 font-mono">
                    {progress.unlocked}/{progress.total} unlocked • XP {progress.xp}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((a) => {
                const ok = isUnlocked(a.id);
                return (
                  <div
                    key={a.id}
                    className={`rounded-2xl border-2 p-4 ${ok ? 'border-white/10 bg-white/5' : 'border-white/10 bg-black/20 opacity-80'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-white">{a.title}</div>
                        <div className="text-xs text-white/55 mt-1">{a.description}</div>
                      </div>
                      <div className={`text-xs font-mono ${ok ? 'text-emerald-200' : 'text-white/35'}`}>+{a.points}</div>
                    </div>
                    <div className="mt-3 text-[11px] font-mono">
                      {ok ? <span className="text-emerald-200">unlocked</span> : <span className="text-white/35">locked</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
