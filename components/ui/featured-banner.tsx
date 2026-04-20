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
    if (oldSlide) animate(oldSlide, { opacity: [1, 0], translateX: [0, -40], ease: ease.out, duration: dur.base });
    if (newSlide) animate(newSlide, { opacity: [0, 1], translateX: [40, 0], ease: ease.out, duration: dur.base, delay: 50 });

    // Animate new content
    run(s => {
      s.add(() => {
        const newContent = newSlide?.querySelector('[data-anime="banner-content"]');
        if (newContent) {
          animate(newContent.querySelectorAll('[data-anime="banner-line"]'), {
            translateY: [20, 0],
            opacity: [0, 1],
            ease: ease.out,
            duration: dur.reveal,
            delay: stagger(80, { start: 150 }),
          });
        }
      });
    });

    setActiveIndex(index);
  }, [activeIndex, run]);

  // Auto-rotate
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

  // Initial animation
  React.useEffect(() => {
    run(s => {
      s.add(() => {
        animate('[data-anime="banner-line"]', {
          translateY: [40, 0],
          opacity: [0, 1],
          ease: ease.out,
          duration: dur.reveal,
          delay: stagger(120, { start: 200 }),
        });
        animate('[data-anime="banner-cta"]', {
          scale: [0.85, 1],
          opacity: [0, 1],
          ease: spring({ bounce: 0.3, stiffness: 200, damping: 12 }),
          duration: dur.base,
          delay: 800,
        });
        animate('[data-anime="banner-dots"]', {
          translateY: [10, 0],
          opacity: [0, 1],
          ease: ease.out,
          duration: dur.base,
          delay: 1000,
        });
      });
    });
  }, [run]);

  const onPlayClick = useCallback(() => {
    if (!currentItem) return;
    const btn = document.querySelector('[data-anime="banner-cta"]');
    if (btn) animate(btn, { scale: [1, 0.92, 1.05, 1], ease: spring({ bounce: 0.5 }), duration: 400 });
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
          className="absolute inset-0 transition-opacity"
          style={{ opacity: i === activeIndex ? 1 : 0, pointerEvents: i === activeIndex ? 'auto' : 'none' }}
        >
          {/* Background image / gradient */}
          <div className="absolute inset-0">
            {item.image ? (
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `radial-gradient(ellipse at 30% 40%, ${item.accentColor || 'hsl(var(--primary) / 0.15)'} 0%, transparent 60%),
                               linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)`,
                }}
              />
            )}
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
          </div>

          {/* Content */}
          <div data-anime="banner-content" className="relative z-10 cd-container h-full flex items-center py-16">
            <div className="max-w-xl">
              {item.tags && item.tags.length > 0 && (
                <div data-anime="banner-line" className="flex items-center gap-2 mb-4" style={{ opacity: 0 }}>
                  {item.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider border border-primary/30 text-primary/80 rounded-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <h2 data-anime="banner-line" className="text-3xl md:text-5xl font-bold tracking-tighter text-foreground leading-[0.95]" style={{ opacity: 0 }}>
                {item.title}
              </h2>
              <p data-anime="banner-line" className="text-sm md:text-base text-muted-foreground mt-1 font-medium" style={{ opacity: 0 }}>
                {item.subtitle}
              </p>
              <p data-anime="banner-line" className="text-xs text-muted-foreground/60 mt-4 leading-relaxed max-w-md" style={{ opacity: 0 }}>
                {item.description}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  data-anime="banner-cta"
                  onClick={onPlayClick}
                  className="btn-primary h-10 px-6 text-sm font-semibold"
                  style={{ opacity: 0 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="mr-2"><path d="M8 5v14l11-7z" /></svg>
                  Play Now
                </button>
                <button
                  className="btn-secondary h-10 px-5 text-sm"
                  onClick={() => {/* TODO: add to wishlist */}}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mr-2">
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
      <div data-anime="banner-dots" className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2" style={{ opacity: 0 }}>
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              i === activeIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
            )}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border/30 z-20">
        <div
          className="h-full bg-primary/60 origin-left"
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
