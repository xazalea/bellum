
import { BaseVM } from '../base';
import { VMConfig } from '../types';

export class GenericVM extends BaseVM {
    constructor(config: VMConfig) {
        super(config);
    }

    async start(): Promise<void> {
        this.state.isRunning = true;
        this.emit('start');
        console.log(`[GenericVM] Starting ${this.config.name} (${this.config.type}) via Nacho Engine...`);
    }

    async stop(): Promise<void> {
        this.state.isRunning = false;
        this.emit('stop');
        console.log(`[GenericVM] Stopped ${this.config.name}`);
    }

    async pause(): Promise<void> {
        this.state.isPaused = true;
        this.emit('pause');
    }

    async resume(): Promise<void> {
        this.state.isPaused = false;
        this.emit('resume');
    }

    async reset(): Promise<void> {
        console.log(`[GenericVM] Resetting ${this.config.name}`);
    }

    async initializeEmulator(container: HTMLElement): Promise<void> {
        console.log(`[GenericVM] Initializing container for ${this.config.type}`);
        // In a real implementation, this would attach the specific WASM runtime canvas
        if (this.canvas) {
            const ctx = this.canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.font = '20px monospace';
                ctx.fillStyle = '#38BDF8';
                ctx.fillText(`Running: ${this.config.name}`, 20, 40);
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`Runtime: ${this.config.type}`, 20, 70);
            }
        }
    }
}

