'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, Trash2 } from 'lucide-react';
import { getWebVM } from '@/lib/code-execution/webvm';

type CellType = 'markdown' | 'python';
type Cell = {
  id: string;
  type: CellType;
  source: string;
  output?: string;
  error?: string;
  running?: boolean;
};

function newCell(type: CellType): Cell {
  return { id: crypto.randomUUID(), type, source: type === 'python' ? 'print("hello from notebook")' : '# Notebook' };
}

export function NotebookPanel() {
  const [cells, setCells] = useState<Cell[]>(() => {
    try {
      const raw = window.localStorage.getItem('bellum.notebook.v1');
      if (raw) return JSON.parse(raw) as Cell[];
    } catch {
      // ignore
    }
    return [newCell('markdown'), newCell('python')];
  });
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem('bellum.notebook.v1', JSON.stringify(cells));
      } catch {
        // ignore
      }
    }, 250);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    };
  }, [cells]);

  const runAll = async () => {
    setBusy(true);
    try {
      const vm = getWebVM();
      if (!vm) throw new Error('WebVM not available');

      // Execute python cells sequentially (deterministic + avoids overlapping Pyodide init).
      for (const c of cells) {
        if (c.type !== 'python') continue;
        setCells((prev) => prev.map((x) => (x.id === c.id ? { ...x, running: true, error: undefined } : x)));
        const res = await vm.executeCode('python', c.source);
        setCells((prev) =>
          prev.map((x) =>
            x.id === c.id
              ? {
                  ...x,
                  running: false,
                  output: (res.stdout || '').trim(),
                  error: res.exitCode === 0 ? undefined : (res.stderr || '').trim() || `exit ${res.exitCode}`,
                }
              : x,
          ),
        );
      }
    } catch (e: any) {
      // Global error (don’t nuke cell state)
      // eslint-disable-next-line no-console
      console.warn('Notebook run failed', e);
    } finally {
      setBusy(false);
    }
  };

  const add = (type: CellType) => setCells((p) => [...p, newCell(type)]);
  const remove = (id: string) => setCells((p) => p.filter((c) => c.id !== id));

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 space-y-6 min-h-screen">
      <div className="bellum-card p-7 border-2 border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40 font-bold">Notebook</div>
            <div className="text-3xl font-extrabold tracking-tight text-white mt-2">Jupyter-like cells (browser)</div>
            <div className="text-sm text-white/55 mt-2 max-w-3xl">
              Runs Python in-browser via the existing WebVM/Pyodide executor. Designed to stay smooth: sequential execution and lazy init.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm font-bold inline-flex items-center gap-2" onClick={() => add('python')}>
              <Plus size={16} /> Python
            </button>
            <button className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm font-bold inline-flex items-center gap-2" onClick={() => add('markdown')}>
              <Plus size={16} /> Markdown
            </button>
            <button className="bellum-btn inline-flex items-center gap-2 disabled:opacity-50" onClick={() => void runAll()} disabled={busy}>
              <Play size={16} /> Run all
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {cells.map((c, idx) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bellum-card p-5 border-2 border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-widest text-white/40 font-bold">
                {idx + 1}. {c.type}
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-xs font-bold inline-flex items-center gap-2"
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>

            <textarea
              className="mt-3 bellum-input font-mono text-sm min-h-[120px]"
              value={c.source}
              onChange={(e) => setCells((p) => p.map((x) => (x.id === c.id ? { ...x, source: e.target.value } : x)))}
              placeholder={c.type === 'python' ? 'print("hello")' : '# Markdown'}
            />

            {c.type === 'python' && (
              <div className="mt-3">
                <div className="text-xs uppercase tracking-widest text-white/40 font-bold">Output</div>
                <pre className="mt-2 w-full max-h-64 overflow-auto bg-black/30 border border-white/10 rounded p-3 text-[12px] text-white/80">
                  {c.running ? 'running…' : c.error ? `error: ${c.error}\n${c.output || ''}` : c.output || '(no output)'}
                </pre>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}


