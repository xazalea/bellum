'use client';

import React, { useEffect, useRef } from 'react';
import { createSprite } from '@/lib/ui/sprites';

interface PixelLoaderProps {
  size?: number;
  className?: string;
  type?: 'spinner' | 'dots' | 'wave' | 'pulse';
}

export function PixelLoader({ size = 32, className = '', type = 'spinner' }: PixelLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let animationId: number;

    const drawSpinner = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#64748B';
      
      const segments = 8;
      const angleStep = (Math.PI * 2) / segments;
      const currentSegment = Math.floor(frame / 3) % segments;
      
      for (let i = 0; i < segments; i++) {
        const angle = i * angleStep;
        const alpha = i === currentSegment ? 1 : 0.2;
        const pixelSize = 3;
        
        ctx.globalAlpha = alpha;
        const x = size / 2 + Math.cos(angle) * (size / 3) - pixelSize / 2;
        const y = size / 2 + Math.sin(angle) * (size / 3) - pixelSize / 2;
        
        ctx.fillRect(
          Math.floor(x / pixelSize) * pixelSize,
          Math.floor(y / pixelSize) * pixelSize,
          pixelSize,
          pixelSize
        );
      }
      ctx.globalAlpha = 1;
    };

    const drawDots = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#64748B';
      
      const dots = 3;
      const spacing = size / (dots + 1);
      
      for (let i = 0; i < dots; i++) {
        const offset = Math.sin((frame / 10) + (i * Math.PI / 3)) * 4;
        const pixelSize = 4;
        const x = spacing * (i + 1) - pixelSize / 2;
        const y = size / 2 - pixelSize / 2 + offset;
        
        ctx.fillRect(
          Math.floor(x / pixelSize) * pixelSize,
          Math.floor(y / pixelSize) * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    };

    const drawWave = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#64748B';
      
      const pixels = size / 4;
      for (let i = 0; i < pixels; i++) {
        const y = size / 2 + Math.sin((frame / 5) + (i / pixels) * Math.PI * 2) * (size / 4);
        ctx.fillRect(i * 4, Math.floor(y / 4) * 4, 4, 4);
      }
    };

    const drawPulse = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#64748B';
      
      const scale = 0.5 + Math.sin(frame / 10) * 0.5;
      const pixelSize = 4;
      const scaledSize = size * scale;
      const offset = (size - scaledSize) / 2;
      
      for (let y = 0; y < scaledSize; y += pixelSize) {
        for (let x = 0; x < scaledSize; x += pixelSize) {
          ctx.fillRect(
            Math.floor((x + offset) / pixelSize) * pixelSize,
            Math.floor((y + offset) / pixelSize) * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    };

    const animate = () => {
      frame++;
      
      switch (type) {
        case 'spinner':
          drawSpinner();
          break;
        case 'dots':
          drawDots();
          break;
        case 'wave':
          drawWave();
          break;
        case 'pulse':
          drawPulse();
          break;
      }
      
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [size, type]);

  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size}
      className={`pixelated ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
