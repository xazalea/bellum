'use client';

import {
  animate,
  createScope,
  createTimeline,
  stagger,
  spring,
  type Scope,
  type Timeline,
} from 'animejs';
import {
  DURATIONS,
  EASINGS,
  type AnimationQuality,
  QUALITY_CONFIG,
  applyQualityDuration,
  getQualityEasing,
  isGpuSafe,
} from './tokens';
import { getGlobalPerformanceMonitor } from './PerformanceMonitor';

export { animate, createScope, createTimeline, stagger, spring };
export { DURATIONS, EASINGS };
export type { AnimationQuality, Scope, Timeline };

// ── Will-change tracking ──
const willChangeElements = new WeakSet<Element>();

export function addWillChange(el: HTMLElement, properties: string[]): void {
  const safeProps = properties.filter(isGpuSafe);
  if (safeProps.length > 0 && !willChangeElements.has(el)) {
    el.style.willChange = safeProps.join(', ');
    willChangeElements.add(el);
  }
}

export function removeWillChange(el: HTMLElement): void {
  if (willChangeElements.has(el)) {
    el.style.willChange = 'auto';
    willChangeElements.delete(el);
  }
}

// ── Quality-aware animation wrapper ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeAnimate(
  targets: any,
  params: Record<string, any>,
): ReturnType<typeof animate> | null {
  const monitor = typeof window !== 'undefined' ? getGlobalPerformanceMonitor() : null;
  const quality = monitor?.getQuality() ?? 'full';

  if (quality === 'minimal' && (params.duration ?? 0) > 0) {
    // Only allow opacity changes in minimal mode
    const allowedProps = Object.keys(params).filter(
      k => k === 'opacity' || k === 'delay' || k === 'duration' || k === 'ease'
    );
    if (allowedProps.length === 0) {
      // Instant set for all target types
      const applyInstant = (el: Element) => {
        if (el instanceof HTMLElement) {
          Object.entries(params).forEach(([key, value]) => {
            if (key !== 'duration' && key !== 'delay' && key !== 'ease') {
              (el.style as any)[key] = Array.isArray(value) ? String(value[1]) : String(value);
            }
          });
        }
      };
      if (typeof targets === 'string') {
        document.querySelectorAll(targets).forEach(applyInstant);
      } else if (targets instanceof NodeList || Array.isArray(targets)) {
        Array.from(targets).forEach(applyInstant);
      } else if (targets instanceof HTMLElement) {
        applyInstant(targets);
      }
      return null;
    }
  }

  const adjustedParams = {
    ...params,
    duration: applyQualityDuration(params.duration ?? DURATIONS.base, quality),
  };

  if (params.ease && typeof params.ease === 'string') {
    // Easing is already handled by anime.js — we can't easily swap string easings
    // but spring functions need replacement
  }

  // Add will-change for GPU-safe properties (skip for looping animations —
  // they never complete so we'd never clean up)
  const isLooping = params.loop === true || (typeof params.loop === 'number' && params.loop > 1);
  const animatedProps = Object.keys(params).filter(
    k => !['targets', 'duration', 'delay', 'ease', 'loop', 'direction', 'onBegin', 'onComplete', 'onUpdate'].includes(k)
  );
  const getElements = (): Element[] => {
    if (typeof targets === 'string') {
      return Array.from(document.querySelectorAll(targets));
    } else if (targets instanceof NodeList || Array.isArray(targets)) {
      return Array.from(targets);
    } else if (targets instanceof HTMLElement) {
      return [targets];
    }
    return [];
  };
  const els = getElements();

  if (!isLooping) {
    els.forEach(el => {
      if (el instanceof HTMLElement) {
        addWillChange(el, animatedProps);
      }
    });
  }

  // Remove will-change on complete via onComplete callback (more reliable
  // than .then() across anime.js versions)
  const originalOnComplete = params.onComplete;
  const adjustedParamsWithCleanup = {
    ...adjustedParams,
    onComplete: (...args: unknown[]) => {
      if (!isLooping) {
        els.forEach(el => {
          if (el instanceof HTMLElement) {
            removeWillChange(el);
          }
        });
      }
      originalOnComplete?.(...args);
    },
  };

  const instance = animate(targets, adjustedParamsWithCleanup);

  return instance;
}

