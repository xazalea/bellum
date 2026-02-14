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
  opacity: number;
  bobPhase: number;
  bobAmplitude: number;
}

// All creatures are white / soft-white
const CREATURE_COLORS = ['rgba(255,255,255,0.9)', 'rgba(220,235,255,0.85)', 'rgba(200,225,255,0.8)'];

function pickColor() {
  return CREATURE_COLORS[Math.floor(Math.random() * CREATURE_COLORS.length)];
}

function createCreature(canvasWidth: number, canvasHeight: number, type: 'fish' | 'jellyfish'): Creature {
  const scale = 1.5 + Math.random() * 1.5;

  return {
    type,
    // Fish always start off the left edge and swim right
    x: type === 'fish'
      ? -SPRITE_SIZE * scale - Math.random() * canvasWidth * 0.5
      : Math.random() * canvasWidth,
    y: type === 'fish'
      ? 100 + Math.random() * (canvasHeight - 200)
      : canvasHeight + SPRITE_SIZE * scale,
    speed: type === 'fish'
      ? 0.25 + Math.random() * 0.6
      : 0.12 + Math.random() * 0.25,
    scale,
    frame: Math.floor(Math.random() * FRAME_COUNT),
    frameTimer: 0,
    frameInterval: 160 + Math.random() * 120,
    opacity: 0.12 + Math.random() * 0.2,
    bobPhase: Math.random() * Math.PI * 2,
    bobAmplitude: type === 'fish' ? 2 + Math.random() * 3 : 1 + Math.random() * 2,
  };
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  frames: string[][],
  creature: Creature,
  time: number,
  color: string,
) {
  const frame = frames[creature.frame];
  if (!frame) return;

  const bobOffset = Math.sin(time * 0.001 + creature.bobPhase) * creature.bobAmplitude;

  ctx.save();
  ctx.globalAlpha = creature.opacity;
  ctx.translate(creature.x, creature.y + bobOffset);
  ctx.fillStyle = color;

  const px = creature.scale;

  for (let row = 0; row < SPRITE_SIZE; row++) {
    const rowData = frame[row];
    if (!rowData) continue;
    for (let col = 0; col < SPRITE_SIZE; col++) {
      if (rowData[col] === '1') {
        ctx.fillRect(col * px, row * px, px, px);
      }
    }
  }
  ctx.restore();
}

export default function OceanCreatures() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const creaturesRef = useRef<Creature[]>([]);
  const colorsRef = useRef<string[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const initCreatures = useCallback((width: number, height: number) => {
    const creatures: Creature[] = [];
    const colors: string[] = [];

    // 3 fish, 2 jellyfish — lighter load for smooth performance
    for (let i = 0; i < 3; i++) {
      creatures.push(createCreature(width, height, 'fish'));
      colors.push(pickColor());
    }
    for (let i = 0; i < 2; i++) {
      creatures.push(createCreature(width, height, 'jellyfish'));
      colors.push(pickColor());
    }

    // Spread initial positions so they're visible immediately
    creatures.forEach((c) => {
      if (c.type === 'fish') {
        c.x = Math.random() * width * 0.6;
      } else {
        c.y = Math.random() * height;
      }
    });

    creaturesRef.current = creatures;
    colorsRef.current = colors;
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
      const dt = Math.min(time - lastTimeRef.current, 50); // Cap delta to avoid jumps
      lastTimeRef.current = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const creatures = creaturesRef.current;
      const colors = colorsRef.current;

      for (let i = 0; i < creatures.length; i++) {
        const c = creatures[i];

        // Update frame animation
        c.frameTimer += dt;
        if (c.frameTimer >= c.frameInterval) {
          c.frameTimer = 0;
          c.frame = (c.frame + 1) % FRAME_COUNT;
        }

        // Move creature
        if (c.type === 'fish') {
          // Fish always swim left to right
          c.x += c.speed * (dt / 16);
          const spriteWidth = SPRITE_SIZE * c.scale;
          if (c.x > canvas.width + spriteWidth) {
            Object.assign(c, createCreature(canvas.width, canvas.height, 'fish'));
            colors[i] = pickColor();
          }
        } else {
          // Jellyfish float upward with gentle sway
          c.y -= c.speed * (dt / 16);
          c.x += Math.sin(time * 0.0004 + c.bobPhase) * 0.2;
          if (c.y < -SPRITE_SIZE * c.scale) {
            Object.assign(c, createCreature(canvas.width, canvas.height, 'jellyfish'));
            colors[i] = pickColor();
          }
        }

        // Draw
        const frames = c.type === 'fish' ? FISH_FRAMES : JELLYFISH_FRAMES;
        drawSprite(ctx, frames, c, time, colors[i]);
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
