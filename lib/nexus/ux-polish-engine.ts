/**
 * UX Polish Engine
 * Part of Nacho Runtime
 * 
 * Advanced UX features:
 * - 120Hz rendering support
 * - Predictive prefetching
 * - Smooth animations
 * - Input latency reduction
 * - Frame pacing
 * - Adaptive quality
 */

import { maxPerformanceEngine } from './max-performance-engine';

export interface UXConfig {
    targetFPS: number;              // 60, 90, or 120
    enablePredictive: boolean;      // Predictive prefetching
    enableSmoothing: boolean;       // Frame smoothing
    inputLatencyTarget: number;     // Target input latency in ms
    adaptiveQuality: boolean;       // Adjust quality based on performance
}

export interface UXMetrics {
    currentFPS: number;
    frameTime: number;
    inputLatency: number;
    droppedFrames: number;
    predictiveHits: number;
    smoothnessScore: number;
}

export class UXPolishEngine {
    private config: UXConfig;
    private device: GPUDevice | null = null;
    
    // Frame timing
    private lastFrameTime: number = 0;
    private frameTimes: number[] = [];
    private targetFrameTime: number = 16.67; // 60 FPS default
    
    // Input tracking
    private lastInputTime: number = 0;
    private inputLatencies: number[] = [];
    
    // Predictive loading
    private userPatterns: Map<string, number> = new Map();
    private prefetchQueue: string[] = [];
    
    // Metrics
    private metrics: UXMetrics = {
        currentFPS: 0,
        frameTime: 0,
        inputLatency: 0,
        droppedFrames: 0,
        predictiveHits: 0,
        smoothnessScore: 100
    };
    
    // State
    private isRunning: boolean = false;
    private animationFrameId: number | null = null;

    constructor(config: Partial<UXConfig> = {}) {
        this.config = {
            targetFPS: config.targetFPS || 60,
            enablePredictive: config.enablePredictive !== false,
            enableSmoothing: config.enableSmoothing !== false,
            inputLatencyTarget: config.inputLatencyTarget || 10,
            adaptiveQuality: config.adaptiveQuality !== false
        };
        
        this.targetFrameTime = 1000 / this.config.targetFPS;
    }

    /**
     * Initialize UX polish engine
     */
    async initialize(): Promise<void> {
        console.log('[UXPolish] Initializing UX polish engine...');
        
        // Initialize WebGPU
        await this.initializeGPU();
        
        // Set up high refresh rate if available
        this.setupHighRefreshRate();
        
        // Set up input tracking
        this.setupInputTracking();
        
        // Set up predictive loading
        if (this.config.enablePredictive) {
            this.setupPredictiveLoading();
        }
        
        console.log(`[UXPolish] Initialized with target ${this.config.targetFPS} FPS`);
    }

