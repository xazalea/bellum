'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/virtual-machines', label: 'OS', icon: '◈' },
  { href: '/games', label: 'Games', icon: '◆' },
  { href: '/library', label: 'Library', icon: '▤' },
  { href: '/storage', label: 'Storage', icon: '▣' },
  { href: '/cluster', label: 'Cluster', icon: '◎' },
  { href: '/ai', label: 'AI', icon: '◇' },
  { href: '/account', label: 'Account', icon: '▲' },
];

export default function DynamicIsland() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 12 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const islandRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const lastScrollY = useRef(0);

  // Center the island on mount + handle resize
  useEffect(() => {
    const update = () => {
      const centerX = (window.innerWidth / 2) - (isExpanded ? 190 : 28);
      setPosition({ x: Math.max(12, centerX), y: 12 });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always show at top
      if (currentScrollY < 50) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY.current && currentScrollY > 150) {
        setIsVisible(false);
        setIsExpanded(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    setHasMoved(false);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    
    // Constrain to top bar area
    const islandWidth = isExpanded ? Math.min(380, window.innerWidth - 16) : 48;
    const maxX = window.innerWidth - islandWidth;
    const maxY = 60;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
    setHasMoved(true);
  }, [isDragging, isExpanded]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    if (!hasMoved) {
      setIsExpanded(prev => !prev);
    }
  }, [hasMoved]);

  // Close on navigation
  useEffect(() => {
    setIsExpanded(false);
  }, [pathname]);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // On small screens, center the expanded island
  const effectiveX = isExpanded && typeof window !== 'undefined' && window.innerWidth < 640
    ? Math.max(4, (window.innerWidth - Math.min(380, window.innerWidth - 16)) / 2)
    : position.x;

  return (
    <div
      ref={islandRef}
      className="fixed z-50 select-none"
      style={{
        left: `${effectiveX}px`,
        top: `${position.y}px`,
        transform: `translateY(${isVisible ? 0 : -80}px)`,
        opacity: isVisible ? 1 : 0,
        transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: isDragging ? 'grabbing' : 'grab',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Collapsed: Pill */}
      {!isExpanded && (
        <div
          className="h-12 px-4 rounded-full flex items-center gap-3
            bg-[#0a1a2e]/90 border border-ocean-accent/30 backdrop-blur-md
            shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(0,255,204,0.1)]
            hover:border-ocean-accent/50 hover:shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(0,255,204,0.15)]
            transition-all duration-300"
          title="Click to expand · Drag to move"
        >
          <span className="text-ocean-accent text-lg font-pixel leading-none select-none">
            ◈
          </span>
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-pixel text-ocean-accent/80 tracking-wider">MENU</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      )}

      {/* Expanded: Navigation Island */}
      {isExpanded && (
        <div
          className="rounded-2xl overflow-hidden
            bg-[#060e1c]/95 border border-ocean-accent/20 backdrop-blur-md
            shadow-[0_0_20px_rgba(0,255,204,0.08),0_4px_16px_rgba(0,0,0,0.4)]
            w-[calc(100vw-16px)] sm:w-auto"
          style={{ minWidth: 'min(380px, calc(100vw - 16px))' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-ocean-accent/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-ocean-accent text-xs">◈</span>
              <span className="font-pixel text-[8px] text-ocean-accent tracking-widest uppercase">
                Challenger Deep
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-ocean-accent/40 animate-pulse" />
              <span className="text-[9px] text-ocean-muted font-mono">ONLINE</span>
            </div>
          </div>

          {/* Navigation Grid */}
          <div className="p-3 grid grid-cols-4 gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all duration-200
                    ${active
                      ? 'bg-ocean-accent/15 border border-ocean-accent/30 shadow-[0_0_10px_rgba(0,255,204,0.08)]'
                      : 'hover:bg-ocean-accent/8 border border-transparent hover:border-ocean-accent/15'
                    }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={`text-lg leading-none ${active ? 'text-ocean-accent' : 'text-ocean-muted'}`}>
                    {item.icon}
                  </span>
                  <span className={`font-pixel text-[7px] tracking-wider uppercase
                    ${active ? 'text-ocean-accent' : 'text-ocean-secondary'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Status Bar */}
          <div className="px-4 py-2 border-t border-ocean-accent/10 flex items-center justify-between">
            <span className="text-[9px] text-ocean-muted font-mono">
              DEPTH: 10,994m
            </span>
            <span className="text-[9px] text-ocean-muted font-mono">
              {new Date().toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
