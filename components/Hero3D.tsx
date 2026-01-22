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
  const scrollProgressRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.body.scrollHeight;
      const progress = scrollY / Math.max(1, documentHeight - windowHeight);
      scrollProgressRef.current = progress;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let raf = 0;
    const animate = (t: number) => {
      const model = modelViewerRef.current as any;
      if (model) {
        const base = scrollProgressRef.current;
        const wave = Math.sin(t * 0.0006) * 10;
        const theta = t * 0.005 + base * 360;
        const phi = Math.max(25, Math.min(85, 60 + wave));
        const radius = 105 + Math.sin(t * 0.0004) * 6 + base * 12;
        model.cameraOrbit = `${theta.toFixed(2)}deg ${phi.toFixed(2)}deg ${radius.toFixed(2)}%`;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const model = modelViewerRef.current as any;
    if (!model) return;
    const onLoad = () => {
      const animations = model.availableAnimations || [];
      if (animations.length > 0) {
        model.animationName = animations[0];
        model.play?.();
        model.playbackRate = 1.0;
      }
    };
    model.addEventListener('load', onLoad);
    return () => model.removeEventListener('load', onLoad);
  }, [currentModelIndex]);

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
        autoplay
        auto-rotate
        rotation-per-second="12deg"
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
