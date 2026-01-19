/**
 * Animation Web Worker
 * Handles physics calculations in a background thread
 */

import {
  initAnimationEngine,
  initAnimal,
  updateAllAnimals,
  getAnimalPosition,
  updateParticles,
  getParticleCount,
  getParticlePosition,
  type AnimalState,
  type ParticleState,
} from '@/lib/wasm/animation-engine';

export interface AnimationTask {
  id: string;
  type: 'init' | 'update' | 'get_state';
  animalData?: Array<{
    index: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    speed: number;
    depth: number;
  }>;
  deltaTime?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  frameRate?: number;
}

export interface AnimationResult {
  id: string;
  success: boolean;
  animals?: AnimalState[];
  particles?: ParticleState[];
  error?: string;
  timeMs: number;
}

// Initialize WASM when worker starts
let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initAnimationEngine();
    initialized = true;
  }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<AnimationTask>) => {
  const task = event.data;
  const startTime = performance.now();
  
  try {
    await ensureInit();
    
    let animals: AnimalState[] = [];
    let particles: ParticleState[] = [];
    
    switch (task.type) {
      case 'init':
        if (task.animalData) {
          for (const animal of task.animalData) {
            initAnimal(
              animal.index,
              animal.x,
              animal.y,
              animal.vx,
              animal.vy,
              animal.speed,
              animal.depth
            );
          }
        }
        break;
        
      case 'update':
        if (
          task.deltaTime !== undefined &&
          task.canvasWidth !== undefined &&
          task.canvasHeight !== undefined &&
          task.frameRate !== undefined
        ) {
          updateAllAnimals(
            task.deltaTime,
            task.canvasWidth,
            task.canvasHeight,
            task.frameRate
          );
          updateParticles(task.deltaTime);
        }
        break;
        
      case 'get_state':
        // Get all animal positions
        let animalIndex = 0;
        while (true) {
          const animal = getAnimalPosition(animalIndex);
          if (!animal) break;
          animals.push(animal);
          animalIndex++;
        }
        
        // Get all particle positions
        const particleCount = getParticleCount();
        for (let i = 0; i < particleCount; i++) {
          const particle = getParticlePosition(i);
          if (particle) particles.push(particle);
        }
        break;
    }
    
    const timeMs = performance.now() - startTime;
    
    const response: AnimationResult = {
      id: task.id,
      success: true,
      animals,
      particles,
      timeMs,
    };
    
    self.postMessage(response);
  } catch (error: any) {
    const timeMs = performance.now() - startTime;
    
    const response: AnimationResult = {
      id: task.id,
      success: false,
      error: error.message || 'Animation operation failed',
      timeMs,
    };
    
    self.postMessage(response);
  }
};

export {};
