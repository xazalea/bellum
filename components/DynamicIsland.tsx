'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/virtual-machines', label: 'VMs', icon: '◈' },
  { href: '/games', label: 'Games', icon: '◆' },
  { href: '/library', label: 'Library', icon: '▤' },
  { href: '/storage', label: 'Storage', icon: '▣' },
  { href: '/cluster', label: 'Cluster', icon: '◎' },
  { href: '/ai', label: 'AI', icon: '◇' },
  { href: '/account', label: 'Account', icon: '▲' },
];

export default function DynamicIsland() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const islandRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Center the island on mount
  useEffect(() => {
    const centerX = (window.innerWidth / 2) - (isExpanded ? 200 : 24);
    setPosition({ x: centerX, y: 8 });
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
    const maxX = window.innerWidth - (isExpanded ? 400 : 48);
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

  return (
    <div
      ref={islandRef}
      className="fixed z-50 select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Collapsed: Circle */}
      {!isExpanded && (
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center
            bg-[#0a1a2e] border-2 border-ocean-accent/30
            shadow-[0_0_15px_rgba(0,255,204,0.15),inset_0_0_10px_rgba(0,255,204,0.05)]
            hover:border-ocean-accent/50 hover:shadow-[0_0_20px_rgba(0,255,204,0.25)]
            transition-all duration-300"
          title="Click to expand · Drag to move"
        >
          <span className="text-ocean-accent text-lg font-pixel leading-none select-none">
            ◈
          </span>
        </div>
      )}

      {/* Expanded: Navigation Island */}
      {isExpanded && (
        <div
          className="rounded-2xl overflow-hidden
            bg-[#060e1c]/95 border-2 border-ocean-accent/25 backdrop-blur-md
            shadow-[0_0_30px_rgba(0,255,204,0.12),0_4px_20px_rgba(0,0,0,0.5)]"
          style={{ minWidth: '380px' }}
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
