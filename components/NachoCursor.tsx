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
    // Generate cursor sprite - crisp white/grey
    const url = createSprite(SPRITES.cursor, 2, { 
      'x': '#E2E8F0', 
      '#': '#94A3B8',
      'o': '#64748B',
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
        {/* Simple Glow - Radial Gradient Div */}
        <div 
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200"
          style={{
            width: isHovering ? '120px' : '80px',
            height: isHovering ? '120px' : '80px',
            background: isHovering 
              ? 'radial-gradient(circle, rgba(148, 163, 184, 0.4) 0%, transparent 70%)' 
              : 'radial-gradient(circle, rgba(100, 116, 139, 0.3) 0%, transparent 70%)',
          }}
        />

        {/* Cursor Sprite */}
        <div 
          className="relative h-6 w-6 transition-transform duration-200"
          style={{
            transform: isHovering ? 'scale(0.8) rotate(-10deg)' : 'scale(1) rotate(0deg)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={cursorUrl} 
            alt="Cursor" 
            className="h-full w-full object-contain drop-shadow-md"
          />
        </div>
      </motion.div>
    </>
  );
}
