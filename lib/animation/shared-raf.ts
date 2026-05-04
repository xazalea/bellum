"use client";

/**
 * Shared requestAnimationFrame scheduler.
 *
 * All UI animations register callbacks here instead of calling
 * requestAnimationFrame directly. The emulator receives priority
 * (first in the tick queue), while UI animations are serviced
 * from a single RAF loop to avoid creating many parallel loops.
 *
 * Usage:
 *   const raf = useSharedRaf();
 *   raf.subscribe(id, callback);       // register callback
 *   raf.subscribe(id, callback, { priority: "high" });  // run before UI
 *   raf.unsubscribe(id);               // remove callback
 *   raf.start(); / raf.stop();         // control the loop
 */

import { useRef, useEffect, useCallback } from "react";

type Priority = "high" | "normal"; // high = emulator, normal = UI

interface Subscriber {
  id: string;
  callback: FrameRequestCallback;
  priority: Priority;
}

interface SharedRafHandle {
  subscribe: (id: string, callback: FrameRequestCallback, opts?: { priority?: Priority }) => void;
  unsubscribe: (id: string) => void;
  start: () => void;
  stop: () => void;
  readonly isRunning: boolean;
}

class RafScheduler implements SharedRafHandle {
  private subscribers = new Map<string, Subscriber>();
  private rafId: number | null = null;
  private running = false;

  get isRunning(): boolean {
    return this.running;
  }

  subscribe(id: string, callback: FrameRequestCallback, opts?: { priority?: Priority }): void {
    this.subscribers.set(id, { id, callback, priority: opts?.priority ?? "normal" });
    if (!this.running) this.start();
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = () => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame((time: DOMHighResTimeStamp) => {
      // Run high-priority subscribers first (emulator)
      const subs = Array.from(this.subscribers.values());
      const high = subs.filter(s => s.priority === "high");
      const normal = subs.filter(s => s.priority === "normal");

      for (const s of high) {
        try { s.callback(time); } catch (e) { console.warn('[RafScheduler] high-priority callback error:', e); }
      }
      for (const s of normal) {
        try { s.callback(time); } catch (e) { console.warn('[RafScheduler] normal callback error:', e); }
      }

      // Stop the loop when no subscribers remain to avoid burning RAF cycles
      if (this.subscribers.size === 0) {
        this.stop();
        return;
      }

      this.tick();
    });
  };
}

// Singleton scheduler shared across the app
let globalScheduler: RafScheduler | null = null;

function getGlobalScheduler(): RafScheduler {
  if (!globalScheduler) {
    globalScheduler = new RafScheduler();
    if (typeof window !== "undefined") {
      globalScheduler.start();
    }
  }
  return globalScheduler;
}

/**
 * React hook to get the shared RAF scheduler.
 * Auto-starts the global loop on mount and cleans up only when
 * the last subscriber is removed (via the singleton).
 */
export function useSharedRaf(): SharedRafHandle {
  const schedulerRef = useRef<RafScheduler | null>(null);

  useEffect(() => {
    schedulerRef.current = getGlobalScheduler();
    return () => {
      // Don't stop the global loop here — other components may still use it.
      // Individual components should unsubscribe their callbacks.
    };
  }, []);

  const subscribe = useCallback(
    (id: string, callback: FrameRequestCallback, opts?: { priority?: Priority }) => {
      const s = schedulerRef.current || getGlobalScheduler();
      s.subscribe(id, callback, opts);
    },
    []
  );

  const unsubscribe = useCallback((id: string) => {
    const s = schedulerRef.current;
    if (s) s.unsubscribe(id);
  }, []);

  const start = useCallback(() => {
    const s = schedulerRef.current || getGlobalScheduler();
    s.start();
  }, []);

  const stop = useCallback(() => {
    const s = schedulerRef.current;
    if (s) s.stop();
  }, []);

  return {
    subscribe,
    unsubscribe,
    start,
    stop,
    get isRunning() {
      return schedulerRef.current?.isRunning ?? false;
    },
  };
}

export type { SharedRafHandle, Priority };
