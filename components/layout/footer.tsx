'use client';

import { useEffect, useRef, useCallback } from 'react';
import { animate, spring, ease, dur } from '@/lib/hooks/use-anime';

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (animatedRef.current || !footerRef.current) return;
    animatedRef.current = true;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(footerRef.current!, { translateY: [10, 0], opacity: [0, 1], ease: ease.out, duration: dur.base });
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });
    observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, []);

  const onLinkEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: -1, ease: spring({ bounce: 0.3 }), duration: dur.fast });
  }, []);
  const onLinkLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, ease: ease.out, duration: dur.fast });
  }, []);

  return (
    <footer ref={footerRef} className="border-t border-border mt-auto" style={{ opacity: 0 }}>
      <div className="cd-container py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60 font-medium tracking-widest uppercase">Bellum</span>
          <span className="text-[10px] text-muted-foreground/30">·</span>
          <span className="text-[10px] text-muted-foreground/40">Run anything in your browser</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-muted-foreground" onMouseEnter={onLinkEnter} onMouseLeave={onLinkLeave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
