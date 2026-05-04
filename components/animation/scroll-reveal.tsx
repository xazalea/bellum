'use client';

import { useRef, useEffect, type ReactNode } from 'react';
import { stagger } from 'animejs';
import { safeAnimate, presets, DURATIONS, EASINGS } from '@/lib/animation/engine';

export type RevealPreset = 'fadeIn' | 'slideUp' | 'slideInLeft' | 'slideInRight' | 'scaleIn';

interface ScrollRevealProps {
  children: ReactNode;
  preset?: RevealPreset;
  delay?: number;
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  staggerChildren?: boolean;
  childSelector?: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function ScrollReveal({
  children,
  preset = 'slideUp',
  delay = 0,
  threshold = 0.1,
  rootMargin = '0px 0px -40px 0px',
  once = true,
  staggerChildren = false,
  childSelector = '[data-reveal]',
  className = '',
  as: Component = 'div',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasRevealed = useRef(false);

  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;
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
                // Reveal the parent first so children are visible, then animate children
                el.classList.remove('scroll-reveal-hidden');
                safeAnimate(children, {
                  ...baseParams,
                  delay: stagger(DURATIONS.fast * 0.5, { from: 0, ease: EASINGS.out }),
                });
              } else {
                el.classList.remove('scroll-reveal-hidden');
                safeAnimate(el, { ...baseParams, delay });
              }
            } else {
              el.classList.remove('scroll-reveal-hidden');
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
  }, [preset, delay, threshold, rootMargin, once, staggerChildren, childSelector]);

  const Tag = Component as any;
  return (
    <Tag ref={ref} className={`scroll-reveal-hidden ${className}`}>
      {children}
    </Tag>
  );
}

// ── Convenience wrappers ──
export function FadeIn(props: Omit<ScrollRevealProps, 'preset'>) {
  return <ScrollReveal {...props} preset="fadeIn" />;
}

export function SlideUp(props: Omit<ScrollRevealProps, 'preset'>) {
  return <ScrollReveal {...props} preset="slideUp" />;
}

export function SlideInLeft(props: Omit<ScrollRevealProps, 'preset'>) {
  return <ScrollReveal {...props} preset="slideInLeft" />;
}

export function SlideInRight(props: Omit<ScrollRevealProps, 'preset'>) {
  return <ScrollReveal {...props} preset="slideInRight" />;
}

export function ScaleIn(props: Omit<ScrollRevealProps, 'preset'>) {
  return <ScrollReveal {...props} preset="scaleIn" />;
}
