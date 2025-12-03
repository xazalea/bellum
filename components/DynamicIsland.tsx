'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Globe, Terminal } from 'lucide-react';

export function DynamicIsland() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = isHovered;

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/unblocker', label: 'Unblocker', icon: Globe },
  ];

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex justify-center">
      <motion.div
        className="bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-full overflow-hidden"
        initial={{ width: '140px', height: '48px' }}
        animate={{ 
          width: isExpanded ? '320px' : '140px',
          height: '48px'
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="relative w-full h-full flex items-center justify-between px-2">
          
          {/* Logo State (Collapsed) */}
          <AnimatePresence mode="wait">
            {!isExpanded && (
              <motion.div 
                className="absolute inset-0 flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className="font-bold text-white text-sm tracking-tighter">
                  nacho<span className="text-blue-500">.</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded Menu State */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                className="absolute inset-0 flex items-center justify-center px-4 gap-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link 
                      key={link.href} 
                      href={link.href}
                      className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                        isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Icon size={16} />
                      {link.label}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
}

