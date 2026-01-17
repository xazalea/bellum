'use client';

import React, { useEffect, useRef } from 'react';

interface PixelWaveProps {
  className?: string;
  color?: string;
  speed?: number;
  amplitude?: number;
}

export function PixelWave({ 
  className = '', 
  color = '#64748B',
  speed = 2,
  amplitude = 8
}: PixelWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      
      ctx.clearRect(0, 0, width, height);
      
      time += 0.05 * speed;
      
      // Draw pixelated wave
      ctx.fillStyle = color;
      const segments = Math.floor(width / 4);
      
      for (let i = 0; i < segments; i++) {
        const x = i * 4;
        const y = height / 2 + Math.sin((i / segments) * Math.PI * 4 + time) * amplitude;
        ctx.fillRect(x, y, 4, 2);
      }
      
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [color, speed, amplitude]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`pixel-wave ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
