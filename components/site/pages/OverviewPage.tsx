'use client';

import React, { useState } from 'react';
import { GlobalSearch } from '@/components/nacho-ui/GlobalSearch';
import { Button } from '@/components/nacho-ui/Button';
import { Card } from '@/components/nacho-ui/Card';
import { ProgressBar } from '@/components/nacho-ui/ProgressBar';
import { StatusIndicator } from '@/components/nacho-ui/StatusIndicator';
import { Toggle } from '@/components/nacho-ui/Toggle';
import { AppCard } from '@/components/nacho-ui/AppCard';
import { IconCard } from '@/components/nacho-ui/IconCard';
import { Settings, ArrowRight, ChevronRight } from 'lucide-react';

export function OverviewPage() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="flex flex-col gap-10 pb-20">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-10">
        <h1 className="text-5xl md:text-7xl font-black font-display tracking-tight text-white drop-shadow-2xl">
          Minimal. Matte. Modern.
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-nacho-subtext leading-relaxed font-light">
          A design system showcase built on the philosophy of soft pastel tones, high-radius components, and a flat yet tactile interface.
        </p>
      </section>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column Group (Spans 2 columns on large screens) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Global Search Section */}
          <Card className="flex flex-col gap-4">
            <div className="text-xs font-bold tracking-widest uppercase text-nacho-subtext/60 pl-1">Global Search</div>
            <GlobalSearch />
          </Card>

          {/* Split Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Interactive Primitives */}
            <Card className="flex flex-col gap-8 h-full">
              <div className="text-xs font-bold tracking-widest uppercase text-nacho-subtext/60 pl-1">Interactive Primitives</div>
              
              <div className="flex flex-col gap-4">
                <Button className="w-full justify-between group">
                  Primary Action
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Button>
                
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1">
                    Secondary
                  </Button>
                  <Button variant="secondary" className="px-3 aspect-square">
                    <Settings size={20} />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Data Feedback */}
            <Card className="flex flex-col gap-8 h-full">
              <div className="text-xs font-bold tracking-widest uppercase text-nacho-subtext/60 pl-1">Data Feedback</div>
              
              <div className="space-y-6">
                <ProgressBar value={75} label="System Stability" />
                
                <div className="flex flex-wrap gap-2">
                  <StatusIndicator status="active" />
                  <StatusIndicator status="maintenance" />
                  <StatusIndicator status="pending" />
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium text-nacho-text">Dark Mode Sync</span>
                  <Toggle checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
              </div>
            </Card>

          </div>
        </div>

        {/* Right Column Group */}
        <div className="flex flex-col gap-6">
          
          {/* Standard Card */}
          <Card className="flex flex-col gap-4">
            <div className="h-10 w-10 rounded-xl bg-nacho-card-hover border border-nacho-border flex items-center justify-center text-nacho-primary mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-white">Standard Card</h3>
            <p className="text-sm text-nacho-subtext leading-relaxed">
              The base card component provides a clean container for generic content, featuring a subtle border and matte fill.
            </p>
            
            <button className="flex items-center gap-1 text-sm font-bold text-white hover:text-nacho-primary transition-colors mt-2 group">
              View API <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </Card>

          {/* Nacho App Card */}
          <AppCard />

          {/* Icon Card */}
          <IconCard />

        </div>
      </div>
    </div>
  );
}
