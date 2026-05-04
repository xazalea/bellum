'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getGlobalPerformanceMonitor } from '@/lib/animation/PerformanceMonitor';
import type { AnimationQuality } from '@/lib/animation/tokens';

interface AnimationContextValue {
  quality: AnimationQuality;
  reducedMotion: boolean;
  fps: number;
}

const AnimationContext = createContext<AnimationContextValue>({
  quality: 'full',
  reducedMotion: false,
  fps: 60,
});

export function useAnimationContext() {
  return useContext(AnimationContext);
}

interface AnimationProviderProps {
  children: ReactNode;
  enableMonitoring?: boolean;
}

export function AnimationProvider({ children, enableMonitoring = true }: AnimationProviderProps) {
  const [quality, setQuality] = useState<AnimationQuality>('full');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect reduced motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const motionHandler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', motionHandler);

    if (enableMonitoring) {
      const monitor = getGlobalPerformanceMonitor();
      monitor.start();

      // Subscribe to quality changes
      const unsubQuality = monitor.onQualityChange((q) => setQuality(q));

      // Subscribe to FPS updates
      const unsubFps = monitor.onFpsUpdate((f) => setFps(Math.round(f)));

      // Initial values
      setQuality(monitor.getQuality());

      return () => {
        mq.removeEventListener('change', motionHandler);
        unsubQuality();
        unsubFps();
        monitor.stop();
      };
    }

    return () => {
      mq.removeEventListener('change', motionHandler);
    };
  }, [enableMonitoring]);

  return (
    <AnimationContext.Provider value={{ quality, reducedMotion, fps }}>
      {children}
    </AnimationContext.Provider>
  );
}
