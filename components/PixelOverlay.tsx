'use client';

import React from 'react';

export function PixelOverlay() {
  return (
    <div 
      className="pointer-events-none fixed inset-0 z-[9999] h-full w-full opacity-[0.015]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.5) 50%),
          linear-gradient(90deg, rgba(100, 116, 139, 0.04), rgba(71, 85, 105, 0.02), rgba(100, 116, 139, 0.04))
        `,
        backgroundSize: '100% 2px, 3px 100%',
        backgroundRepeat: 'repeat, repeat',
      }}
    />
  );
}
