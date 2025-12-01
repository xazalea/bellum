'use client';

import React, { useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { VMViewer } from '@/components/VMViewer';
import { VMType } from '@/lib/vm/types';

function AndroidContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('game');
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a2e1a 30%, #2e4e1a 50%, #1a2e1a 70%, #0a0a0a 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Navigation */}
      <nav style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link href="/dashboard" style={{
          color: 'rgba(255, 255, 255, 0.8)',
          textDecoration: 'none',
          fontSize: '14px',
        }}>
          ← Back to Dashboard
        </Link>
        <div style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#00ff88',
        }}>
          Android Emulator
        </div>
        <div style={{ width: '100px' }} /> {/* Spacer */}
      </nav>

      {/* VM Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          paddingTop: '50px',
        }}
      >
        <VMViewer
          vmType={VMType.ANDROID}
          gameId={gameId || undefined}
        />
      </div>
    </div>
  );
}

export default function AndroidPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '20px' }}>Loading Android Environment...</div>}>
      <AndroidContent />
    </Suspense>
  );
}
