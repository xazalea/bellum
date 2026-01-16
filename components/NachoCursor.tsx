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

  // Smooth spring animation for cursor movement
  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Generate cursor sprite - using darker glow palette
    const url = createSprite(SPRITES.cursor, 2, { ...PALETTES.glow, '#': '#94A3B8' });
    setCursorUrl(url);

    const updateMouse = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setIsVisible(true);
      
      // Check if hovering over clickable elements
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
        className="pointer-events-none fixed left-0 top-0 z-[10000] mix-blend-difference"
        style={{
          x,
          y,
          opacity: isVisible ? 1 : 0,
        }}
      >
        {/* Glow Effect */}
        <div 
          className="absolute -left-12 -top-12 h-24 w-24 rounded-full opacity-20 blur-xl transition-all duration-300"
          style={{
            background: isHovering 
              ? 'radial-gradient(circle, #475569 0%, transparent 70%)' 
              : 'radial-gradient(circle, #334155 0%, transparent 70%)',
            transform: isHovering ? 'scale(1.5)' : 'scale(1)',
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
            className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
          />
        </div>
      </motion.div>
    </>
  );
}
