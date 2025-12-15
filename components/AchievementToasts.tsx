'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ACHIEVEMENTS, type AchievementId, subscribeAchievements } from '@/lib/gamification/achievements';

type Toast = { id: AchievementId; key: string; at: number };

export function AchievementToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const meta = useMemo(() => {
    const m = new Map<AchievementId, { title: string; description: string; points: number }>();
    for (const a of ACHIEVEMENTS) m.set(a.id, { title: a.title, description: a.description, points: a.points });
    return m;
  }, []);

  useEffect(() => {
    const onEvent = (e: any) => {
      const id = (e?.detail?.id || '') as AchievementId;
      if (!meta.has(id)) return;
      const t: Toast = { id, key: `${id}-${Date.now()}`, at: Date.now() };
      setToasts((prev) => [t, ...prev].slice(0, 3));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.key !== t.key));
      }, 4500);
    };

    window.addEventListener('bellum:achievement' as any, onEvent);
    const unsub = subscribeAchievements(() => {});
    return () => {
      window.removeEventListener('bellum:achievement' as any, onEvent);
      unsub();
    };
  }, [meta]);

  return (
    <div className="fixed bottom-6 right-6 z-[80] w-[320px] space-y-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const m = meta.get(t.id);
          if (!m) return null;
          return (
            <motion.div
              key={t.key}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bellum-card border-2 border-white/10 bg-[rgba(41,44,60,0.94)] backdrop-blur-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-[rgb(186,187,241)]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-widest text-white/45 font-bold">Achievement unlocked</div>
                  <div className="font-extrabold text-white leading-tight mt-1">{m.title}</div>
                  <div className="text-xs text-white/55 mt-1">{m.description}</div>
                </div>
                <div className="ml-auto text-xs font-mono text-emerald-200">+{m.points}</div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
