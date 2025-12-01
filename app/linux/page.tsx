'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { VMViewer } from '@/components/VMViewer';
import { VMType } from '@/lib/vm/types';

export default function LinuxPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 30%, #2e2e4e 50%, #1a1a2e 70%, #0a0a0a 100%)',
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
        borderBottom: '2px solid rgba(255, 107, 157, 0.3)',
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
          color: '#ff6b9d',
        }}>
          Linux Emulator
        </div>
        <div style={{ width: '100px' }} />
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
          vmType={VMType.LINUX}
        />
      </div>
    </div>
  );
}

