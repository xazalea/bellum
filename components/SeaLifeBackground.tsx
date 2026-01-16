'use client';

import React, { useEffect, useRef } from 'react';
import { SPRITES, PALETTES, createSprite, PixelMap } from '@/lib/ui/sprites';

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
  scale: number;
  reaction: 'flee' | 'attract' | 'ignore';
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

    // Pre-generate sprites
    const loadedSprites: Record<string, HTMLImageElement> = {};
    const spriteKeys = Object.keys(SPRITES) as Array<keyof typeof SPRITES>;
    
    // Create ocean palette variations
    const palettes = {
      fish: { ...PALETTES.ocean, '#': '#334155', 'x': '#1E293B' },
      octopus: { ...PALETTES.ocean, '#': '#475569', 'x': '#334155' },
      jellyfish: { ...PALETTES.ocean, '#': '#64748B', 'x': '#475569', 'o': '#334155' },
      bubble: { '#': '#475569', '.': 'transparent' }
    };

    spriteKeys.forEach(key => {
      const img = new Image();
      // Use specific palette or default ocean
      const palette = palettes[key as keyof typeof palettes] || PALETTES.ocean;
      img.src = createSprite(SPRITES[key], 4, palette);
      loadedSprites[key] = img;
    });

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resize);
    resize();

    // Track mouse
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Spawn animals
    const spawnAnimals = () => {
      const count = Math.min(20, Math.floor(window.innerWidth / 100));
      animalsRef.current = [];
      
      for (let i = 0; i < count; i++) {
        const type = spriteKeys[Math.floor(Math.random() * (spriteKeys.length - 2)) + 1]; // Skip cursor
        const img = loadedSprites[type];
        if (!img) continue;

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
          speed: 1 + Math.random(),
          scale: 0.5 + Math.random() * 0.5,
          reaction: type === 'fish' ? 'flee' : type === 'octopus' ? 'attract' : 'ignore'
        });
      }
    };

    // Wait for images to load somewhat
    setTimeout(spawnAnimals, 500);

    // Animation Loop
    let animationFrameId: number;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update & Draw Animals
      animalsRef.current.forEach(animal => {
        // Base movement
        animal.x += animal.vx * animal.speed;
        animal.y += animal.vy * animal.speed;

        // Wall wrapping
        if (animal.x < -100) animal.x = canvas.width + 100;
        if (animal.x > canvas.width + 100) animal.x = -100;
        if (animal.y < -100) animal.y = canvas.height + 100;
        if (animal.y > canvas.height + 100) animal.y = -100;

        // Interaction
        const dx = mouseRef.current.x - animal.x;
        const dy = mouseRef.current.y - animal.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200) {
          if (animal.reaction === 'flee') {
            animal.vx -= (dx / dist) * 0.2;
            animal.vy -= (dy / dist) * 0.2;
          } else if (animal.reaction === 'attract') {
            animal.vx += (dx / dist) * 0.1;
            animal.vy += (dy / dist) * 0.1;
          }
        }

        // Speed limit
        const maxSpeed = 3;
        const speed = Math.sqrt(animal.vx * animal.vx + animal.vy * animal.vy);
        if (speed > maxSpeed) {
          animal.vx = (animal.vx / speed) * maxSpeed;
          animal.vy = (animal.vy / speed) * maxSpeed;
        }

        // Draw
        ctx.save();
        ctx.translate(animal.x, animal.y);
        if (animal.vx > 0) ctx.scale(-1, 1); // Flip if moving right
        ctx.scale(animal.scale, animal.scale);
        
        // Bobbing effect
        const bob = Math.sin(Date.now() / 500 + animal.x) * 5;
        ctx.drawImage(animal.image, -animal.width / 2, -animal.height / 2 + bob);
        
        ctx.restore();
        
        // Randomly spawn bubbles
        if (Math.random() < 0.005) {
          particlesRef.current.push({
            x: animal.x + (Math.random() - 0.5) * 20,
            y: animal.y,
            vy: -1 - Math.random(),
            life: 100,
            image: loadedSprites['bubble']
          });
        }
      });

      // Update & Draw Particles (Bubbles)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.y += p.vy;
        p.life--;
        
        ctx.globalAlpha = p.life / 100;
        ctx.drawImage(p.image, p.x, p.y, 8, 8);
        ctx.globalAlpha = 1;

        if (p.life <= 0) particlesRef.current.splice(i, 1);
      }

      // Draw Cursor Light (Illumination)
      ctx.save();
      ctx.globalCompositeOperation = 'overlay'; 
      const gradient = ctx.createRadialGradient(
        mouseRef.current.x, 
        mouseRef.current.y, 
        0, 
        mouseRef.current.x, 
        mouseRef.current.y, 
        200
      );
      gradient.addColorStop(0, 'rgba(51, 65, 85, 0.2)');
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
    <div ref={containerRef} className="fixed inset-0 z-0 bg-[#030508]">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
