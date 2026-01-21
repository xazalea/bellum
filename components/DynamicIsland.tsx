'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { name: 'Home', href: '/' },
  { name: 'Virtual Machines', href: '/virtual-machines' },
  { name: 'Cluster', href: '/cluster' },
  { name: 'Library', href: '/library' },
  { name: 'Storage', href: '/storage' },
  { name: 'Games', href: '/games' },
  { name: 'Account', href: '/account' },
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
          "pointer-events-auto backdrop-blur-xl overflow-hidden",
          "transition-all duration-300"
        )}
        initial={false}
        animate={{
          width: isExpanded ? 600 : 200,
          height: isExpanded ? 'auto' : 44,
          borderRadius: 22,
        }}
        onMouseEnter={handleInteraction}
        onMouseMove={resetTimer}
        onMouseLeave={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setIsExpanded(false), 800);
        }}
        style={{
          background: 'rgba(8, 12, 18, 0.85)',
          border: '1.5px solid rgba(26, 36, 50, 0.6)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(100, 116, 139, 0.1)',
        }}
      >
        <div className="flex flex-col w-full">
          {/* Header / Collapsed State */}
          <div 
            className="flex items-center justify-between px-5 h-11 w-full cursor-pointer group"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="font-sans font-bold text-xs text-[#A0B3CC] tracking-wider whitespace-nowrap transition-colors group-hover:text-[#94A3B8]">
              challenger deep.
            </span>
            <div className="flex space-x-1.5">
              <div className={cn(
                "w-1 h-1 rounded-full bg-[#2A3648] animate-pulse transition-all duration-300",
                isExpanded && "bg-[#64748B] shadow-[0_0_4px_rgba(100,116,139,0.6)]"
              )} />
              <div className={cn(
                "w-1 h-1 rounded-full bg-[#2A3648] animate-pulse delay-75 transition-all duration-300",
                isExpanded && "bg-[#64748B] shadow-[0_0_4px_rgba(100,116,139,0.6)]"
              )} />
              <div className={cn(
                "w-1 h-1 rounded-full bg-[#2A3648] animate-pulse delay-150 transition-all duration-300",
                isExpanded && "bg-[#64748B] shadow-[0_0_4px_rgba(100,116,139,0.6)]"
              )} />
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-3 gap-2 p-4 pt-2"
              >
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center p-2.5 text-sm font-sans rounded-lg transition-all duration-200",
                      "border border-transparent",
                      pathname === item.href 
                        ? "text-[#A0B3CC] bg-[#1E2A3A] border-[#2A3648] shadow-inner" 
                        : "text-[#64748B] hover:text-[#8B9DB8] hover:bg-[#0C1016] hover:border-[#1E2A3A]"
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
