'use client';

import { useState } from 'react';
import Link from 'next/link';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-cyan-500/10 bg-[#0a1628]/50 backdrop-blur-sm">
      {/* Left - Breadcrumb / Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-white hidden sm:block">
          Challenger Deep
        </h1>
        <span className="hidden sm:block text-slate-500">/</span>
        <span className="text-sm text-cyan-400 font-medium">
          Web-Native OS
        </span>
      </div>

      {/* Center - Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search games, apps, or commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-[#01040a]/50 border border-cyan-500/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">Online</span>
        </div>

        {/* Quick Actions */}
        <Link
          href="/virtual-machines"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-lg text-sm font-medium text-cyan-400 hover:text-white hover:border-cyan-500/50 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Launch VM
        </Link>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2 text-slate-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
