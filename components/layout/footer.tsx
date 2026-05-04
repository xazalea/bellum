'use client';

import { useRef, useEffect } from 'react';
import { animate, spring, dur } from '@/lib/hooks/use-anime';
import { Github } from 'lucide-react';

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const iconRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Scroll-triggered entrance
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate(el, {
            translateY: [12, 0],
            opacity: [0, 1],
            ease: spring({ bounce: 0.1, stiffness: 180, damping: 18 }),
            duration: dur.slow,
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onLinkEnter = () => {
    if (iconRef.current) {
      animate(iconRef.current, { translateY: -2, ease: spring({ bounce: 0.3 }), duration: dur.fast });
    }
  };
  const onLinkLeave = () => {
    if (iconRef.current) {
      animate(iconRef.current, { translateY: 0, ease: spring({ bounce: 0 }), duration: dur.fast });
    }
  };

  return (
    <footer
      ref={ref}
      className="flex items-center justify-between border-t border-border/30 px-6 py-3"
      style={{ opacity: 0 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-muted-foreground/30 tracking-widest uppercase">
          Bellum
        </span>
        <span className="text-[9px] text-muted-foreground/15">
          Run anything in your browser
        </span>
      </div>
      <div className="flex items-center gap-3">
        <a
          ref={iconRef}
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={onLinkEnter}
          onMouseLeave={onLinkLeave}
          className="text-muted-foreground/20 hover:text-primary/50 transition-colors"
        >
          <Github size={12} />
        </a>
      </div>
    </footer>
  );
}
