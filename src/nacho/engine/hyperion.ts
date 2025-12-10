import { webgpu } from './webgpu-context';
import { megakernel } from './megakernel';
import { hyperOptimizer } from '../optimization/hyper_optimizer';

export class HyperionEngine {
    private isRunning: boolean = false;
    private lastFrameTime: number = 0;
    private frameId: number | null = null;
    private targetFPS: number = 60;
    private frameInterval: number = 1000 / 60;

    // Game Mode State
    private isFullscreen: boolean = false;
    private isPointerLocked: boolean = false;

    private updateCallback: ((dt: number) => void) | null = null;
    private renderCallback: ((dt: number) => void) | null = null;

    constructor() {
        this.loop = this.loop.bind(this);
    }

    public async attachCanvas(canvas: HTMLCanvasElement) {
        const success = await webgpu.initialize(canvas);
        if (success) {
            console.log("Hyperion: WebGPU Context Attached");
            
            // Initialize Hyper-Optimizations
            await hyperOptimizer.initializeGPUHijacker();

            await megakernel.init(50000); // Initialize with 50k particles
        } else {
            console.warn("Hyperion: WebGPU initialization failed, falling back to CPU/Canvas2D if available.");
        }
    }

    public setTargetFPS(fps: number) {
        this.targetFPS = fps;
        this.frameInterval = 1000 / fps;
    }

    public setCallbacks(update: (dt: number) => void, render: (dt: number) => void) {
        this.updateCallback = update;
        this.renderCallback = render;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        
        // Activate Hyper-Optimizations
        hyperOptimizer.start();
        hyperOptimizer.enableAudioTiming();

        this.enableGameMode();
        this.scheduleLoop();
    }

    public stop() {
        this.isRunning = false;
        
        // Deactivate Hyper-Optimizations
        hyperOptimizer.stop();

        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        this.disableGameMode();
    }

    private scheduleLoop() {
        // Use requestPostAnimationFrame if available (Chrome experiment), otherwise standard rAF
        // @ts-ignore
        if (window.requestPostAnimationFrame) {
            // @ts-ignore
            this.frameId = window.requestPostAnimationFrame(this.loop);
        } else {
            this.frameId = requestAnimationFrame(this.loop);
        }
    }

    private loop(timestamp: number) {
        if (!this.isRunning) return;

        const elapsed = timestamp - this.lastFrameTime;

        if (elapsed > this.frameInterval) {
            // Cap dt to prevent spiral of death
            const dt = Math.min(elapsed, 100);

            if (this.updateCallback) this.updateCallback(dt);

            // Run Megakernel (WebGPU Physics + Render)
            megakernel.run(dt);

            if (this.renderCallback) this.renderCallback(dt);

            this.lastFrameTime = timestamp - (elapsed % this.frameInterval);
        }

        this.scheduleLoop();
    }

    // --- Game Mode (Browser Locking) ---

    public async enableGameMode() {
        // Fullscreen and Pointer Lock disabled by default to prevent browser blocking
        // and "User Gesture" errors.

        // We only attach listeners here, actual locking happens on user click in VM canvas
        try {
            window.addEventListener('beforeunload', this.preventExit);
            window.addEventListener('keydown', this.suppressBrowserKeys);
        } catch (err) {
            console.warn('Hyperion: Failed to attach event listeners', err);
        }
    }

    public disableGameMode() {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        window.removeEventListener('beforeunload', this.preventExit);
        window.removeEventListener('keydown', this.suppressBrowserKeys);
    }

    private preventExit = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
    };

    private suppressBrowserKeys = (e: KeyboardEvent) => {
        // Block common browser shortcuts that interfere with gaming
        // Note: Modern browsers restrict what can be blocked for security
        const blockedKeys = ['F11', 'F5', 'Tab', 'Alt'];
        if (blockedKeys.includes(e.key) || (e.ctrlKey && ['w', 'r', 't', 'n'].includes(e.key.toLowerCase()))) {
            e.preventDefault();
        }
    };
}

export const hyperion = new HyperionEngine();
