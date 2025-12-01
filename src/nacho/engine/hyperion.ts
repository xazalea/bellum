/**
 * Hyperion - High-Performance Game Loop Coordinator
 * Ensures 60/120 FPS scheduling, input polling, and browser environment locking.
 */

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
        this.enableGameMode();
        this.scheduleLoop();
    }

    public stop() {
        this.isRunning = false;
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
            if (this.renderCallback) this.renderCallback(dt);

            this.lastFrameTime = timestamp - (elapsed % this.frameInterval);
        }

        this.scheduleLoop();
    }

    // --- Game Mode (Browser Locking) ---

    public async enableGameMode() {
        try {
            // 1. Request Fullscreen
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                this.isFullscreen = true;
            }

            // 2. Lock Pointer
            const canvas = document.querySelector('canvas');
            if (canvas) {
                await canvas.requestPointerLock();
                this.isPointerLocked = true;
            }

            // 3. Disable Browser Keys (prevent F5, Ctrl+W, etc. if possible - mostly handled by PWA mode)
            window.addEventListener('beforeunload', this.preventExit);
            window.addEventListener('keydown', this.suppressBrowserKeys);

        } catch (err) {
            console.warn('Hyperion: Failed to enable full Game Mode', err);
        }
    }

    public disableGameMode() {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
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


