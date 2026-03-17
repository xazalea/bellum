// Frame Pacer — requestAnimationFrame loop with vsync, frame time tracking, adaptive quality

export class FramePacer {
    private rafId: number | null = null;
    private lastFrameTime = 0;
    private frameCount = 0;
    private currentFPS = 0;
    private lastFpsUpdate = 0;
    private quality = 1.0;
    private running = false;

    /** Called every frame with the delta time (ms) and the latest FPS sample. */
    onFrame: ((dt: number, fps: number) => void) | null = null;

    /**
     * Called every ~500 ms with the rolling FPS and the current quality level.
     * Useful for driving UI overlays or dynamic resolution scaling.
     */
    onFpsUpdate: ((fps: number, quality: number) => void) | null = null;

    /**
     * Start the rAF loop. Safe to call multiple times — a second call while
     * already running is a no-op.
     */
    start(): void {
        if (this.running) return;
        this.running = true;
        this.lastFrameTime = performance.now();
        this.lastFpsUpdate = this.lastFrameTime;
        this.frameCount = 0;
        this.rafId = requestAnimationFrame((ts) => this.tick(ts));
    }

    /**
     * Stop the rAF loop. The current frame (if mid-tick) finishes naturally;
     * no further frames are scheduled.
     */
    stop(): void {
        this.running = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /** Returns the most recently computed FPS value. */
    getFPS(): number {
        return this.currentFPS;
    }

    /**
     * Returns the current rendering quality scalar in [0.5, 1.0].
     * 1.0 = full quality; values below 1.0 indicate adaptive downscaling.
     */
    getQuality(): number {
        return this.quality;
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    private tick(timestamp: number): void {
        if (!this.running) return;

        // Delta time clamped to [0, 100] ms to survive tab backgrounding
        const rawDt = timestamp - this.lastFrameTime;
        const dt = Math.min(Math.max(rawDt, 0), 100);
        this.lastFrameTime = timestamp;

        this.frameCount++;

        // Every 500 ms: compute FPS and adapt quality
        const elapsed = timestamp - this.lastFpsUpdate;
        if (elapsed >= 500) {
            // Frames-per-second over the measurement window
            this.currentFPS = (this.frameCount / elapsed) * 1000;
            this.frameCount = 0;
            this.lastFpsUpdate = timestamp;

            // Adaptive quality
            if (this.currentFPS < 30 && this.quality > 0.5) {
                this.quality = Math.max(0.5, parseFloat((this.quality - 0.1).toFixed(2)));
            } else if (this.currentFPS >= 55 && this.quality < 1.0) {
                this.quality = Math.min(1.0, parseFloat((this.quality + 0.05).toFixed(2)));
            }

            if (this.onFpsUpdate) {
                this.onFpsUpdate(this.currentFPS, this.quality);
            }
        }

        // Dispatch frame callback
        if (this.onFrame) {
            this.onFrame(dt, this.currentFPS);
        }

        // Schedule next frame
        this.rafId = requestAnimationFrame((ts) => this.tick(ts));
    }
}

export const framePacer = new FramePacer();
