'use client';

import React from 'react';
import type { PropsWithChildren } from 'react';
import { Header } from '@/components/nacho-ui/Header';
import { Footer } from '@/components/nacho-ui/Footer';

export function SiteShell({ children }: PropsWithChildren) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-nacho-bg overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] h-[50vh] w-[50vh] rounded-full bg-nacho-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50vh] w-[50vh] rounded-full bg-nacho-accent-pink/5 blur-[120px]" />
      </div>

      <Header />
      
      <main className="flex-1 w-full max-w-7xl mx-auto pt-32 px-6">
        {children}
      </main>

      <Footer />
    </div>
  );
}
