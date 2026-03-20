'use client';
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface FPSStats {
  fps: number;
  onePercentLow: number;
  memoryMB: number | null;
}

const RING_SIZE = 30;

export function FPSCounter({ className }: { className?: string }) {
  const [stats, setStats] = useState<FPSStats>({ fps: 0, onePercentLow: 0, memoryMB: null });
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    let running = true;

    function tick(now: number) {
      if (!running) return;

      if (lastTimeRef.current !== 0) {
        const delta = now - lastTimeRef.current;
        frameTimesRef.current.push(delta);
        if (frameTimesRef.current.length > RING_SIZE) {
          frameTimesRef.current.shift();
        }
      }
      lastTimeRef.current = now;

      if (now - lastUpdateRef.current >= 500) {
        lastUpdateRef.current = now;
        const times = frameTimesRef.current;
        if (times.length > 0) {
          const avgDelta = times.reduce((a, b) => a + b, 0) / times.length;
          const fps = Math.round(1000 / avgDelta);

          const sorted = [...times].sort((a, b) => b - a);
          const worstCount = Math.max(1, Math.ceil(times.length * 0.01));
          const worstTimes = sorted.slice(0, worstCount);
          const avgWorst = worstTimes.reduce((a, b) => a + b, 0) / worstTimes.length;
          const onePercentLow = Math.round(1000 / avgWorst);

          let memoryMB: number | null = null;
          const perf = performance as Performance & {
            memory?: { usedJSHeapSize: number };
          };
          if (perf.memory) {
            memoryMB = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
          }

          setStats({ fps, onePercentLow, memoryMB });
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const fpsColor =
    stats.fps >= 40
      ? 'text-green-400'
      : stats.fps >= 30
      ? 'text-yellow-400'
      : 'text-red-400';

  return (
    <div
      className={cn(
        'rounded-full px-3 py-1 text-xs font-mono',
        'bg-black/60 backdrop-blur-sm border border-white/10',
        fpsColor,
        className,
      )}
    >
      <span>{stats.fps} FPS</span>
      <span className="text-white/40 mx-1">|</span>
      <span>1% {stats.onePercentLow}</span>
      {stats.memoryMB !== null && (
        <>
          <span className="text-white/40 mx-1">|</span>
          <span className="text-white/70">{stats.memoryMB}MB</span>
        </>
      )}
    </div>
  );
}
