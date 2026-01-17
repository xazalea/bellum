// Advanced animation system for pixel art sprites
// Inspired by Piskel's animation capabilities

export interface AnimationFrame {
  sprite: HTMLImageElement;
  duration: number; // ms
}

export interface AnimatedSpriteConfig {
  frames: AnimationFrame[];
  loop: boolean;
  speed: number; // multiplier
}

export class AnimatedSprite {
  private frames: AnimationFrame[];
  private currentFrame: number = 0;
  private frameTime: number = 0;
  private loop: boolean;
  private speed: number;
  private playing: boolean = true;

  constructor(config: AnimatedSpriteConfig) {
    this.frames = config.frames;
    this.loop = config.loop;
    this.speed = config.speed;
  }

  update(deltaTime: number): void {
    if (!this.playing || this.frames.length === 0) return;

    this.frameTime += deltaTime * this.speed;
    const currentFrameDuration = this.frames[this.currentFrame].duration;

    if (this.frameTime >= currentFrameDuration) {
      this.frameTime = 0;
      this.currentFrame++;

      if (this.currentFrame >= this.frames.length) {
        if (this.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = this.frames.length - 1;
          this.playing = false;
        }
      }
    }
  }

  getCurrentFrame(): HTMLImageElement {
    return this.frames[this.currentFrame]?.sprite;
  }

  reset(): void {
    this.currentFrame = 0;
    this.frameTime = 0;
    this.playing = true;
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }
}

// Particle system for ambient effects
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: string;
  sprite?: HTMLImageElement;
  size: number;
  opacity: number;
  color?: string;
  rotation?: number;
  rotationSpeed?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 200) {
    this.maxParticles = maxParticles;
  }

  emit(particle: Particle): void {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(particle);
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.x += p.vx * deltaTime / 16;
      p.y += p.vy * deltaTime / 16;
      p.life -= deltaTime;
      
      if (p.rotationSpeed) {
        p.rotation = (p.rotation || 0) + p.rotationSpeed * deltaTime / 16;
      }
      
      // Fade out
      p.opacity = p.life / p.maxLife;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      
      if (p.rotation) {
        ctx.rotate(p.rotation);
      }

      if (p.sprite) {
        ctx.drawImage(
          p.sprite,
          -p.size / 2,
          -p.size / 2,
          p.size,
          p.size
        );
      } else if (p.color) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });
  }

  getCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}

// Ambient element (kelp, coral, etc.)
export interface AmbientElement {
  x: number;
  y: number;
  type: string;
  sprite: HTMLImageElement;
  scale: number;
  sway: number;
  swaySpeed: number;
  swayAmount: number;
  depth: number; // 0-1, for parallax
}

export class AmbientLayer {
  private elements: AmbientElement[] = [];

  addElement(element: AmbientElement): void {
    this.elements.push(element);
  }

  update(time: number): void {
    this.elements.forEach(el => {
      el.sway = Math.sin(time / 1000 * el.swaySpeed) * el.swayAmount;
    });
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number = 0): void {
    this.elements.forEach(el => {
      ctx.save();
      
      // Parallax effect
      const parallaxX = el.x - cameraX * el.depth;
      
      ctx.translate(parallaxX, el.y);
      ctx.rotate(el.sway);
      ctx.scale(el.scale, el.scale);
      
      // Depth-based opacity
      ctx.globalAlpha = 0.3 + el.depth * 0.5;
      
      ctx.drawImage(
        el.sprite,
        -el.sprite.width / 2,
        -el.sprite.height / 2
      );
      
      ctx.restore();
    });
  }

  getElements(): AmbientElement[] {
    return this.elements;
  }
}

// Bioluminescent glow effect
export interface GlowEffect {
  x: number;
  y: number;
  intensity: number;
  radius: number;
  color: string;
  pulse: boolean;
  pulseSpeed: number;
}

export class BioluminescentLayer {
  private glows: GlowEffect[] = [];

  addGlow(glow: GlowEffect): void {
    this.glows.push(glow);
  }

  update(time: number): void {
    this.glows.forEach(glow => {
      if (glow.pulse) {
        glow.intensity = 0.5 + Math.sin(time / 1000 * glow.pulseSpeed) * 0.5;
      }
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    this.glows.forEach(glow => {
      const gradient = ctx.createRadialGradient(
        glow.x, glow.y, 0,
        glow.x, glow.y, glow.radius
      );
      
      const alpha = glow.intensity;
      gradient.addColorStop(0, glow.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba'));
      gradient.addColorStop(0.5, glow.color.replace(')', `, ${alpha * 0.5})`).replace('rgb', 'rgba'));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(
        glow.x - glow.radius,
        glow.y - glow.radius,
        glow.radius * 2,
        glow.radius * 2
      );
    });
    
    ctx.restore();
  }

  removeGlow(index: number): void {
    this.glows.splice(index, 1);
  }

  clear(): void {
    this.glows = [];
  }
}
