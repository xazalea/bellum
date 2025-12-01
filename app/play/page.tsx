'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VMViewer } from '@/components/VMViewer';
import { VMType } from '@/lib/vm/types';
import { colors } from '@/lib/ui/design-system';
import { GameHUD } from '@/components/hud/GameHUD';
import { hyperion } from '@/src/nacho/engine/hyperion';
import { inputManager } from '@/src/nacho/input/manager';

function PlayContent() {
  const searchParams = useSearchParams();
  const fileName = searchParams.get('file');
  const [vmType, setVmType] = useState<VMType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fileName) return;

    // Auto-detect core based on file extension
    const detectCore = () => {
      const lower = fileName.toLowerCase();
      if (lower.endsWith('.apk')) return VMType.ANDROID;
      if (lower.endsWith('.exe')) return VMType.WINDOWS;
      if (lower.endsWith('.iso') && lower.includes('windows')) return VMType.WINDOWS;
      if (lower.endsWith('.iso')) return VMType.LINUX; // Default ISO to Linux
      if (lower.endsWith('.bin')) return VMType.DOS; // Simplification
      
      return VMType.WINDOWS; // Default fallback
    };

    const detected = detectCore();
    setVmType(detected);
    
    // Simulate loading time for "compilation" / "analysis"
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  }, [fileName]);

  useEffect(() => {
    if (!loading && vmType) {
        // Start Hyperion Engine
        hyperion.setCallbacks(
            (dt) => {
                // Update Loop
                inputManager.poll();
                // In a real implementation, we'd step the emulator core here
            },
            (dt) => {
                // Render Loop
            }
        );
        hyperion.start();

        return () => {
            hyperion.stop();
        };
    }
  }, [loading, vmType]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg.primary,
        color: colors.text.primary,
      }}>
        <div style={{ marginBottom: '20px', fontSize: '48px' }}>⚡</div>
        <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Analyzing {fileName}...</h2>
        <p style={{ color: colors.text.secondary, marginTop: '8px' }}>Injecting Runtime Hooks</p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      flex: 1,
      backgroundColor: colors.bg.primary,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* HUD Overlay */}
      <GameHUD />

      {/* Simplified Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '48px',
        backgroundColor: colors.bg.secondary,
        borderBottom: `1px solid ${colors.border.secondary}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 1000,
      }}>
        <span style={{ fontWeight: 'bold', color: colors.accent.primary, marginRight: '12px' }}>nacho.</span>
        <span style={{ color: colors.text.secondary, fontSize: '14px' }}>Running: {fileName}</span>
      </div>

      {/* VM Viewport */}
      <div style={{
        width: '100%',
        height: '100%',
        paddingTop: '48px',
      }}>
        {vmType && <VMViewer vmType={vmType} />}
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#0B1121', height: '100vh' }} />}>
      <PlayContent />
    </Suspense>
  );
}
