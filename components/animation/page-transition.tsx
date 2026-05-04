'use client';

import { useRef, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { stagger } from 'animejs';
import { safeAnimate, presets, DURATIONS, EASINGS } from '@/lib/animation/engine';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (!ref.current) return;

    // Only animate on pathname change, not initial mount
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;

      // Entrance animation
      safeAnimate(ref.current, {
        ...presets.pageEnter(),
        delay: 50, // Small gap after exit
      });
    }
  }, [pathname]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ── Staggered children reveal for page content ──
interface StaggerRevealProps {
  children: ReactNode;
  className?: string;
  childSelector?: string;
}

export function StaggerReveal({
  children,
  className = '',
  childSelector = '[data-reveal]',
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ref.current || hasAnimated.current) return;
    hasAnimated.current = true;

    const childEls = ref.current.querySelectorAll(childSelector);
    if (childEls.length > 0) {
      safeAnimate(childEls, {
        ...presets.slideUp(),
        delay: stagger(DURATIONS.fast * 0.5, { from: 0, ease: EASINGS.out }),
      });
    } else {
      safeAnimate(ref.current, presets.slideUp());
    }
  }, [childSelector]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
