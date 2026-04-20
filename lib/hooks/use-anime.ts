'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  animate,
  createScope,
  stagger,
  spring,
  createTimeline,
} from 'animejs';

export { animate, stagger, spring, createTimeline };

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
