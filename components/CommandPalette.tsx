'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';

export type CommandItem = {
  id: string;
  label: string;
  keywords?: string;
  hint?: string;
  onSelect: () => void;
};

export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it.label} ${it.keywords || ''} ${it.hint || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIdx(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      }
      if (e.key === 'Enter') {
        const it = filtered[activeIdx];
        if (!it) return;
        it.onSelect();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, activeIdx, filtered, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-24"
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="w-full max-w-xl bellum-card border-2 border-white/10 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
                  <Search size={16} className="text-white/70" />
                </div>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search actions…"
                  className="flex-1 bg-transparent outline-none text-white placeholder:text-white/35"
                />
                <div className="text-[11px] text-white/35 font-mono">esc</div>
              </div>
            </div>

            <div className="max-h-[340px] overflow-auto p-2">
              {filtered.length === 0 ? (
                <div className="p-6 text-sm text-white/45">No matches.</div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((it, idx) => (
                    <button
                      key={it.id}
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => {
                        it.onSelect();
                        onClose();
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-colors ${
                        idx === activeIdx
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent text-white border-transparent hover:border-white/15 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-sm truncate">{it.label}</div>
                        {it.hint ? <div className="text-xs opacity-70 truncate">{it.hint}</div> : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-white/10 bg-white/5 text-xs text-white/45 flex items-center justify-between">
              <div>
                <span className="font-mono text-white/60">⌘K</span> / <span className="font-mono text-white/60">Ctrl+K</span> to toggle
              </div>
              <div className="font-mono">↑ ↓ enter</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