// ── Animation presets ──
export const presets = {
  // ── Entrance ──
  fadeIn: (delay = 0) => ({
    opacity: [0, 1],
    ease: EASINGS.out,
    duration: DURATIONS.reveal,
    delay,
  }),
  slideUp: (delay = 0) => ({
    opacity: [0, 1],
    translateY: [16, 0],
    ease: EASINGS.out,
    duration: DURATIONS.reveal,
    delay,
  }),
  scaleIn: (delay = 0) => ({
    opacity: [0, 1],
    scale: [0.95, 1],
    ease: EASINGS.springGentle,
    duration: DURATIONS.reveal,
    delay,
  }),
  slideInLeft: (delay = 0) => ({
    opacity: [0, 1],
    translateX: [-20, 0],
    ease: EASINGS.out,
    duration: DURATIONS.reveal,
    delay,
  }),
  slideInRight: (delay = 0) => ({
    opacity: [0, 1],
    translateX: [20, 0],
    ease: EASINGS.out,
    duration: DURATIONS.reveal,
    delay,
  }),

  // ── Exit ──
  fadeOut: (delay = 0) => ({
    opacity: [1, 0],
    ease: EASINGS.out,
    duration: DURATIONS.fast,
    delay,
  }),
  slideOutUp: (delay = 0) => ({
    opacity: [1, 0],
    translateY: [0, -12],
    ease: EASINGS.out,
    duration: DURATIONS.fast,
    delay,
  }),

  // ── Micro-interactions ──
  cardHover: () => ({
    translateY: [0, -3],
    boxShadow: [
      '0 0 0 0 hsl(var(--foreground) / 0)',
      '0 8px 24px -4px hsl(var(--foreground) / 0.08)',
    ],
    ease: EASINGS.spring,
    duration: DURATIONS.fast,
  }),
  cardUnhover: () => ({
    translateY: [-3, 0],
    boxShadow: [
      '0 8px 24px -4px hsl(var(--foreground) / 0.08)',
      '0 0 0 0 hsl(var(--foreground) / 0)',
    ],
    ease: EASINGS.out,
    duration: DURATIONS.fast,
  }),
  buttonPress: () => ({
    scale: [1, 0.97],
    ease: EASINGS.out,
    duration: 80,
  }),
  buttonRelease: () => ({
    scale: [0.97, 1],
    ease: EASINGS.spring,
    duration: DURATIONS.fast,
  }),
  buttonHover: () => ({
    brightness: [1, 1.08],
    ease: EASINGS.out,
    duration: DURATIONS.fast,
  }),
  linkUnderlineIn: () => ({
    scaleX: [0, 1],
    ease: EASINGS.out,
    duration: DURATIONS.fast,
  }),
  linkUnderlineOut: () => ({
    scaleX: [1, 0],
    ease: EASINGS.out,
    duration: DURATIONS.fast,
  }),
  focusRing: () => ({
    opacity: [0, 1],
    scale: [0.8, 1],
    ease: EASINGS.spring,
    duration: DURATIONS.fast,
  }),
  shakeError: () => ({
    translateX: [0, -4, 4, -3, 3, -2, 2, 0],
    ease: EASINGS.linear,
    duration: 350,
  }),
  successPop: () => ({
    scale: [1, 1.06, 1],
    ease: EASINGS.springBouncy,
    duration: 300,
  }),

  // ── Modal ──
  modalEnter: () => ({
    opacity: [0, 1],
    translateY: [30, 0],
    scale: [0.95, 1],
    ease: EASINGS.spring,
    duration: DURATIONS.base,
  }),
  modalExit: () => ({
    opacity: [1, 0],
    translateY: [0, 20],
    scale: [1, 0.97],
    ease: EASINGS.out,
    duration: DURATIONS.fast,
  }),
  backdropEnter: () => ({
    opacity: [0, 0.6],
    ease: EASINGS.out,
    duration: DURATIONS.fast,
  }),
  backdropExit: () => ({
    opacity: [0.6, 0],
    ease: EASINGS.out,
    duration: DURATIONS.fast,
  }),

  // ── Loading ──
  spinner: () => ({
    rotate: [0, 360],
    ease: 'linear',
    duration: 1500,
    loop: true,
  }),
  pulse: () => ({
    opacity: [0.5, 1],
    ease: EASINGS.inOut,
    duration: 1200,
    loop: true,
    direction: 'alternate',
  }),
  progressBar: (progress: number) => ({
    scaleX: [0, progress],
    ease: EASINGS.outExpo,
    duration: DURATIONS.reveal,
  }),

  // ── Fingerprint ──
  fingerprintScan: () => ({
    rotate: [0, 360],
    ease: 'linear',
    duration: 1500,
    loop: true,
  }),
  fingerprintSuccess: () => ({
    scale: [1, 1.5],
    opacity: [1, 0],
    ease: EASINGS.out,
    duration: 300,
  }),
  fingerprintCheckmark: () => ({
    scale: [0, 1],
    ease: EASINGS.springBouncy,
    duration: DURATIONS.base,
  }),
  fingerprintShake: () => ({
    translateX: [0, -3, 3, -2, 2, 0],
    ease: EASINGS.linear,
    duration: 300,
  }),

  // ── Page transitions ──
  pageEnter: () => ({
    opacity: [0, 1],
    translateY: [16, 0],
    ease: EASINGS.out,
    duration: DURATIONS.page,
  }),
  pageExit: () => ({
    opacity: [1, 0],
    translateY: [0, -12],
    ease: EASINGS.out,
    duration: 250,
  }),

  // ── Scroll reveals ──
  scrollReveal: () => ({
    opacity: [0, 1],
    translateY: [20, 0],
    scale: [0.98, 1],
    ease: EASINGS.out,
    duration: DURATIONS.reveal,
  }),
  scrollRevealLeft: () => ({
    opacity: [0, 1],
    translateX: [-30, 0],
    ease: EASINGS.out,
    duration: DURATIONS.reveal,
  }),
  scrollRevealRight: () => ({
    opacity: [0, 1],
    translateX: [30, 0],
    ease: EASINGS.out,
    duration: DURATIONS.reveal,
  }),
  scrollRevealScale: () => ({
    opacity: [0, 1],
    scale: [0.95, 1],
    ease: EASINGS.springGentle,
    duration: DURATIONS.reveal,
  }),

  // ── Sidebar ──
  sidebarCollapse: (collapsed: boolean) => ({
    width: collapsed ? ['100%', '0%'] : ['0%', '100%'],
    ease: EASINGS.springGentle,
    duration: DURATIONS.base,
  }),

  // ── FPS / HUD ──
  fpsSparkline: () => ({
    opacity: [0, 1],
    scaleY: [0, 1],
    ease: EASINGS.out,
    duration: DURATIONS.fast,
  }),
  telemetryBar: (height: number) => ({
    scaleY: [0, height],
    ease: EASINGS.out,
    duration: DURATIONS.fast,
  }),
} as const;

// ── Stagger helpers ──
export function staggerDefault(from: 'first' | 'center' | 'last' = 'first') {
  return stagger(DURATIONS.fast * 0.6, { from, ease: EASINGS.out });
}

export function staggerGrid(cols: number, rows: number, from: 'center' | 'first' = 'center') {
  return stagger(DURATIONS.fast, {
    grid: [cols, rows],
    from,
    ease: EASINGS.out,
  });
}

// ── Counter animation ──
export function counterAnimate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  targets: any,
  endValue: number,
  duration = DURATIONS.page,
): ReturnType<typeof animate> {
  return animate(targets, {
    innerHTML: [0, endValue],
    round: 1,
    ease: EASINGS.outExpo,
    duration,
  });
}
