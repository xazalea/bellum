'use client';

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { SPRITES, PALETTES, createSprite } from '@/lib/ui/sprites';

export function NachoCursor() {
  const [cursorUrl, setCursorUrl] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Mouse position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Snappier spring animation
  const springConfig = { damping: 25, stiffness: 700, mass: 0.5 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Generate cursor sprite - refined minimalist colors
    const url = createSprite(SPRITES.cursor, 2, { 
      'x': '#A0B3CC', 
      '#': '#8B9DB8',
      'o': '#64748B',
      '+': '#CBD5E1',
      '@': '#4A5A6F',
      '.': 'transparent' 
    });
    setCursorUrl(url);

    const updateMouse = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setIsVisible(true);
      
      const target = e.target as HTMLElement;
      const isClickable = 
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.classList.contains('cursor-pointer');
      
      setIsHovering(!!isClickable);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', updateMouse);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', updateMouse);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [mouseX, mouseY]);

  if (!cursorUrl) return null;

  return (
    <>
      <style jsx global>{`
        body, a, button, input, select, textarea {
          cursor: none !important;
        }
      `}</style>
      
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[10000]"
        style={{
          x,
          y,
          opacity: isVisible ? 1 : 0,
        }}
      >
        {/* Subtle Glow - Minimalist */}
        <div 
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ease-out"
          style={{
            width: isHovering ? '100px' : '60px',
            height: isHovering ? '100px' : '60px',
            background: isHovering 
              ? 'radial-gradient(circle, rgba(139, 157, 184, 0.25) 0%, rgba(100, 116, 139, 0.08) 40%, transparent 70%)' 
              : 'radial-gradient(circle, rgba(100, 116, 139, 0.18) 0%, rgba(74, 90, 111, 0.05) 40%, transparent 70%)',
            filter: 'blur(8px)',
          }}
        />

        {/* Cursor Sprite */}
        <div 
          className="relative h-6 w-6 transition-all duration-200 ease-out"
          style={{
            transform: isHovering ? 'scale(0.85) rotate(-8deg)' : 'scale(1) rotate(0deg)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={cursorUrl} 
            alt="Cursor" 
            className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(139,157,184,0.3)]"
          />
        </div>
      </motion.div>
    </>
  );
}
