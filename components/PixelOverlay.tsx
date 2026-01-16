'use client';

import React from 'react';

export function PixelOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {/* Scanlines */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))',
          backgroundSize: '100% 4px'
        }}
      />
      {/* Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.4) 100%)'
        }}
      />
    </div>
  );
}
