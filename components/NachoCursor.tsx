'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const AnimatedCursor = dynamic(() => import('react-animated-cursor'), {
  ssr: false,
});

export function NachoCursor() {
  return (
    <AnimatedCursor
      innerSize={8}
      outerSize={32}
      color="168, 180, 208" // Nacho Primary #A8B4D0
      outerAlpha={0.2}
      innerScale={1}
      outerScale={2}
      clickables={[
        'a',
        'input[type="text"]',
        'input[type="email"]',
        'input[type="number"]',
        'input[type="submit"]',
        'input[type="image"]',
        'label[for]',
        'select',
        'textarea',
        'button',
        '.link',
        '.clickable',
        // Add specific Nacho UI classes if needed
        '.nacho-card',
        '.nacho-btn'
      ]}
      showSystemCursor={false}
    />
  );
}
