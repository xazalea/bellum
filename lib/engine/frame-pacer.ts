// Frame Pacer — production-grade rAF loop with vsync, multi-window FPS tracking,
// adaptive quality, frame skipping, and 40+ FPS guarantee logic.

const TARGET_FPS = 60;
const MIN_ACCEPTABLE_FPS = 40;
const FRAME_TIME_MS = 1000 / TARGET_FPS; // ~16.67ms
const FPS_SAMPLE_INTERVAL = 400; // ms between FPS recalculations (faster response)
const FPS_HISTORY_SIZE = 8; // rolling window for smoothing

export class FramePacer {
    private rafId: number | null = null;
    private lastFrameTime = 0;
    private frameCount = 0;
    private currentFPS = 0;
    private lastFpsUpdate = 0;
    private quality = 1.0;
    private running = false;

    // Rolling FPS history for smoothed reporting
    private fpsHistory: number[] = [];
    private smoothedFPS = 0;

    // Frame skip logic — drops compute-heavy frames to maintain cadence
    private consecutiveSlowFrames = 0;
    private skipNextCompute = false;

    // Performance budget tracking
    private lastTickStart = 0;
    private averageTickDuration = 0;

    /** Called every frame with the delta time (ms) and the latest FPS sample. */
    onFrame: ((dt: number, fps: number) => void) | null = null;

    /**
     * Called every ~400ms with the rolling FPS and the current quality level.
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
        this.fpsHistory = [];
        this.consecutiveSlowFrames = 0;
        this.skipNextCompute = false;
        this.averageTickDuration = 0;
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

    /** Returns the most recently computed smoothed FPS value. */
    getFPS(): number {
        return this.smoothedFPS || this.currentFPS;
    }

    /** Returns the raw (unsmoothed) FPS for telemetry. */
    getRawFPS(): number {
        return this.currentFPS;
    }

    /**
     * Returns the current rendering quality scalar in [0.4, 1.0].
     * 1.0 = full quality; values below 1.0 indicate adaptive downscaling.
     */
    getQuality(): number {
        return this.quality;
    }

    /** Returns the average tick duration in ms for performance monitoring. */
    getAverageTickDuration(): number {
        return this.averageTickDuration;
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    private tick(timestamp: number): void {
        if (!this.running) return;

        const tickStart = performance.now();

        // Delta time clamped to [0, 100] ms to survive tab backgrounding
        const rawDt = timestamp - this.lastFrameTime;
        const dt = Math.min(Math.max(rawDt, 0), 100);
        this.lastFrameTime = timestamp;

        this.frameCount++;

        // Detect slow frames (frame time > 1.5x target)
        const isSlowFrame = dt > FRAME_TIME_MS * 1.5;
        if (isSlowFrame) {
            this.consecutiveSlowFrames++;
        } else {
            this.consecutiveSlowFrames = Math.max(0, this.consecutiveSlowFrames - 1);
        }

        // Frame skip: if we've had 3+ consecutive slow frames, skip compute
        // on the next frame to let the pipeline catch up. This maintains input
        // responsiveness and prevents cascading frame drops.
        if (this.consecutiveSlowFrames >= 3 && !this.skipNextCompute) {
            this.skipNextCompute = true;
            this.consecutiveSlowFrames = 0;
        }

        // Every FPS_SAMPLE_INTERVAL: compute FPS and adapt quality
        const elapsed = timestamp - this.lastFpsUpdate;
        if (elapsed >= FPS_SAMPLE_INTERVAL) {
            // Frames-per-second over the measurement window
            this.currentFPS = (this.frameCount / elapsed) * 1000;
            this.frameCount = 0;
            this.lastFpsUpdate = timestamp;

            // Update rolling FPS history for smoothed output
            this.fpsHistory.push(this.currentFPS);
            if (this.fpsHistory.length > FPS_HISTORY_SIZE) this.fpsHistory.shift();
            this.smoothedFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

            // Adaptive quality — faster response to maintain 40+ FPS
            if (this.smoothedFPS < MIN_ACCEPTABLE_FPS && this.quality > 0.4) {
                // Aggressive downscale when below minimum
                const drop = this.smoothedFPS < 25 ? 0.15 : 0.08;
                this.quality = Math.max(0.4, parseFloat((this.quality - drop).toFixed(2)));
            } else if (this.smoothedFPS < TARGET_FPS * 0.85 && this.quality > 0.5) {
                // Moderate downscale when approaching threshold
                this.quality = Math.max(0.5, parseFloat((this.quality - 0.04).toFixed(2)));
            } else if (this.smoothedFPS >= TARGET_FPS * 0.95 && this.quality < 1.0) {
                // Gentle upscale when headroom exists
                this.quality = Math.min(1.0, parseFloat((this.quality + 0.03).toFixed(2)));
            }

            if (this.onFpsUpdate) {
                this.onFpsUpdate(this.smoothedFPS, this.quality);
            }
        }

        // Dispatch frame callback (with frame skip logic)
        if (this.onFrame) {
            if (this.skipNextCompute) {
                // Skip compute but still render the last frame — keeps the display responsive
                this.skipNextCompute = false;
                // Don't call onFrame — just let the canvas show the last rendered frame
            } else {
                this.onFrame(dt, this.smoothedFPS || this.currentFPS);
            }
        }

        // Track average tick duration for telemetry
        const tickDuration = performance.now() - tickStart;
        this.averageTickDuration = this.averageTickDuration === 0
            ? tickDuration
            : this.averageTickDuration * 0.9 + tickDuration * 0.1; // EMA smoothing

        // Schedule next frame
        this.rafId = requestAnimationFrame((ts) => this.tick(ts));
    }
}

export const framePacer = new FramePacer();
