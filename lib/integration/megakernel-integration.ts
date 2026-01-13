/**
 * Megakernel Integration for Game Logic
 * Connects the megakernel GPU physics/compute to actual game execution
 */

import { megakernel } from '../../src/nacho/engine/megakernel';
import { webgpu } from '../../src/nacho/engine/webgpu-context';

export interface GameEntity {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    g: number;
    b: number;
    a: number;
}

export class MegakernelGameEngine {
    private initialized: boolean = false;
    private canvas: HTMLCanvasElement | null = null;
    private animationFrame: number | null = null;
    private lastTime: number = 0;
    
    /**
     * Initialize megakernel for game logic
     */
    async initialize(canvas: HTMLCanvasElement, entityCount: number = 10000): Promise<void> {
        this.canvas = canvas;
        
        // Initialize WebGPU context
        const success = await webgpu.initialize(canvas);
        if (!success) {
            throw new Error('Failed to initialize WebGPU');
        }
        
        // Initialize megakernel with entity count
        await megakernel.init(entityCount);
        
        this.initialized = true;
        console.log(`[MegakernelGameEngine] Initialized with ${entityCount} entities`);
    }
    
    /**
     * Start game loop
     */
    start(): void {
        if (!this.initialized || !this.canvas) {
            throw new Error('Engine not initialized');
        }
        
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    /**
     * Stop game loop
     */
    stop(): void {
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    /**
     * Main game loop
     */
    private gameLoop = (): void => {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Run megakernel compute + render
        // This executes physics simulation on GPU and renders directly
        megakernel.run(deltaTime);
        
        // Continue loop
        this.animationFrame = requestAnimationFrame(this.gameLoop);
    };
    
    /**
     * Get current FPS
     */
    getFPS(): number {
        // Calculate from frame times
        if (this.lastTime === 0) return 0;
        const deltaTime = performance.now() - this.lastTime;
        return deltaTime > 0 ? 1000 / deltaTime : 0;
    }
}

/**
 * Demo: Run megakernel physics simulation
 */
export async function runMegakernelDemo(canvas: HTMLCanvasElement): Promise<void> {
    console.log('[Megakernel Demo] Starting...');
    
    const engine = new MegakernelGameEngine();
    
    // Initialize with 10,000 entities
    await engine.initialize(canvas, 10000);
    
    console.log('[Megakernel Demo] Engine initialized');
    console.log('[Megakernel Demo] Running GPU physics simulation...');
    
    // Start game loop
    engine.start();
    
    // Log FPS periodically
    setInterval(() => {
        const fps = engine.getFPS();
        console.log(`[Megakernel Demo] FPS: ${fps.toFixed(1)}`);
    }, 1000);
    
    console.log('[Megakernel Demo] Demo running! Check canvas for visualization.');
}

export const megakernelIntegration = {
    MegakernelGameEngine,
    runDemo: runMegakernelDemo,
};
