'use client';

import React, { useEffect, useRef, useState } from 'react';

const MODELS = [
  { name: 'Shark', src: '/shared-assets/models/shark.glb', scale: '1 1 1', orbit: '45deg 55deg 105%' },
  { name: 'Sail Ship', src: '/shared-assets/models/sail-ship.glb', scale: '0.5 0.5 0.5', orbit: '-45deg 75deg 105%' },
  { name: 'Octopus', src: '/shared-assets/models/octopus.glb', scale: '0.8 0.8 0.8', orbit: '0deg 75deg 105%' },
  { name: 'Seahorse', src: '/shared-assets/models/seahorse.glb', scale: '1 1 1', orbit: '90deg 75deg 105%' },
  { name: 'Crab', src: '/shared-assets/models/crab.glb', scale: '1.2 1.2 1.2', orbit: '0deg 55deg 105%' },
];

export function Hero3D() {
  const modelViewerRef = useRef<HTMLElement>(null);
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.body.scrollHeight;
      const progress = scrollY / (documentHeight - windowHeight);
      setScrollProgress(progress);

      if (modelViewerRef.current) {
        // Smooth scroll-based rotation
        // We add to the base orbit to create a "spinning" effect as you scroll down
        const theta = scrollY * 0.1; // Rotation speed
        const phi = 75 - (scrollY * 0.02); // Slight tilt up/down
        const radius = 105 + (scrollY * 0.05); // Slight zoom out
        
        // We use the model's base orbit as a starting point if needed, 
        // but overriding it with dynamic values often feels more responsive.
        // Let's mix auto-rotate with scroll.
        
        // Actually, model-viewer's camera-orbit takes "theta phi radius".
        // We can just update theta to rotate around.
        const orbit = `${theta}deg ${Math.max(20, Math.min(90, phi))}deg ${radius}%`;
        modelViewerRef.current.setAttribute('camera-orbit', orbit);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const nextModel = () => {
    setCurrentModelIndex((prev) => (prev + 1) % MODELS.length);
  };

  const currentModel = MODELS[currentModelIndex];

  return (
    <div className="fixed inset-0 z-0 w-full h-screen pointer-events-none bg-nacho-bg">
      {/* Cinematic Lighting Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-nacho-bg/80 via-transparent to-nacho-bg z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-nacho-bg/50 via-transparent to-nacho-bg/50 z-10 pointer-events-none" />
      
      <model-viewer
        ref={modelViewerRef}
        src={currentModel.src}
        alt={`3D Model of ${currentModel.name}`}
        camera-controls
        disable-zoom
        auto-rotate
        rotation-per-second="30deg" // Slow idle rotation
        interaction-prompt="none"
        shadow-intensity="2"
        shadow-softness="1"
        exposure="1.2"
        tone-mapping="commerce"
        environment-image="neutral" 
        camera-orbit={currentModel.orbit}
        interpolation-decay="200"
        style={{ width: '100%', height: '100%' }}
        className="w-full h-full"
      />

      {/* Model Switcher Control (Interactive Layer) */}
      <div className="absolute bottom-10 right-10 z-20 pointer-events-auto">
        <button
          onClick={nextModel}
          className="bg-nacho-surface/80 backdrop-blur-md border border-nacho-border shadow-nacho rounded-full px-6 py-3 text-nacho-primary font-medium hover:bg-nacho-surface hover:border-nacho-accent transition-all flex items-center gap-2 group"
        >
          <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-500">3d_rotation</span>
          <span>Switch Model: {currentModel.name}</span>
        </button>
      </div>
    </div>
  );
}
