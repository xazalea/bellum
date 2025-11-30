'use client';

import { Desktop } from '@/components/Desktop';

export default function Home() {
  return (
    <main 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Desktop />
    </main>
  );
}

