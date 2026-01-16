'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { name: 'Home', href: '/' },
  { name: 'Android', href: '/android' },
  { name: 'Windows', href: '/windows' },
  { name: 'Cluster', href: '/cluster' },
  { name: 'Library', href: '/library' },
  { name: 'Storage', href: '/storage' },
  { name: 'Games', href: '/games' },
];

export function DynamicIsland() {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 3000);
  };

  const handleInteraction = () => {
    setIsExpanded(true);
    resetTimer();
  };

  // Keep expanded if current page is not home, or initially?
  // User asked for "dynamic island that moves and shrinks if not in use"
  // So standard behavior is collapsed -> expand on interaction -> collapse after delay

  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <motion.div
        className={cn(
          "pointer-events-auto bg-[#030508]/90 backdrop-blur-md border-2 border-[#1F2937] shadow-xl overflow-hidden",
          "transition-colors duration-300 hover:border-[#374151]"
        )}
        initial={false}
        animate={{
          width: isExpanded ? 600 : 220,
          height: isExpanded ? 'auto' : 48,
          borderRadius: 24, // Pixelated look prefers slightly blocky but rounded allows island feel
        }}
        onMouseEnter={handleInteraction}
        onMouseMove={resetTimer}
        onMouseLeave={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setIsExpanded(false), 800);
        }}
        style={{
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="flex flex-col w-full">
          {/* Header / Collapsed State */}
          <div 
            className="flex items-center justify-between px-6 h-12 w-full cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="font-pixel text-xs text-[#E2E8F0] tracking-widest whitespace-nowrap">
              challenger deep.
            </span>
            <div className="flex space-x-1">
              <div className={cn("w-1 h-1 bg-[#374151] animate-pulse", isExpanded && "bg-[#64748B]")} />
              <div className={cn("w-1 h-1 bg-[#374151] animate-pulse delay-75", isExpanded && "bg-[#64748B]")} />
              <div className={cn("w-1 h-1 bg-[#374151] animate-pulse delay-150", isExpanded && "bg-[#64748B]")} />
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-3 gap-2 p-4 pt-0"
              >
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center p-2 text-sm font-retro text-[#64748B] hover:text-[#94A3B8] hover:bg-[#111827] transition-colors border border-transparent hover:border-[#374151]/30",
                      pathname === item.href && "text-[#E2E8F0] bg-[#111827] border-[#374151]/50"
                    )}
                    onClick={() => setIsExpanded(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
