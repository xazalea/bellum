'use client';

import React, { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { animate, spring, ease, dur, stagger } from '@/lib/hooks/use-anime';
import { useAnimeScope } from '@/lib/hooks/use-anime';

interface FeaturedBannerProps {
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    description: string;
    image?: string;
    tags?: string[];
    accentColor?: string;
  }>;
  onPlay?: (id: string) => void;
  className?: string;
}

export function FeaturedBanner({ items, onPlay, className }: FeaturedBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const { root, run } = useAnimeScope();
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  const currentItem = items[activeIndex] ?? items[0];

  const goToSlide = useCallback((index: number) => {
    if (index === activeIndex) return;
    const oldSlide = slideRefs.current[activeIndex];
    const newSlide = slideRefs.current[index];
    if (oldSlide) animate(oldSlide, { opacity: [1, 0], translateX: [0, -20], ease: ease.out, duration: dur.base });
    if (newSlide) animate(newSlide, { opacity: [0, 1], translateX: [20, 0], ease: ease.out, duration: dur.base, delay: 40 });

    run(s => {
      s.add(() => {
        const newContent = newSlide?.querySelector('[data-anime="banner-content"]');
        if (newContent) {
          animate(newContent.querySelectorAll('[data-anime="banner-line"]'), {
            translateY: [12, 0],
            opacity: [0, 1],
            ease: ease.out,
            duration: dur.reveal,
            delay: stagger(60, { start: 100 }),
          });
        }
      });
    });

    setActiveIndex(index);
  }, [activeIndex, run]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!hovering && mountedRef.current) {
        goToSlide((activeIndex + 1) % items.length);
      }
    }, 6000);
  }, [activeIndex, items.length, hovering, goToSlide]);

  React.useEffect(() => {
    mountedRef.current = true;
    resetTimer();
    return () => { mountedRef.current = false; if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  React.useEffect(() => {
    run(s => {
      s.add(() => {
        animate('[data-anime="banner-line"]', {
          translateY: [20, 0],
          opacity: [0, 1],
          ease: ease.out,
          duration: dur.reveal,
          delay: stagger(80, { start: 150 }),
        });
        animate('[data-anime="banner-cta"]', {
          scale: [0.9, 1],
          opacity: [0, 1],
          ease: spring({ bounce: 0.2, stiffness: 200, damping: 14 }),
          duration: dur.base,
          delay: 600,
        });
        animate('[data-anime="banner-dots"]', {
          translateY: [6, 0],
          opacity: [0, 1],
          ease: ease.out,
          duration: dur.base,
          delay: 800,
        });
      });
    });
  }, [run]);

  const onPlayClick = useCallback(() => {
    if (!currentItem) return;
    const btn = document.querySelector('[data-anime="banner-cta"]');
    if (btn) animate(btn, { scale: [1, 0.95, 1.02, 1], ease: spring({ bounce: 0.4 }), duration: 350 });
    onPlay?.(currentItem.id);
  }, [currentItem, onPlay]);

  if (!items.length) return null;

  return (
    <div ref={root} className={cn('relative w-full overflow-hidden', className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Slides */}
      {items.map((item, i) => (
        <div
          key={item.id}
          ref={el => { slideRefs.current[i] = el; }}
          className="absolute inset-0"
          style={{ opacity: i === activeIndex ? 1 : 0, pointerEvents: i === activeIndex ? 'auto' : 'none' }}
        >
          {/* Background */}
          <div className="absolute inset-0">
            {item.image ? (
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `radial-gradient(ellipse at 25% 35%, ${item.accentColor || 'hsl(var(--primary) / 0.08)'} 0%, transparent 55%),
                               linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
            {/* Dot grid overlay */}
            <div className="absolute inset-0 dot-grid opacity-40" />
          </div>

          {/* Content */}
          <div data-anime="banner-content" className="relative z-10 cd-container h-full flex items-center py-12">
            <div className="max-w-lg">
              {item.tags && item.tags.length > 0 && (
                <div data-anime="banner-line" className="flex items-center gap-2 mb-3" style={{ opacity: 0 }}>
                  {item.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest border border-primary/20 text-primary/70 rounded-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <h2 data-anime="banner-line" className="text-2xl md:text-4xl font-bold tracking-tighter text-foreground leading-[0.95]" style={{ opacity: 0 }}>
                {item.title}
              </h2>
              <p data-anime="banner-line" className="text-xs md:text-sm text-muted-foreground/60 mt-1 font-medium tracking-tight" style={{ opacity: 0 }}>
                {item.subtitle}
              </p>
              <p data-anime="banner-line" className="text-[11px] text-muted-foreground/40 mt-3 leading-relaxed max-w-md" style={{ opacity: 0 }}>
                {item.description}
              </p>
              <div className="mt-5 flex items-center gap-2.5">
                <button
                  data-anime="banner-cta"
                  onClick={onPlayClick}
                  className="btn-primary h-9 px-5 text-[11px]"
                  style={{ opacity: 0 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5"><path d="M8 5v14l11-7z" /></svg>
                  Play Now
                </button>
                <button
                  className="btn-secondary h-9 px-4 text-[11px]"
                  onClick={() => {/* TODO: add to wishlist */}}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mr-1.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Wishlist
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation dots */}
      <div data-anime="banner-dots" className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5" style={{ opacity: 0 }}>
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={cn(
              'h-1 rounded-full transition-all duration-300',
              i === activeIndex ? 'bg-primary w-5' : 'bg-muted-foreground/20 hover:bg-muted-foreground/40 w-1.5'
            )}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border/20 z-20">
        <div
          className="h-full bg-primary/40 origin-left"
          style={{ transform: 'scaleX(0)', animation: 'progress-slide 6s linear infinite' }}
        />
      </div>

      <style jsx>{`
        @keyframes progress-slide {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