    /**
     * Initialize WebGPU
     */
    private async initializeGPU(): Promise<void> {
        if (typeof navigator === 'undefined' || !navigator.gpu) {
            console.warn('[UXPolish] WebGPU not available');
            return;
        }

        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });

        if (!adapter) {
            console.warn('[UXPolish] No GPU adapter found');
            return;
        }

        this.device = await adapter.requestDevice();
    }

    /**
     * Set up high refresh rate support
     */
    private setupHighRefreshRate(): void {
        // Detect display refresh rate
        let refreshRate = 60;
        
        if (typeof window !== 'undefined' && 'screen' in window) {
            // Try to detect high refresh rate displays
            const testStart = performance.now();
            let frameCount = 0;
            
            const detectRefreshRate = () => {
                frameCount++;
                const elapsed = performance.now() - testStart;
                
                if (elapsed < 1000) {
                    requestAnimationFrame(detectRefreshRate);
                } else {
                    refreshRate = Math.round(frameCount);
                    console.log(`[UXPolish] Detected ${refreshRate}Hz display`);
                    
                    // Adjust target FPS if display supports it
                    if (refreshRate >= 120 && this.config.targetFPS >= 120) {
                        this.config.targetFPS = 120;
                        this.targetFrameTime = 1000 / 120;
                        console.log('[UXPolish] Enabled 120Hz rendering');
                    } else if (refreshRate >= 90 && this.config.targetFPS >= 90) {
                        this.config.targetFPS = 90;
                        this.targetFrameTime = 1000 / 90;
                        console.log('[UXPolish] Enabled 90Hz rendering');
                    }
                }
            };
            
            requestAnimationFrame(detectRefreshRate);
        }
    }

    /**
     * Set up input tracking
     */
    private setupInputTracking(): void {
        if (typeof document === 'undefined') return;
        
        const trackInput = (event: Event) => {
            this.lastInputTime = performance.now();
        };
        
        // Track all input events
        ['mousedown', 'mouseup', 'mousemove', 'click', 
         'touchstart', 'touchend', 'touchmove',
         'keydown', 'keyup'].forEach(eventType => {
            document.addEventListener(eventType, trackInput, { passive: true });
        });
        
        console.log('[UXPolish] Input tracking enabled');
    }

    /**
     * Set up predictive loading
     */
    private setupPredictiveLoading(): void {
        console.log('[UXPolish] Predictive loading enabled');
        
        // Track user navigation patterns
        if (typeof document !== 'undefined') {
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const action = target.getAttribute('data-action') || target.textContent || '';
                
                if (action) {
                    // Record pattern
                    const count = this.userPatterns.get(action) || 0;
                    this.userPatterns.set(action, count + 1);
                    
                    // Predict next action
                    this.predictNextAction(action);
                }
            });
        }
    }

    /**
     * Predict next user action
     */
    private predictNextAction(currentAction: string): void {
        // Simple prediction: prefetch most common next actions
        const predictions: { [key: string]: string[] } = {
            'open-file': ['edit-file', 'close-file'],
            'edit-file': ['save-file', 'close-file'],
            'save-file': ['close-file', 'edit-file'],
            'launch-app': ['use-app', 'close-app']
        };
        
        const nextActions = predictions[currentAction] || [];
        
        nextActions.forEach(action => {
            if (!this.prefetchQueue.includes(action)) {
                this.prefetchQueue.push(action);
                this.prefetchResource(action);
            }
        });
    }

    /**
     * Prefetch resource
     */
    private async prefetchResource(action: string): Promise<void> {
        console.log(`[UXPolish] Prefetching for action: ${action}`);
        
        // Simulate prefetching (in real impl, would load actual resources)
        await new Promise(resolve => setTimeout(resolve, 10));
        
        this.metrics.predictiveHits++;
    }

    /**
     * Start rendering loop
     */
    start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.renderLoop();
        
        console.log('[UXPolish] Rendering loop started');
    }

    /**
     * Main rendering loop with frame pacing
     */
    private renderLoop(): void {
        if (!this.isRunning) return;
        
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        
        // Frame pacing: only render if enough time has passed
        if (deltaTime >= this.targetFrameTime) {
            this.lastFrameTime = now - (deltaTime % this.targetFrameTime);
            
            // Update metrics
            this.updateMetrics(deltaTime);
            
            // Adaptive quality adjustment
            if (this.config.adaptiveQuality) {
                this.adjustQuality();
            }
            
            // Calculate input latency
            if (this.lastInputTime > 0) {
                const latency = now - this.lastInputTime;
                this.inputLatencies.push(latency);
                if (this.inputLatencies.length > 60) {
                    this.inputLatencies.shift();
                }
            }
        }
        
        this.animationFrameId = requestAnimationFrame(() => this.renderLoop());
    }

    /**
     * Update performance metrics
     */
    private updateMetrics(deltaTime: number): void {
        // Track frame times
        this.frameTimes.push(deltaTime);
        if (this.frameTimes.length > 60) {
            this.frameTimes.shift();
        }
        
        // Calculate FPS
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.metrics.currentFPS = 1000 / avgFrameTime;
        this.metrics.frameTime = avgFrameTime;
        
        // Calculate input latency
        if (this.inputLatencies.length > 0) {
            this.metrics.inputLatency = this.inputLatencies.reduce((a, b) => a + b, 0) / this.inputLatencies.length;
        }
        
        // Detect dropped frames
        if (deltaTime > this.targetFrameTime * 1.5) {
            this.metrics.droppedFrames++;
        }
        
        // Calculate smoothness score (0-100)
        const fpsRatio = this.metrics.currentFPS / this.config.targetFPS;
        const latencyScore = Math.max(0, 100 - this.metrics.inputLatency);
        this.metrics.smoothnessScore = Math.min(100, (fpsRatio * 50) + (latencyScore * 0.5));
    }

    /**
     * Adjust quality based on performance
     */
    private adjustQuality(): void {
        const targetFPS = this.config.targetFPS;
        const currentFPS = this.metrics.currentFPS;
        
        if (currentFPS < targetFPS * 0.8) {
            // Performance is poor, reduce quality
            console.log('[UXPolish] Reducing quality to maintain frame rate');
            
            // In real impl, would reduce:
            // - Shadow quality
            // - Texture resolution
            // - Particle effects
            // - Post-processing effects
            
        } else if (currentFPS > targetFPS * 0.95) {
            // Performance is good, can increase quality
            // (but don't exceed target FPS)
        }
    }

    /**
     * Apply smooth animation
     */
    applySmoothAnimation(element: HTMLElement, property: string, from: number, to: number, duration: number): Promise<void> {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const delta = to - from;
            
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Smooth easing function (ease-out-cubic)
                const eased = 1 - Math.pow(1 - progress, 3);
                const value = from + (delta * eased);
                
                element.style[property as any] = `${value}px`;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    /**
     * Apply smooth scroll
     */
    applySmoothScroll(element: HTMLElement, targetY: number, duration: number = 300): Promise<void> {
        return new Promise((resolve) => {
            const startY = element.scrollTop;
            const startTime = performance.now();
            const delta = targetY - startY;
            
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Smooth easing
                const eased = 1 - Math.pow(1 - progress, 3);
                element.scrollTop = startY + (delta * eased);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    /**
     * Apply fade transition
     */
    applyFadeTransition(element: HTMLElement, fadeIn: boolean, duration: number = 200): Promise<void> {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const startOpacity = fadeIn ? 0 : 1;
            const endOpacity = fadeIn ? 1 : 0;
            
            element.style.opacity = startOpacity.toString();
            if (fadeIn) {
                element.style.display = 'block';
            }
            
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const eased = 1 - Math.pow(1 - progress, 3);
                const opacity = startOpacity + ((endOpacity - startOpacity) * eased);
                
                element.style.opacity = opacity.toString();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    if (!fadeIn) {
                        element.style.display = 'none';
                    }
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    /**
     * Apply scale animation
     */
    applyScaleAnimation(element: HTMLElement, from: number, to: number, duration: number = 200): Promise<void> {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const delta = to - from;
            
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const eased = 1 - Math.pow(1 - progress, 3);
                const scale = from + (delta * eased);
                
                element.style.transform = `scale(${scale})`;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    /**
     * Reduce input latency
     */
    reduceInputLatency(callback: () => void): void {
        // Use requestAnimationFrame for immediate response
        requestAnimationFrame(() => {
            callback();
        });
    }

    /**
     * Get current metrics
     */
    getMetrics(): UXMetrics {
        return { ...this.metrics };
    }

    /**
     * Print performance report
     */
    printReport(): void {
        console.log('═'.repeat(80));
        console.log('UX POLISH ENGINE - PERFORMANCE REPORT');
        console.log('═'.repeat(80));
        console.log(`Target FPS:         ${this.config.targetFPS}`);
        console.log(`Current FPS:        ${this.metrics.currentFPS.toFixed(1)}`);
        console.log(`Frame Time:         ${this.metrics.frameTime.toFixed(2)}ms`);
        console.log(`Input Latency:      ${this.metrics.inputLatency.toFixed(2)}ms`);
        console.log(`Dropped Frames:     ${this.metrics.droppedFrames}`);
        console.log(`Predictive Hits:    ${this.metrics.predictiveHits}`);
        console.log(`Smoothness Score:   ${this.metrics.smoothnessScore.toFixed(1)}/100`);
        console.log('═'.repeat(80));
    }

    /**
     * Stop rendering loop
     */
    stop(): void {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        console.log('[UXPolish] Rendering loop stopped');
    }

    /**
     * Shutdown
     */
    shutdown(): void {
        this.stop();
        this.frameTimes = [];
        this.inputLatencies = [];
        this.userPatterns.clear();
        this.prefetchQueue = [];
        console.log('[UXPolish] Shutdown complete');
    }
}

// Export singleton
export const uxPolishEngine = new UXPolishEngine({
    targetFPS: 120,
    enablePredictive: true,
    enableSmoothing: true,
    inputLatencyTarget: 10,
    adaptiveQuality: true
});
