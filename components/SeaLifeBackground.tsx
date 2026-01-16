'use client';

import React, { useEffect, useRef } from 'react';
import { SPRITES, PALETTES, createSprite } from '@/lib/ui/sprites';

interface Animal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: keyof typeof SPRITES;
  image: HTMLImageElement;
  width: number;
  height: number;
  frame: number;
  speed: number;
  baseSpeed: number;
  scale: number;
  angle: number; // For rotation
  color: string; // Debug/Fallback
  fleeing: boolean;
}

interface Particle {
  x: number;
  y: number;
  vy: number;
  life: number;
  image: HTMLImageElement;
}

export function SeaLifeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animalsRef = useRef<Animal[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate Sprites with Diverse Colors
    const loadedSprites: Record<string, HTMLImageElement[]> = {};
    const spriteKeys = Object.keys(SPRITES).filter(k => k !== 'cursor' && k !== 'bubble') as Array<keyof typeof SPRITES>;
    
    // Function to generate random ocean colors
    const randomColor = () => {
      // Use specific palette colors from the new high-quality sprites if possible, 
      // OR map the string characters dynamically.
      // But our createSprite function handles the palette mapping.
      // We need to pass a palette to createSprite.
      
      const hues = [200, 210, 220, 230, 190]; // More strict deep ocean hues
      const hue = hues[Math.floor(Math.random() * hues.length)];
      const sat = 20 + Math.random() * 30; // Desaturated
      const light = 20 + Math.random() * 30; // Darker
      return `hsl(${hue}, ${sat}%, ${light}%)`;
    };

    const secondaryColor = (base: string) => {
      return base.replace('%)', '%, 0.5)'); 
    };
    
    const highlightColor = (base: string) => {
       // Make it slightly lighter for details
       return '#64748B';
    };

    // Pre-generate multiple color variants for each sprite type
    spriteKeys.forEach(key => {
      loadedSprites[key] = [];
      // Generate 2 variants per species (Standard + Variant)
      for (let i = 0; i < 2; i++) {
        const base = randomColor();
        const palette = {
          '#': base, // Body
          'o': secondaryColor(base), // Detail/Shadow
          'x': i === 0 ? '#0F172A' : '#1E293B', // Outline (Dark)
          '.': 'transparent'
        };
        const img = new Image();
        img.src = createSprite(SPRITES[key], 4, palette); // Scale 4 is good for 16-32px sprites
        loadedSprites[key].push(img);
      }
    });
    
    // Bubble sprite
    const bubbleImg = new Image();
    bubbleImg.src = createSprite(SPRITES['bubble'], 2, { 'x': '#334155', '.': 'transparent' });

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Spawn animals
    const spawnAnimals = () => {
      const count = Math.min(40, Math.floor(window.innerWidth / 50)); // More animals
      animalsRef.current = [];
      
      for (let i = 0; i < count; i++) {
        const type = spriteKeys[Math.floor(Math.random() * spriteKeys.length)];
        const variants = loadedSprites[type];
        if (!variants || variants.length === 0) continue;
        
        const img = variants[Math.floor(Math.random() * variants.length)];

        animalsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 0.5,
          type,
          image: img,
          width: img.width,
          height: img.height,
          frame: 0,
          baseSpeed: 0.5 + Math.random() * 1.5,
          speed: 0, // Init
          scale: 0.8 + Math.random() * 0.6,
          angle: 0,
          color: '',
          fleeing: false
        });
      }
    };

    setTimeout(spawnAnimals, 500);

    let animationFrameId: number;
    
    const animate = () => {
      // Clear with transparency to allow trails? No, strict clear for performance
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 1. Draw Darkness Layer (Base) - Everything is dark by default
      // We rely on 'destination-in' or masking to reveal.
      // Strategy: Draw animals to an offscreen canvas or just draw them normally
      // but put a heavy dark overlay on top, then punch a hole with the cursor light.
      // BUT user wants them "hidden until the glow illuminates them".
      // Easiest way: Global composite operation.
      
      // Step A: Draw all animals (they will be the content)
      ctx.save();
      
      animalsRef.current.forEach(animal => {
        // Logic
        const dx = mouseRef.current.x - animal.x;
        const dy = mouseRef.current.y - animal.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Flee Logic - ALL animals flee
        if (dist < 300) {
          animal.fleeing = true;
          // Vector away from cursor
          const angle = Math.atan2(dy, dx);
          const force = (300 - dist) / 300; // Stronger closer
          
          animal.vx -= Math.cos(angle) * force * 0.5;
          animal.vy -= Math.sin(angle) * force * 0.5;
          
          // Boost speed
          animal.speed = animal.baseSpeed * 3;
        } else {
          animal.fleeing = false;
          // Return to base speed gradually
          animal.speed = animal.speed * 0.95 + animal.baseSpeed * 0.05;
        }

        // Apply Velocity
        animal.x += animal.vx;
        animal.y += animal.vy;

        // Friction/Cruising
        animal.vx *= 0.99;
        animal.vy *= 0.99;
        
        // Minimal movement if idle
        if (!animal.fleeing) {
            if (Math.abs(animal.vx) < 0.5) animal.vx += (Math.random() - 0.5) * 0.1;
            if (Math.abs(animal.vy) < 0.5) animal.vy += (Math.random() - 0.5) * 0.1;
        }

        // Wall wrapping
        if (animal.x < -100) animal.x = canvas.width + 100;
        if (animal.x > canvas.width + 100) animal.x = -100;
        if (animal.y < -100) animal.y = canvas.height + 100;
        if (animal.y > canvas.height + 100) animal.y = -100;

        // Rotation based on velocity
        const targetAngle = Math.atan2(animal.vy, animal.vx);
        // Smooth rotation
        let diff = targetAngle - animal.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        animal.angle += diff * 0.1;

        // Draw
        ctx.save();
        ctx.translate(animal.x, animal.y);
        
        // Flip if heading left (simplified sprite facing)
        // Actually, let's rotate properly
        // If sprite faces right by default:
        if (Math.abs(animal.vx) > 0.1) {
            ctx.scale(animal.vx > 0 ? 1 : -1, 1);
        }
        
        ctx.scale(animal.scale, animal.scale);
        
        // Bobbing animation
        const bob = Math.sin(Date.now() / 200 + animal.x) * 3;
        ctx.drawImage(animal.image, -animal.width / 2, -animal.height / 2 + bob);
        
        ctx.restore();

        // Particles
        if (Math.random() < 0.002) {
           particlesRef.current.push({
             x: animal.x,
             y: animal.y,
             vy: -0.5 - Math.random(),
             life: 150,
             image: bubbleImg
           });
        }
      });

      // Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.y += p.vy;
        p.life--;
        ctx.globalAlpha = p.life / 150 * 0.5;
        ctx.drawImage(p.image, p.x, p.y);
        ctx.globalAlpha = 1;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
      }
      
      ctx.restore(); // End drawing content

      // 2. Darkness & Illumination Mask
      // We want the screen black EXCEPT where the light is.
      // Destination-in keeps existing content where new shape is drawn.
      // But we also want the background color to remain. 
      // Actually, better approach: Draw a black rectangle over everything,
      // then use 'destination-out' to punch a hole with a gradient.
      
      ctx.save();
      // Draw full darkness
      ctx.fillStyle = 'rgba(3, 5, 8, 0.95)'; // Very dark water
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Punch hole
      ctx.globalCompositeOperation = 'destination-out';
      const gradient = ctx.createRadialGradient(
        mouseRef.current.x, 
        mouseRef.current.y, 
        50, // Inner radius (fully clear)
        mouseRef.current.x, 
        mouseRef.current.y, 
        400 // Outer radius (fade to black)
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 bg-[#020406]">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
