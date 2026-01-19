/**
 * Sea Life Animation Physics Engine (AssemblyScript WASM)
 * Fallback to pure JavaScript if WASM unavailable
 */

import { loadAndInstantiate } from './loader';

interface AnimationWasm {
  memory: WebAssembly.Memory;
  initAnimal(index: number, x: number, y: number, vx: number, vy: number, speed: number, depth: number): void;
  updateAnimal(index: number, deltaTime: number, canvasWidth: number, canvasHeight: number, frameRate: number): void;
  updateAllAnimals(deltaTime: number, canvasWidth: number, canvasHeight: number, frameRate: number): void;
  getAnimalPosition(index: number): Float32Array;
  addParticle(x: number, y: number, vx: number, vy: number, life: number): void;
  updateParticles(deltaTime: number): void;
  getParticleCount(): number;
  getParticlePosition(index: number): Float32Array;
  clearParticles(): void;
  getAnimalCount(): number;
  clearAnimals(): void;
  checkCollision(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean;
  distance(x1: number, y1: number, x2: number, y2: number): number;
  lerp(a: number, b: number, t: number): number;
}

export interface AnimalState {
  x: number;
  y: number;
  angle: number;
  frame: number;
}

export interface ParticleState {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

let wasmModule: AnimationWasm | null = null;
let useWasm = false;

// JavaScript fallback state
let jsAnimals: AnimalState[] = [];
let jsParticles: ParticleState[] = [];

/**
 * Initialize animation engine
 */
export async function initAnimationEngine(): Promise<boolean> {
  try {
    const imports = {
      env: {
        'Math.random': Math.random,
        abort: () => console.error('WASM abort called'),
      },
    };
    
    wasmModule = await loadAndInstantiate('/wasm/animation.wasm', imports);
    if (wasmModule) {
      useWasm = true;
      console.log('✅ Animation WASM loaded');
      return true;
    }
  } catch (error) {
    console.warn('Animation WASM failed, using JS fallback:', error);
  }
  
  useWasm = false;
  return false;
}

/**
 * Initialize animal
 */
export function initAnimal(
  index: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  speed: number,
  depth: number
): void {
  if (useWasm && wasmModule) {
    wasmModule.initAnimal(index, x, y, vx, vy, speed, depth);
  } else {
    // JS fallback
    if (index >= jsAnimals.length) {
      jsAnimals.push({ x, y, angle: 0, frame: 0 });
    } else {
      jsAnimals[index] = { x, y, angle: 0, frame: 0 };
    }
  }
}

/**
 * Update all animals
 */
export function updateAllAnimals(
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number,
  frameRate: number
): void {
  if (useWasm && wasmModule) {
    wasmModule.updateAllAnimals(deltaTime, canvasWidth, canvasHeight, frameRate);
  } else {
    // JS fallback - simple position update
    for (let i = 0; i < jsAnimals.length; i++) {
      const animal = jsAnimals[i];
      animal.x += deltaTime * 0.05;
      animal.y += Math.sin(Date.now() * 0.001 + i) * 0.5;
      
      if (animal.x > canvasWidth + 100) animal.x = -100;
      if (animal.y < -100) animal.y = canvasHeight + 100;
      if (animal.y > canvasHeight + 100) animal.y = -100;
      
      animal.frame = (animal.frame + 1) % 4;
    }
  }
}

/**
 * Get animal position and state
 */
export function getAnimalPosition(index: number): AnimalState | null {
  if (useWasm && wasmModule) {
    const arr = wasmModule.getAnimalPosition(index);
    if (arr && arr.length >= 4) {
      return {
        x: arr[0],
        y: arr[1],
        angle: arr[2],
        frame: Math.floor(arr[3]),
      };
    }
    return null;
  } else {
    // JS fallback
    return jsAnimals[index] || null;
  }
}

/**
 * Add particle
 */
export function addParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number
): void {
  if (useWasm && wasmModule) {
    wasmModule.addParticle(x, y, vx, vy, life);
  } else {
    // JS fallback
    jsParticles.push({ x, y, alpha: 1, size: 2 });
  }
}

/**
 * Update all particles
 */
export function updateParticles(deltaTime: number): void {
  if (useWasm && wasmModule) {
    wasmModule.updateParticles(deltaTime);
  } else {
    // JS fallback
    for (let i = jsParticles.length - 1; i >= 0; i--) {
      const particle = jsParticles[i];
      particle.y += deltaTime * 0.01;
      particle.alpha -= deltaTime * 0.0001;
      
      if (particle.alpha <= 0) {
        jsParticles.splice(i, 1);
      }
    }
  }
}

/**
 * Get particle count
 */
export function getParticleCount(): number {
  if (useWasm && wasmModule) {
    return wasmModule.getParticleCount();
  }
  return jsParticles.length;
}

/**
 * Get particle position and state
 */
export function getParticlePosition(index: number): ParticleState | null {
  if (useWasm && wasmModule) {
    const arr = wasmModule.getParticlePosition(index);
    if (arr && arr.length >= 4) {
      return {
        x: arr[0],
        y: arr[1],
        alpha: arr[2],
        size: arr[3],
      };
    }
    return null;
  }
  return jsParticles[index] || null;
}

/**
 * Clear all particles
 */
export function clearParticles(): void {
  if (useWasm && wasmModule) {
    wasmModule.clearParticles();
  } else {
    jsParticles = [];
  }
}

/**
 * Get animal count
 */
export function getAnimalCount(): number {
  if (useWasm && wasmModule) {
    return wasmModule.getAnimalCount();
  }
  return jsAnimals.length;
}

/**
 * Clear all animals
 */
export function clearAnimals(): void {
  if (useWasm && wasmModule) {
    wasmModule.clearAnimals();
  } else {
    jsAnimals = [];
  }
}

/**
 * Check collision between two circles
 */
export function checkCollision(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  if (useWasm && wasmModule) {
    return wasmModule.checkCollision(x1, y1, r1, x2, y2, r2);
  }
  
  // JS fallback
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distSq = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  return distSq < radiusSum * radiusSum;
}

/**
 * Calculate distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  if (useWasm && wasmModule) {
    return wasmModule.distance(x1, y1, x2, y2);
  }
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  if (useWasm && wasmModule) {
    return wasmModule.lerp(a, b, t);
  }
  return a + (b - a) * t;
}

/**
 * Check if WASM is being used
 */
export function isUsingWasm(): boolean {
  return useWasm;
}
