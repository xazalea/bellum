'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Monitor, Layers } from 'lucide-react';

/**
 * Nacho VM Manager
 * (Legacy view; kept for compatibility)
 */
export function VMManager() {
  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Nacho VM Manager</h2>
        <p className="text-white/50">Local and distributed VM orchestration (coming online).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[{
          title: 'CPU Virtualization',
          icon: Cpu,
          desc: 'x86 / ARM translation pipeline'
        }, {
          title: 'Display',
          icon: Monitor,
          desc: 'WebGPU surfaces + compositing'
        }, {
          title: 'Scheduler',
          icon: Layers,
          desc: 'Multi-VM orchestration + P2P offload'
        }].map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bellum-card p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <card.icon size={18} className="text-white" />
              </div>
              <div className="font-bold">{card.title}</div>
            </div>
            <div className="text-sm text-white/50">{card.desc}</div>
          </motion.div>
        ))}
      </div>

      <div className="bellum-card p-6">
        <div className="text-sm text-white/60">
          This panel is not currently wired into the Dynamic Island navigation.
        </div>
      </div>
    </div>
  );
}
