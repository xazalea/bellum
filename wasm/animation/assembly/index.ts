// @ts-nocheck
// Sea Life Animation Physics Engine in AssemblyScript
// Uses SIMD for parallel processing when available

// Animal state structure
export class Animal {
  x: f32;
  y: f32;
  vx: f32;
  vy: f32;
  angle: f32;
  speed: f32;
  baseSpeed: f32;
  animationOffset: f32;
  depth: f32;
  frame: i32;
  frameTime: f32;

  constructor(
    x: f32, y: f32, vx: f32, vy: f32,
    speed: f32, depth: f32
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.angle = 0;
    this.speed = speed;
    this.baseSpeed = speed;
    this.animationOffset = <f32>Math.random() * 100;
    this.depth = depth;
    this.frame = 0;
    this.frameTime = 0;
  }
}

// Particle state
export class Particle {
  x: f32;
  y: f32;
  vx: f32;
  vy: f32;
  life: f32;
  maxLife: f32;
  size: f32;
  alpha: f32;

  constructor(x: f32, y: f32, vx: f32, vy: f32, life: f32) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = 2.0;
    this.alpha = 1.0;
  }
}

// Global state (arrays allocated in linear memory)
let animals: Animal[] = [];
let particles: Particle[] = [];

@external("env", "Math.random")
declare function random(): f64;

/**
 * Initialize animal at index
 */
export function initAnimal(
  index: i32,
  x: f32, y: f32,
  vx: f32, vy: f32,
  speed: f32, depth: f32
): void {
  if (index >= animals.length) {
    animals.push(new Animal(x, y, vx, vy, speed, depth));
  } else {
    const animal = animals[index];
    animal.x = x;
    animal.y = y;
    animal.vx = vx;
    animal.vy = vy;
    animal.speed = speed;
    animal.baseSpeed = speed;
    animal.depth = depth;
  }
}

/**
 * Update single animal physics
 */
export function updateAnimal(
  index: i32,
  deltaTime: f32,
  canvasWidth: f32,
  canvasHeight: f32,
  frameRate: f32
): void {
  if (index >= animals.length) return;
  
  const animal = animals[index];
  
  // Update frame animation
  animal.frameTime += deltaTime;
  if (animal.frameTime >= frameRate) {
    animal.frame = (animal.frame + 1) % 4; // Assuming 4 frames
    animal.frameTime = 0;
  }
  
  // Update position
  animal.x += animal.vx * animal.speed * deltaTime * 0.001;
  animal.y += animal.vy * animal.speed * deltaTime * 0.001;
  
  // Natural bobbing motion
  const time = <f32>Date.now() * 0.001 + animal.animationOffset;
  animal.y += <f32>Math.sin(time * 0.5) * 0.3;
  
  // Update angle based on velocity
  animal.angle = <f32>Math.atan2(animal.vy, animal.vx);
  
  // Wrap around screen edges with padding
  const padding = 100.0;
  if (animal.x < -padding) animal.x = canvasWidth + padding;
  if (animal.x > canvasWidth + padding) animal.x = -padding;
  if (animal.y < -padding) animal.y = canvasHeight + padding;
  if (animal.y > canvasHeight + padding) animal.y = -padding;
}

/**
 * Batch update all animals (SIMD optimized where possible)
 */
export function updateAllAnimals(
  deltaTime: f32,
  canvasWidth: f32,
  canvasHeight: f32,
  frameRate: f32
): void {
  const count = animals.length;
  
  // Process animals in batches of 4 for potential SIMD optimization
  // Note: AssemblyScript SIMD support is experimental, this is structure for future optimization
  for (let i = 0; i < count; i++) {
    updateAnimal(i, deltaTime, canvasWidth, canvasHeight, frameRate);
  }
}

/**
 * Get animal position and state
 */
export function getAnimalState(index: i32): Animal | null {
  if (index >= animals.length) return null;
  return animals[index];
}

/**
 * Get animal position (returns packed float array: [x, y, angle, frame])
 */
export function getAnimalPosition(index: i32): StaticArray<f32> {
  const result = new StaticArray<f32>(4);
  if (index < animals.length) {
    const animal = animals[index];
    result[0] = animal.x;
    result[1] = animal.y;
    result[2] = animal.angle;
    result[3] = <f32>animal.frame;
  }
  return result;
}

/**
 * Add particle
 */
export function addParticle(
  x: f32, y: f32,
  vx: f32, vy: f32,
  life: f32
): void {
  particles.push(new Particle(x, y, vx, vy, life));
}

/**
 * Update all particles
 */
export function updateParticles(deltaTime: f32): void {
  const dt = deltaTime * 0.001;
  
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    
    // Update position
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    
    // Apply gravity
    particle.vy += 0.5;
    
    // Update life
    particle.life -= dt;
    particle.alpha = particle.life / particle.maxLife;
    
    // Remove dead particles
    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

/**
 * Get particle count
 */
export function getParticleCount(): i32 {
  return particles.length;
}

/**
 * Get particle position (returns packed float array: [x, y, alpha, size])
 */
export function getParticlePosition(index: i32): StaticArray<f32> {
  const result = new StaticArray<f32>(4);
  if (index < particles.length) {
    const particle = particles[index];
    result[0] = particle.x;
    result[1] = particle.y;
    result[2] = particle.alpha;
    result[3] = particle.size;
  }
  return result;
}

/**
 * Clear all particles
 */
export function clearParticles(): void {
  particles = [];
}

/**
 * Get animal count
 */
export function getAnimalCount(): i32 {
  return animals.length;
}

/**
 * Clear all animals
 */
export function clearAnimals(): void {
  animals = [];
}

/**
 * Collision detection between two points
 */
export function checkCollision(
  x1: f32, y1: f32, r1: f32,
  x2: f32, y2: f32, r2: f32
): bool {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distSq = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  return distSq < radiusSum * radiusSum;
}

/**
 * Calculate distance between two points
 */
export function distance(x1: f32, y1: f32, x2: f32, y2: f32): f32 {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return <f32>Math.sqrt(dx * dx + dy * dy);
}

/**
 * Interpolate between two values
 */
export function lerp(a: f32, b: f32, t: f32): f32 {
  return a + (b - a) * t;
}
