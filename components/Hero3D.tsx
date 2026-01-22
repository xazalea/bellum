'use client';

import React, { useEffect, useRef, useState } from 'react';

const MODELS = [
  { name: 'Shark', src: '/shared-assets/models/shark.glb', scale: '1 1 1' },
  { name: 'Sail Ship', src: '/shared-assets/models/sail-ship.glb', scale: '0.5 0.5 0.5' },
  { name: 'Octopus', src: '/shared-assets/models/octopus.glb', scale: '0.8 0.8 0.8' },
  { name: 'Seahorse', src: '/shared-assets/models/seahorse.glb', scale: '1 1 1' },
  { name: 'Crab', src: '/shared-assets/models/crab.glb', scale: '1.2 1.2 1.2' },
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
        // Rotate the model based on scroll
        const orbit = `${scrollY * 0.5}deg 75deg 105%`;
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
    <div className="fixed inset-0 z-0 w-full h-screen pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-nacho-bg via-white to-nacho-bg opacity-80 z-10" />
      
      <model-viewer
        ref={modelViewerRef}
        src={currentModel.src}
        alt={`3D Model of ${currentModel.name}`}
        camera-controls
        disable-zoom
        shadow-intensity="1"
        exposure="1"
        camera-orbit="0deg 75deg 105%"
        style={{ width: '100%', height: '100%' }}
        className="w-full h-full"
      />

      {/* Model Switcher Control (Interactive Layer) */}
      <div className="absolute bottom-10 right-10 z-20 pointer-events-auto">
        <button
          onClick={nextModel}
          className="bg-white/80 backdrop-blur-md border border-nacho-border shadow-nacho rounded-full px-6 py-3 text-nacho-primary font-medium hover:bg-white transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">3d_rotation</span>
          <span>Switch Model: {currentModel.name}</span>
        </button>
      </div>
    </div>
  );
}
