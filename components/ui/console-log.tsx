'use client';

import { useState, useEffect, useRef } from 'react';

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  message: string;
  source?: string;
}

interface ConsoleLogProps {
  logs?: LogEntry[];
  maxLines?: number;
  className?: string;
  showTimestamp?: boolean;
  autoScroll?: boolean;
}

const levelColors: Record<string, string> = {
  info: 'text-foreground/70',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  debug: 'text-muted-foreground/50',
  success: 'text-green-400',
};

const levelLabels: Record<string, string> = {
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
  debug: 'DBG',
  success: 'OK ',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export function ConsoleLog({
  logs: externalLogs,
  maxLines = 200,
  className,
  showTimestamp = true,
  autoScroll = true,
}: ConsoleLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>(externalLogs || []);
  const [filter, setFilter] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  // Update from external logs
  useEffect(() => {
    if (externalLogs) {
      setLogs(externalLogs.slice(-maxLines));
    }
  }, [externalLogs, maxLines]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Demo logs if none provided
  useEffect(() => {
    if (externalLogs) return;
    const demoLogs: LogEntry[] = [
      { timestamp: Date.now() - 5000, level: 'info', message: 'Initializing runtime...', source: 'boot' },
      { timestamp: Date.now() - 4500, level: 'success', message: 'WebGL2 context acquired', source: 'gpu' },
      { timestamp: Date.now() - 4000, level: 'info', message: 'Loading DEX bytecode (2.1MB)', source: 'loader' },
      { timestamp: Date.now() - 3500, level: 'debug', message: 'JIT compilation started for hot paths', source: 'jit' },
      { timestamp: Date.now() - 3000, level: 'info', message: 'Frame pacing initialized (target: 60fps)', source: 'render' },
      { timestamp: Date.now() - 2500, level: 'warn', message: 'Memory pressure detected, switching to interpreter', source: 'memory' },
      { timestamp: Date.now() - 2000, level: 'info', message: 'Activity resumed: MainActivity', source: 'runtime' },
      { timestamp: Date.now() - 1500, level: 'success', message: 'Application running at 42 FPS', source: 'perf' },
    ];
    setLogs(demoLogs);
  }, [externalLogs]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-card/50">
        <div className="flex gap-0.5">
          {['all', 'info', 'warn', 'error', 'success'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-1.5 h-5 text-[9px] font-mono font-medium transition-colors ${
                filter === f
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground/50 hover:text-muted-foreground'
              }`}
            >
              {f === 'all' ? 'ALL' : levelLabels[f]}
            </button>
          ))}
        </div>
        <div className="ml-auto text-[9px] text-muted-foreground/30 font-mono">
          {filtered.length} lines
        </div>
      </div>

      {/* Log content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden font-mono text-[11px] leading-relaxed"
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] text-muted-foreground/30">No logs</span>
          </div>
        ) : (
          filtered.map((log, i) => (
            <div
              key={i}
              className="flex gap-2 px-3 py-0.5 hover:bg-accent/30 transition-colors"
            >
              {showTimestamp && (
                <span className="text-muted-foreground/30 shrink-0 tabular-nums">
                  {formatTime(log.timestamp)}
                </span>
              )}
              <span className={`shrink-0 font-bold ${levelColors[log.level]}`}>
                [{levelLabels[log.level]}]
              </span>
              {log.source && (
                <span className="text-muted-foreground/40 shrink-0">
                  &lt;{log.source}&gt;
                </span>
              )}
              <span className={`break-all ${levelColors[log.level]}`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
