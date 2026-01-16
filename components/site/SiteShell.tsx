'use client';

import React from 'react';
import type { PropsWithChildren } from 'react';
import { Header } from '@/components/nacho-ui/Header';
import { Footer } from '@/components/nacho-ui/Footer';

export function SiteShell({ children }: PropsWithChildren) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-transparent overflow-x-hidden">
      <Header />
      
      <main className="flex-1 w-full max-w-7xl mx-auto pt-32 px-6">
        {children}
      </main>

      <Footer />
    </div>
  );
}
