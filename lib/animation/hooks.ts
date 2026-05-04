'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  animate,
  createScope,
  createTimeline,
  stagger,
  spring,
  type Scope,
  type Timeline,
} from 'animejs';
import { getGlobalPerformanceMonitor } from './PerformanceMonitor';
import type { AnimationQuality } from './tokens';
import { safeAnimate, presets, addWillChange, removeWillChange } from './engine';
import { DURATIONS, EASINGS } from './tokens';

// ── Re-exports ──
export { animate, createScope, createTimeline, stagger, spring };
export { safeAnimate, presets, DURATIONS, EASINGS };
export type { Scope, Timeline, AnimationQuality };

// ── Legacy compatibility exports ──
export const ease = {
  out: 'out(3)',
  outExpo: 'outExpo',
  inOut: 'inOut(3)',
  inOutExpo: 'inOutExpo',
  spring: spring({ bounce: 0.25, stiffness: 200, damping: 12 }),
  springBouncy: spring({ bounce: 0.6, stiffness: 180, damping: 10 }),
  springGentle: spring({ bounce: 0.1, stiffness: 150, damping: 15 }),
} as const;

export const dur = {
  instant: 80,
  fast: 180,
  base: 350,
  slow: 600,
  reveal: 900,
} as const;

// ── useAnimeScope ──
export function useAnimeScope() {
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    if (!root.current) return;
    scope.current = createScope({ root: root.current }).add(() => {});
    return () => {
      scope.current?.revert();
      scope.current = null;
    };
  }, []);

  const run = useCallback(
    (fn: (s: NonNullable<ReturnType<typeof createScope>>) => void) => {
      if (scope.current) fn(scope.current);
    },
    [],
  );

  return { root, scope, run };
}

// ── useAnime — animate a single element with auto-cleanup ──
export function useAnime(
  ref: React.RefObject<HTMLElement | null>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>,
  deps: React.DependencyList = [],
) {
  const instanceRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    instanceRef.current = safeAnimate(ref.current, params);

    return () => {
      // Cancel any running animation on unmount or dep change
      if (instanceRef.current && typeof instanceRef.current === 'object') {
        // anime.js v4 animations can be paused/cancelled via the returned timeline/animation
        try {
          (instanceRef.current as any).pause?.();
        } catch {
          // Ignore if pause is not available
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return instanceRef;
}

// ── useAnimeTimeline — create a timeline with auto-cleanup ──
export function useAnimeTimeline(
  buildFn: (tl: Timeline) => void,
  deps: React.DependencyList = [],
) {
  const tlRef = useRef<Timeline | null>(null);

  useEffect(() => {
    const tl = createTimeline();
    buildFn(tl);
    tlRef.current = tl;

    return () => {
      // Pause and destroy the timeline on unmount to prevent memory leaks
      // and DOM mutations on detached elements
      try {
        tl.pause?.();
      } catch {
        // anime.js v4 timeline may not expose pause on all instances
      }
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return tlRef;
}

// ── useAnimationQuality — subscribe to quality changes ──
export function useAnimationQuality(): AnimationQuality {
  const [quality, setQuality] = useState<AnimationQuality>('full');

  useEffect(() => {
    const monitor = getGlobalPerformanceMonitor();
    setQuality(monitor.getQuality());
    return monitor.onQualityChange((q) => setQuality(q));
  }, []);

  return quality;
}

// ── useReducedMotion — detect prefers-reduced-motion ──
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

// ── useFps — subscribe to FPS updates ──
export function useFps(): number {
  const [fps, setFps] = useState(60);

  useEffect(() => {
    const monitor = getGlobalPerformanceMonitor();
    return monitor.onFpsUpdate((f) => setFps(Math.round(f)));
  }, []);

  return fps;
}

// ── useScrollReveal — IntersectionObserver + anime.js ──
interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  preset?: 'fadeIn' | 'slideUp' | 'slideInLeft' | 'slideInRight' | 'scaleIn';
  delay?: number;
  staggerChildren?: boolean;
  childSelector?: string;
}

export function useScrollReveal(
  ref: React.RefObject<HTMLElement | null>,
  options: ScrollRevealOptions = {},
) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -40px 0px',
    once = true,
    preset = 'slideUp',
    delay = 0,
    staggerChildren = false,
    childSelector = '[data-reveal]',
  } = options;

  const hasRevealed = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof window === 'undefined') return;

    const el = ref.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (once && hasRevealed.current) return;
            hasRevealed.current = true;

            const presetFn = presets[preset];
            const baseParams = presetFn();

            if (staggerChildren) {
              const children = el.querySelectorAll(childSelector);
              if (children.length > 0) {
                safeAnimate(children, {
                  ...baseParams,
                  delay: stagger(DURATIONS.fast * 0.5, { from: 0, ease: EASINGS.out }),
                });
              } else {
                safeAnimate(el, { ...baseParams, delay });
              }
            } else {
              safeAnimate(el, { ...baseParams, delay });
            }

            if (once) {
              observer.unobserve(el);
            }
          }
        });
      },
      { threshold, rootMargin },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [threshold, rootMargin, once, preset, delay, staggerChildren, childSelector]);
}

