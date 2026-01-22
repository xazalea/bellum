'use client';

import React from 'react';

const CREATURES = [
  {
    id: 'shark-far',
    src: '/shared-assets/models/shark.glb',
    size: 220,
    top: '12%',
    left: '-30%',
    animation: 'swim-right 48s linear infinite',
    delay: '0s',
    opacity: 0.35,
  },
  {
    id: 'seahorse-mid',
    src: '/shared-assets/models/seahorse.glb',
    size: 140,
    top: '30%',
    left: '85%',
    animation: 'drift-left 60s linear infinite',
    delay: '6s',
    opacity: 0.45,
  },
  {
    id: 'octopus-deep',
    src: '/shared-assets/models/octopus.glb',
    size: 180,
    top: '55%',
    left: '-25%',
    animation: 'swim-right 70s linear infinite',
    delay: '12s',
    opacity: 0.3,
  },
  {
    id: 'crab-floor',
    src: '/shared-assets/models/crab.glb',
    size: 120,
    top: '78%',
    left: '10%',
    animation: 'crawl-right 90s linear infinite',
    delay: '0s',
    opacity: 0.5,
  },
  {
    id: 'sail-ship',
    src: '/shared-assets/models/sail-ship.glb',
    size: 260,
    top: '20%',
    left: '120%',
    animation: 'drift-left 90s linear infinite',
    delay: '18s',
    opacity: 0.22,
  },
];

export function OceanCreatures3D() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {CREATURES.map((creature) => (
        <model-viewer
          key={creature.id}
          src={creature.src}
          alt={`${creature.id} model`}
          autoplay
          auto-rotate
          rotation-per-second="6deg"
          interaction-prompt="none"
          shadow-intensity="1"
          shadow-softness="1"
          exposure="1.1"
          tone-mapping="commerce"
          environment-image="neutral"
          disable-zoom
          className="ocean-creature"
          style={{
            width: creature.size,
            height: creature.size,
            top: creature.top,
            left: creature.left,
            opacity: creature.opacity,
            animation: creature.animation,
            animationDelay: creature.delay,
          }}
        />
      ))}
    </div>
  );
}
