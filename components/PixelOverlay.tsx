'use client';

import React from 'react';

export function PixelOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] h-full w-full opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))`,
        backgroundSize: '100% 2px, 3px 100%',
        backgroundRepeat: 'repeat, repeat',
      }}
    />
  );
}
