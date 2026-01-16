'use client';

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function NachoCursor() {
  const [isPointer, setIsPointer] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 25, stiffness: 700 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 16);
      cursorY.set(e.clientY - 16);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button') ||
        target.classList.contains('clickable') ||
        getComputedStyle(target).cursor === 'pointer'
      ) {
        setIsPointer(true);
      } else {
        setIsPointer(false);
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [cursorX, cursorY]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <motion.div
        style={{
          translateX: cursorXSpring,
          translateY: cursorYSpring,
        }}
        className="absolute top-0 left-0"
      >
        {/* Main Cursor: Pixel Square */}
        <div 
          className={`
            w-8 h-8 border-2 border-nacho-primary bg-transparent
            transition-transform duration-100 ease-out
            ${isPointer ? 'scale-150 rotate-45 bg-nacho-primary/20' : 'scale-100'}
          `}
          style={{
            boxShadow: '0 0 15px 2px rgba(168, 180, 208, 0.4)',
            imageRendering: 'pixelated'
          }}
        >
            {/* Center Dot */}
            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white -translate-x-1/2 -translate-y-1/2" />
        </div>
      </motion.div>
    </div>
  );
}
