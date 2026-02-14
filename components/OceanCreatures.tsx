'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { FISH_FRAMES, JELLYFISH_FRAMES, SPRITE_SIZE, FRAME_COUNT } from '@/lib/ui/sprite-data';

interface Creature {
  type: 'fish' | 'jellyfish';
  x: number;
  y: number;
  speed: number;
  scale: number;
  frame: number;
  frameTimer: number;
  frameInterval: number;
  color: string;
  flipX: boolean;
  opacity: number;
  bobPhase: number;
  bobAmplitude: number;
}

const FISH_COLORS = ['#00ffcc', '#00ccff', '#33ffd6', '#66ddff', '#00aa88', '#44bbdd'];
const JELLY_COLORS = ['#ff66cc', '#cc44ff', '#ff88dd', '#aa33ff', '#ff44aa', '#dd66ff'];

function createCreature(canvasWidth: number, canvasHeight: number, type: 'fish' | 'jellyfish'): Creature {
  const scale = 1.5 + Math.random() * 2;
  const colors = type === 'fish' ? FISH_COLORS : JELLY_COLORS;
  const flipX = type === 'fish' ? Math.random() > 0.5 : false;
  
  return {
    type,
    x: type === 'fish' 
      ? (flipX ? canvasWidth + SPRITE_SIZE * scale : -SPRITE_SIZE * scale)
      : Math.random() * canvasWidth,
    y: type === 'fish' 
      ? 100 + Math.random() * (canvasHeight - 200)
      : canvasHeight + SPRITE_SIZE * scale,
    speed: type === 'fish' 
      ? 0.3 + Math.random() * 0.8
      : 0.15 + Math.random() * 0.3,
    scale,
    frame: Math.floor(Math.random() * FRAME_COUNT),
    frameTimer: 0,
    frameInterval: 150 + Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    flipX,
    opacity: 0.15 + Math.random() * 0.35,
    bobPhase: Math.random() * Math.PI * 2,
    bobAmplitude: type === 'fish' ? 2 + Math.random() * 4 : 1 + Math.random() * 2,
  };
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  frames: string[][],
  creature: Creature,
  time: number
) {
  const frame = frames[creature.frame];
  if (!frame) return;
  
  const bobOffset = Math.sin(time * 0.001 + creature.bobPhase) * creature.bobAmplitude;
  
  ctx.save();
  ctx.globalAlpha = creature.opacity;
  ctx.translate(creature.x, creature.y + bobOffset);
  
  if (creature.flipX) {
    ctx.scale(-1, 1);
  }
  
  ctx.fillStyle = creature.color;
  ctx.shadowColor = creature.color;
  ctx.shadowBlur = 4 * creature.scale;
  
  const pixelSize = creature.scale;
  
  for (let row = 0; row < SPRITE_SIZE; row++) {
    const rowData = frame[row];
    if (!rowData) continue;
    for (let col = 0; col < SPRITE_SIZE; col++) {
      if (rowData[col] === '1') {
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
      }
    }
  }
  
  ctx.restore();
}

export default function OceanCreatures() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const creaturesRef = useRef<Creature[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const initCreatures = useCallback((width: number, height: number) => {
    const creatures: Creature[] = [];
    // Start with a few fish and jellyfish
    for (let i = 0; i < 4; i++) {
      creatures.push(createCreature(width, height, 'fish'));
    }
    for (let i = 0; i < 3; i++) {
      creatures.push(createCreature(width, height, 'jellyfish'));
    }
    // Spread initial positions
    creatures.forEach(c => {
      if (c.type === 'fish') {
        c.x = Math.random() * width;
      } else {
        c.y = Math.random() * height;
      }
    });
    creaturesRef.current = creatures;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (creaturesRef.current.length === 0) {
        initCreatures(canvas.width, canvas.height);
      }
    };
    
    resize();
    window.addEventListener('resize', resize);

    const animate = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const creatures = creaturesRef.current;
      
      for (const c of creatures) {
        // Update frame animation
        c.frameTimer += dt;
        if (c.frameTimer >= c.frameInterval) {
          c.frameTimer = 0;
          c.frame = (c.frame + 1) % FRAME_COUNT;
        }
        
        // Move creature
        if (c.type === 'fish') {
          c.x += c.flipX ? -c.speed : c.speed;
          // Reset when off screen
          const spriteWidth = SPRITE_SIZE * c.scale;
          if (!c.flipX && c.x > canvas.width + spriteWidth) {
            Object.assign(c, createCreature(canvas.width, canvas.height, 'fish'));
            c.flipX = false;
            c.x = -spriteWidth;
          } else if (c.flipX && c.x < -spriteWidth) {
            Object.assign(c, createCreature(canvas.width, canvas.height, 'fish'));
            c.flipX = true;
            c.x = canvas.width + spriteWidth;
          }
        } else {
          c.y -= c.speed;
          c.x += Math.sin(time * 0.0005 + c.bobPhase) * 0.3;
          // Reset when off screen
          if (c.y < -SPRITE_SIZE * c.scale) {
            Object.assign(c, createCreature(canvas.width, canvas.height, 'jellyfish'));
            c.y = canvas.height + SPRITE_SIZE * c.scale;
          }
        }
        
        // Draw
        const frames = c.type === 'fish' ? FISH_FRAMES : JELLYFISH_FRAMES;
        drawSprite(ctx, frames, c, time);
      }
      
      animFrameRef.current = requestAnimationFrame(animate);
    };
    
    animFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [initCreatures]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
}
