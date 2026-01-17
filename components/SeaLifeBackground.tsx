'use client';

import React, { useEffect, useRef } from 'react';
import { SPRITES, PALETTES, createSprite } from '@/lib/ui/sprites';
import { ParticleSystem, AmbientLayer, BioluminescentLayer } from '@/lib/ui/animated-sprites';
import type { Particle, AmbientElement, GlowEffect } from '@/lib/ui/animated-sprites';

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
  angle: number;
  color: string;
  fleeing: boolean;
  animationOffset: number;
  depth: number; // 0-1 for layering
}

export function SeaLifeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animalsRef = useRef<Animal[]>([]);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const ambientLayerRef = useRef<AmbientLayer | null>(null);
  const biolumLayerRef = useRef<BioluminescentLayer | null>(null);
  const lastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Initialize systems
    particleSystemRef.current = new ParticleSystem(300);
    ambientLayerRef.current = new AmbientLayer();
    biolumLayerRef.current = new BioluminescentLayer();

    // Enhanced sprite generation with realistic ocean colors
    const loadedSprites: Record<string, HTMLImageElement[]> = {};
    const spriteKeys = Object.keys(SPRITES).filter(
      k => !['cursor', 'bubble', 'bubble_small', 'bubble_medium', 'bubble_large', 
             'kelp', 'coral_1', 'coral_2', 'plankton_1', 'plankton_2',
             'glow_orb', 'light_ray', 'ripple'].includes(k)
    ) as Array<keyof typeof SPRITES>;
    
    const speciesColors: Record<string, Array<{body: string, detail: string, shadow: string, highlight: string}>> = {
      shark: [
        { body: '#475569', detail: '#334155', shadow: '#1E293B', highlight: '#64748B' },
        { body: '#3F4A5A', detail: '#2D3748', shadow: '#1A202C', highlight: '#5A6B7D' }
      ],
      jellyfish: [
        { body: '#3B4F6F', detail: '#2D3E5F', shadow: '#1E2A42', highlight: '#4A6380' },
        { body: '#4A5F7F', detail: '#364A66', shadow: '#22334C', highlight: '#5A7090' },
        { body: '#5B728F', detail: '#45586F', shadow: '#2E3C52', highlight: '#708AA8' }
      ],
      turtle: [
        { body: '#4A5D4E', detail: '#354538', shadow: '#1F2920', highlight: '#5F7862' },
        { body: '#3E5345', detail: '#2D3D32', shadow: '#1A2520', highlight: '#526F58' }
      ],
      fish: [
        { body: '#5580A0', detail: '#3D5F7F', shadow: '#2A4560', highlight: '#6B98B8' },
        { body: '#4A6B8A', detail: '#35506A', shadow: '#20354A', highlight: '#5F85A5' },
        { body: '#4E7590', detail: '#3A5670', shadow: '#253750', highlight: '#6390B0' }
      ],
      octopus: [
        { body: '#6B4A55', detail: '#4F3540', shadow: '#33202A', highlight: '#856070' },
        { body: '#5F4550', detail: '#45323D', shadow: '#2B1F28', highlight: '#795A6A' }
      ],
      manta: [
        { body: '#3A4050', detail: '#2A303F', shadow: '#1A1F2B', highlight: '#4A5568' },
        { body: '#35404E', detail: '#252F3B', shadow: '#151D28', highlight: '#455060' }
      ],
      seahorse: [
        { body: '#D4A574', detail: '#B88F5E', shadow: '#8F6B45', highlight: '#E8BF8E' },
        { body: '#C89868', detail: '#A87C52', shadow: '#7F5E3C', highlight: '#DCB282' }
      ],
      clownfish: [
        { body: '#D97742', detail: '#C15F2F', shadow: '#9A4820', highlight: '#ED9060' },
        { body: '#E68850', detail: '#CE6F38', shadow: '#A55528', highlight: '#FFA26E' }
      ],
      starfish: [
        { body: '#A05555', detail: '#7F3F3F', shadow: '#602A2A', highlight: '#C07070' },
        { body: '#9A6060', detail: '#7A4545', shadow: '#5A3030', highlight: '#BA7A7A' }
      ]
    };

    // Generate creature sprites
    spriteKeys.forEach(key => {
      loadedSprites[key] = [];
      const colors = speciesColors[key] || [
        { body: '#475569', detail: '#334155', shadow: '#1E293B', highlight: '#64748B' }
      ];
      
      colors.forEach(colorScheme => {
        const palette = {
          '#': colorScheme.body,
          'o': colorScheme.detail,
          '@': colorScheme.shadow,
          '+': colorScheme.highlight,
          'x': '#0F172A',
          '.': 'transparent'
        };
        const img = new Image();
        img.src = createSprite(SPRITES[key], 3, palette);
        loadedSprites[key].push(img);
      });
    });
    
    // Generate ambient sprites
    const kelpSprite = new Image();
    kelpSprite.src = createSprite(SPRITES.kelp, 2, {
      '#': '#2D4A3E',
      'o': '#1F3530',
      'x': '#0F172A',
      '+': '#3F5F52',
      '@': '#172920',
      '.': 'transparent'
    });

    const coral1Sprite = new Image();
    coral1Sprite.src = createSprite(SPRITES.coral_1, 2, {
      '#': '#7F5A6B',
      'o': '#5F3F4F',
      'x': '#0F172A',
      '+': '#9F7A8B',
      '@': '#3F2A35',
      '.': 'transparent'
    });

    const coral2Sprite = new Image();
    coral2Sprite.src = createSprite(SPRITES.coral_2, 2, {
      '#': '#8F6A55',
      'o': '#6F4A35',
      'x': '#0F172A',
      '+': '#AF8A75',
      '@': '#4F3A25',
      '.': 'transparent'
    });

    // Bubble sprites with shine
    const bubbleSmall = new Image();
    bubbleSmall.src = createSprite(SPRITES.bubble_small, 2, {
      'x': '#334155',
      'o': '#1E293B',
      '+': '#8B9DB8',
      '.': 'transparent'
    });

    const bubbleMedium = new Image();
    bubbleMedium.src = createSprite(SPRITES.bubble_medium, 2, {
      'x': '#334155',
      'o': '#1E293B',
      '+': '#A0B3CC',
      '.': 'transparent'
    });

    const bubbleLarge = new Image();
    bubbleLarge.src = createSprite(SPRITES.bubble_large, 2, {
      'x': '#334155',
      'o': '#1E293B',
      '+': '#B8C8E0',
      '.': 'transparent'
    });

    // Plankton sprites
    const plankton1 = new Image();
    plankton1.src = createSprite(SPRITES.plankton_1, 1, {
      '#': '#4A6380',
      'x': '#2A4360',
      '.': 'transparent'
    });

    const plankton2 = new Image();
    plankton2.src = createSprite(SPRITES.plankton_2, 1, {
      '#': '#3B5270',
      'x': '#1B3250',
      '.': 'transparent'
    });

    const glowOrb = new Image();
    glowOrb.src = createSprite(SPRITES.glow_orb, 2, {
      '#': '#5F85A5',
      '+': '#8FA8C8',
      'o': '#3F5570',
      'x': '#1F2A3A',
      '.': 'transparent'
    });

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

    // Spawn ambient elements (kelp, coral)
    const spawnAmbient = () => {
      const ambientLayer = ambientLayerRef.current;
      if (!ambientLayer) return;

      // Bottom kelp
      for (let i = 0; i < 30; i++) {
        ambientLayer.addElement({
          x: Math.random() * canvas.width,
          y: canvas.height - Math.random() * 200,
          type: 'kelp',
          sprite: kelpSprite,
          scale: 0.8 + Math.random() * 0.8,
          sway: 0,
          swaySpeed: 0.5 + Math.random() * 0.5,
          swayAmount: 0.1 + Math.random() * 0.15,
          depth: 0.2 + Math.random() * 0.3
        });
      }

      // Coral
      for (let i = 0; i < 15; i++) {
        const sprite = Math.random() > 0.5 ? coral1Sprite : coral2Sprite;
        ambientLayer.addElement({
          x: Math.random() * canvas.width,
          y: canvas.height - Math.random() * 150,
          type: 'coral',
          sprite,
          scale: 0.6 + Math.random() * 0.6,
          sway: 0,
          swaySpeed: 0.3 + Math.random() * 0.3,
          swayAmount: 0.05 + Math.random() * 0.05,
          depth: 0.1 + Math.random() * 0.2
        });
      }
    };

    // Spawn animals with depth layering
    const spawnAnimals = () => {
      const density = Math.min(60, Math.floor(window.innerWidth / 35));
      animalsRef.current = [];
      
      const weights: Record<string, number> = {
        fish: 3.5,
        clownfish: 2.8,
        jellyfish: 2.2,
        seahorse: 1.8,
        octopus: 0.9,
        turtle: 1.2,
        shark: 0.6,
        manta: 0.8,
        starfish: 1.4
      };
      
      const weightedKeys: string[] = [];
      spriteKeys.forEach(key => {
        const weight = weights[key] || 1;
        for (let i = 0; i < weight * 10; i++) {
          weightedKeys.push(key);
        }
      });
      
      for (let i = 0; i < density; i++) {
        const type = weightedKeys[Math.floor(Math.random() * weightedKeys.length)] as keyof typeof SPRITES;
        const variants = loadedSprites[type];
        if (!variants || variants.length === 0) continue;
        
        const img = variants[Math.floor(Math.random() * variants.length)];
        
        let baseSpeed = 0.5 + Math.random() * 1.0;
        let scale = 0.7 + Math.random() * 0.5;
        const depth = Math.random(); // 0-1, affects layering and size
        
        // Species-specific behaviors
        if (type === 'shark') {
          baseSpeed = 1.2 + Math.random() * 0.8;
          scale = 1.0 + Math.random() * 0.4;
        } else if (type === 'jellyfish') {
          baseSpeed = 0.3 + Math.random() * 0.4;
          scale = 0.6 + Math.random() * 0.6;
        } else if (type === 'manta') {
          baseSpeed = 0.8 + Math.random() * 0.6;
          scale = 0.9 + Math.random() * 0.4;
        } else if (type === 'seahorse') {
          baseSpeed = 0.2 + Math.random() * 0.3;
          scale = 0.5 + Math.random() * 0.4;
        } else if (type === 'starfish') {
          baseSpeed = 0.1 + Math.random() * 0.2;
          scale = 0.4 + Math.random() * 0.3;
        }

        // Depth affects scale and position
        scale *= (0.6 + depth * 0.8);

        animalsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * baseSpeed * 1.5,
          vy: (Math.random() - 0.5) * baseSpeed * 0.4,
          type,
          image: img,
          width: img.width,
          height: img.height,
          frame: 0,
          baseSpeed,
          speed: baseSpeed,
          scale,
          angle: 0,
          color: '',
          fleeing: false,
          animationOffset: Math.random() * 1000,
          depth
        });
      }

      // Sort by depth for proper rendering
      animalsRef.current.sort((a, b) => a.depth - b.depth);
    };

    setTimeout(() => {
      spawnAmbient();
      spawnAnimals();
    }, 100);

    let animationFrameId: number;
    let particleSpawnTimer = 0;
    
    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Clear canvas
      ctx.fillStyle = '#020406';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const time = Date.now();
      const particleSystem = particleSystemRef.current;
      const ambientLayer = ambientLayerRef.current;
      const biolumLayer = biolumLayerRef.current;

      // Update and render ambient elements (back layer)
      if (ambientLayer) {
        ambientLayer.update(time);
        ambientLayer.render(ctx);
      }

      // Spawn ambient particles
      particleSpawnTimer += deltaTime;
      if (particleSpawnTimer > 100 && particleSystem) {
        particleSpawnTimer = 0;
        
        // Plankton particles
        if (Math.random() < 0.3) {
          const sprite = Math.random() > 0.5 ? plankton1 : plankton2;
          particleSystem.emit({
            x: Math.random() * canvas.width,
            y: -20,
            vx: (Math.random() - 0.5) * 0.2,
            vy: 0.3 + Math.random() * 0.4,
            life: 8000 + Math.random() * 4000,
            maxLife: 12000,
            type: 'plankton',
            sprite,
            size: 3 + Math.random() * 3,
            opacity: 1,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02
          });
        }
      }

      // Update particles
      if (particleSystem) {
        particleSystem.update(deltaTime);
      }

      ctx.save();
      
      // Draw animals
      animalsRef.current.forEach(animal => {
        const dx = mouseRef.current.x - animal.x;
        const dy = mouseRef.current.y - animal.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Species-specific flee distance
        let fleeDistance = 250;
        let fleeForce = 0.5;
        
        if (animal.type === 'shark') {
          fleeDistance = 150;
          fleeForce = 0.3;
        } else if (animal.type === 'starfish' || animal.type === 'seahorse') {
          fleeDistance = 100;
          fleeForce = 0.2;
        } else if (animal.type === 'jellyfish') {
          fleeDistance = 300;
          fleeForce = 0.6;
        }
        
        // Flee behavior
        if (dist < fleeDistance) {
          animal.fleeing = true;
          const angle = Math.atan2(dy, dx);
          const force = (fleeDistance - dist) / fleeDistance;
          
          animal.vx -= Math.cos(angle) * force * fleeForce;
          animal.vy -= Math.sin(angle) * force * fleeForce;
          
          animal.speed = animal.baseSpeed * 2.5;
        } else {
          animal.fleeing = false;
          animal.speed = animal.speed * 0.95 + animal.baseSpeed * 0.05;
        }

        // Apply velocity
        animal.x += animal.vx;
        animal.y += animal.vy;

        // Friction
        const friction = animal.type === 'jellyfish' ? 0.98 : 
                        animal.type === 'starfish' ? 0.95 : 0.99;
        animal.vx *= friction;
        animal.vy *= friction;
        
        // Natural movement patterns
        if (!animal.fleeing) {
          if (animal.type === 'jellyfish') {
            animal.vy += Math.sin(time / 1000 + animal.animationOffset) * 0.02;
          } else if (animal.type === 'seahorse') {
            animal.vy += Math.sin(time / 500 + animal.animationOffset) * 0.015;
            animal.vx *= 0.97;
          } else if (animal.type === 'starfish') {
            animal.vx *= 0.95;
            animal.vy += 0.02;
          } else {
            if (Math.abs(animal.vx) < 0.3) animal.vx += (Math.random() - 0.5) * 0.15;
            if (Math.abs(animal.vy) < 0.2) animal.vy += (Math.random() - 0.5) * 0.08;
          }
        }

        // Wall wrapping
        const margin = 150;
        if (animal.x < -margin) animal.x = canvas.width + margin;
        if (animal.x > canvas.width + margin) animal.x = -margin;
        if (animal.y < -margin) animal.y = canvas.height + margin;
        if (animal.y > canvas.height + margin) animal.y = -margin;

        // Rotation
        const targetAngle = Math.atan2(animal.vy, animal.vx);
        let diff = targetAngle - animal.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        
        const rotationSpeed = animal.type === 'manta' ? 0.05 : 
                             animal.type === 'shark' ? 0.08 : 0.1;
        animal.angle += diff * rotationSpeed;

        // Draw with depth-based effects and cursor illumination
        ctx.save();
        ctx.translate(animal.x, animal.y);
        
        // Calculate illumination from cursor
        const lightDist = Math.sqrt(dx * dx + dy * dy);
        const maxLightDistance = 450;
        const lightIntensity = Math.max(0, 1 - (lightDist / maxLightDistance));
        
        // Base visibility (very dark) + light reveal
        const baseAlpha = 0.05 + (animal.depth * 0.05); // Very dark by default
        const illuminatedAlpha = 0.6 + (animal.depth * 0.4); // Full visibility in light
        const depthAlpha = baseAlpha + (lightIntensity * (illuminatedAlpha - baseAlpha));
        
        ctx.globalAlpha = depthAlpha;
        
        if (Math.abs(animal.vx) > 0.05) {
          ctx.scale(animal.vx > 0 ? 1 : -1, 1);
        }
        
        ctx.scale(animal.scale, animal.scale);
        
        // Species-specific animation
        let offset = 0;
        
        if (animal.type === 'jellyfish') {
          offset = Math.sin(time / 300 + animal.animationOffset) * 5;
        } else if (animal.type === 'fish' || animal.type === 'clownfish') {
          offset = Math.sin(time / 150 + animal.animationOffset) * 2;
        } else if (animal.type === 'seahorse') {
          offset = Math.sin(time / 400 + animal.animationOffset) * 3;
        }
        
        ctx.drawImage(animal.image, -animal.width / 2, -animal.height / 2 + offset);
        
        ctx.restore();

        // Bubble generation
        if (particleSystem && Math.random() < 0.0015) {
          const bubbleSprites = [bubbleSmall, bubbleMedium, bubbleLarge];
          const bubble = bubbleSprites[Math.floor(Math.random() * bubbleSprites.length)];
          const size = 8 + Math.random() * 16;
          
          particleSystem.emit({
            x: animal.x + (Math.random() - 0.5) * 20,
            y: animal.y,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.4 - Math.random() * 0.6,
            life: 2000 + Math.random() * 2000,
            maxLife: 4000,
            type: 'bubble',
            sprite: bubble,
            size,
            opacity: 1,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.03
          });
        }
      });

      ctx.restore();

      // Render particles (middle layer)
      if (particleSystem) {
        particleSystem.render(ctx);
      }

      // Deep darkness with cursor light reveal
      ctx.save();
      
      // Very dark overlay - creatures hidden in darkness
      ctx.fillStyle = 'rgba(2, 4, 6, 0.92)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Cursor light - punch hole to reveal creatures
      ctx.globalCompositeOperation = 'destination-out';
      const lightGradient = ctx.createRadialGradient(
        mouseRef.current.x, 
        mouseRef.current.y, 
        0,
        mouseRef.current.x, 
        mouseRef.current.y, 
        450
      );
      lightGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      lightGradient.addColorStop(0.25, 'rgba(0, 0, 0, 0.8)');
      lightGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
      lightGradient.addColorStop(0.75, 'rgba(0, 0, 0, 0.2)');
      lightGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = lightGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Bioluminescent glow around cursor
      ctx.globalCompositeOperation = 'screen';
      const biolumGradient = ctx.createRadialGradient(
        mouseRef.current.x, 
        mouseRef.current.y, 
        0,
        mouseRef.current.x, 
        mouseRef.current.y, 
        300
      );
      biolumGradient.addColorStop(0, 'rgba(139, 157, 184, 0.25)');
      biolumGradient.addColorStop(0.4, 'rgba(100, 116, 139, 0.15)');
      biolumGradient.addColorStop(0.7, 'rgba(71, 85, 105, 0.08)');
      biolumGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = biolumGradient;
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