// ── usePageTransition — animate when pathname changes, skip first mount ──
export function usePageTransition(ref: React.RefObject<HTMLElement | null>) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip first mount — only animate on actual pathname changes
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      safeAnimate(el, presets.pageEnter());
    }

    return () => {
      // Exit animation on unmount — guard against detached nodes during Next.js route transitions
      if (document.contains(el)) {
        safeAnimate(el, presets.pageExit());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}

// ── useHoverAnime — animate on hover with enter/leave ──
export function useHoverAnime(
  ref: React.RefObject<HTMLElement | null>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enterParams: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  leaveParams: Record<string, any>,
) {
  const instanceRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const cancelPrev = () => {
      if (instanceRef.current && typeof instanceRef.current === 'object') {
        try {
          (instanceRef.current as any).pause?.();
        } catch {
          // Ignore
        }
      }
    };

    const handleEnter = () => {
      cancelPrev();
      instanceRef.current = safeAnimate(el, enterParams);
    };

    const handleLeave = () => {
      cancelPrev();
      instanceRef.current = safeAnimate(el, leaveParams);
    };

    el.addEventListener('mouseenter', handleEnter);
    el.addEventListener('mouseleave', handleLeave);

    return () => {
      el.removeEventListener('mouseenter', handleEnter);
      el.removeEventListener('mouseleave', handleLeave);
      cancelPrev();
    };
  }, [ref, enterParams, leaveParams]);
}

// ── Legacy compatibility functions ──
export function mountReveal(
  targets: string,
  delay: number | ReturnType<typeof stagger> = 0,
) {
  return animate(targets, {
    opacity: [0, 1],
    translateY: [12, 0],
    ease: ease.out,
    duration: dur.reveal,
    delay,
  });
}

export function mountFadeIn(
  targets: string,
  delay: number | ReturnType<typeof stagger> = 0,
) {
  return animate(targets, {
    opacity: [0, 1],
    ease: ease.inOut,
    duration: dur.base,
    delay,
  });
}

export function staggerDefault(gridCols = 6) {
  return stagger(dur.fast, {
    grid: [Math.ceil(gridCols), 1],
    from: 'center',
    ease: ease.out,
  });
}

export function staggerFromStart() {
  return stagger(dur.fast * 0.6, { from: 0, ease: ease.out });
}

export function hoverLift(el: HTMLElement) {
  return animate(el, {
    translateY: -2,
    boxShadow: [
      '0 0 0 0 hsl(var(--foreground) / 0)',
      '0 4px 12px -2px hsl(var(--foreground) / 0.06)',
    ],
    ease: ease.spring,
    duration: dur.fast,
  });
}

export function hoverDrop(el: HTMLElement) {
  return animate(el, {
    translateY: 0,
    boxShadow: '0 0 0 0 hsl(var(--foreground) / 0)',
    ease: ease.out,
    duration: dur.fast,
  });
}

export function scaleIn(
  targets: string,
  delay: number | ReturnType<typeof stagger> = 0,
) {
  return animate(targets, {
    scale: [0.92, 1],
    opacity: [0, 1],
    ease: ease.spring,
    duration: dur.base,
    delay,
  });
}

export function slideInLeft(
  targets: string,
  delay: number | ReturnType<typeof stagger> = 0,
) {
  return animate(targets, {
    translateX: [-20, 0],
    opacity: [0, 1],
    ease: ease.out,
    duration: dur.base,
    delay,
  });
}

export function borderPulse(el: HTMLElement, color: string) {
  return animate(el, {
    borderColor: [
      `hsl(var(--muted-foreground) / 0.2)`,
      color,
      `hsl(var(--muted-foreground) / 0.2)`,
    ],
    ease: 'inOut(2)',
    duration: 2000,
    loop: true,
  });
}

export function counterAnimate(
  targets: string,
  endValue: number,
  duration = dur.slow,
) {
  return animate(targets, {
    innerHTML: [0, endValue],
    round: 1,
    ease: ease.outExpo,
    duration,
  });
}
