/**
 * APK Loader (Real)
 * Boots the in-repo Android framework stack and launches the APK via ExecutionPipeline.
 *
 * Note: This is the "fast runner" path used by Library (not the full ISO VM).
 */

import { androidBootManager } from '@/lib/nexus/os/android-boot';
import { executionPipeline } from '@/lib/engine/execution-pipeline';

export class APKLoader {
    public onStatusUpdate: ((status: string, detail?: string) => void) | null = null;
    private displayEl: HTMLElement | null = null;
    private running = false;
    private perfStats = { fps: 60, jitCompiles: 0, gpuKernels: 0 };

    private update(status: string, detail?: string) {
        try { this.onStatusUpdate?.(status, detail); } catch {}
    }

    /**
     * Load APK from ArrayBuffer (preferred method for file uploads)
     */
    async loadFromBuffer(container: HTMLElement, buffer: ArrayBuffer, fileName: string) {
        this.running = true;
        this.update('Booting Android', 'Initializing framework...');

        // Create a display surface for AndroidBootManager to target.
        container.innerHTML = '';
        const display = document.createElement('div');
        display.style.cssText = 'width: 100%; height: 100%; position: relative; overflow: hidden; background: #000;';
        container.appendChild(display);
        this.displayEl = display;

        // Boot Android system (SystemUI + services)
        try {
            this.update('Initializing WebGPU', 'Requesting adapter...');
            await androidBootManager.boot(display);
        } catch (e: any) {
            this.update('Boot failed', e?.message || 'android_boot_failed');
            throw e;
        }

        if (!this.running) return;

        // Install + launch app
        this.update('Launching APK', 'Installing and starting app...');
        
        try {
            // Create a blob URL from the buffer for the execution pipeline
            // The pipeline expects a URL path, so we create a temporary object URL
            const blob = new Blob([buffer], { type: 'application/vnd.android.package-archive' });
            const url = URL.createObjectURL(blob);
            
            await executionPipeline.executeAndroid(url, {
                enableProfiling: true,
                enableMetrics: true,
            });
            
            // Clean up the object URL after a delay
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e: any) {
            const msg = e?.message || 'unknown_error';
            console.error('Execution pipeline error:', e);
            this.update('Error', `APK execution failed: ${msg}`);
            this.showError(container, fileName, msg);
            throw e;
        }

        this.update('Running', 'App launched');
    }

    /**
     * Legacy method - Load APK from URL/path
     */
    async load(container: HTMLElement, apkPath: string) {
        this.running = true;
        this.update('Booting Android', 'Initializing framework...');

        // Create a display surface for AndroidBootManager to target.
        container.innerHTML = '';
        const display = document.createElement('div');
        display.style.cssText = 'width: 100%; height: 100%; position: relative; overflow: hidden; background: #000;';
        container.appendChild(display);
        this.displayEl = display;

        // Boot Android system (SystemUI + services)
        try {
            await androidBootManager.boot(display);
        } catch (e: any) {
            this.update('Boot failed', e?.message || 'android_boot_failed');
            throw e;
        }

        if (!this.running) return;

        // Install + launch app
        this.update('Launching APK', 'Installing and starting app...');
        await executionPipeline.executeAndroid(apkPath, {
            enableProfiling: false,
            enableMetrics: false,
        });

        this.update('Running', 'App launched');
    }

    /**
     * Render an error UI in the container when the execution pipeline fails.
     */
    private showError(container: HTMLElement, fileName: string, errorMessage: string) {
        const display = this.displayEl || container;

        display.innerHTML = '';
        display.style.cssText = `
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: 'Roboto', sans-serif;
        `;

        // Error icon
        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 80px;
            height: 80px;
            background: #7f1d1d;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            margin-bottom: 16px;
        `;
        icon.textContent = '\u26a0\ufe0f';
        display.appendChild(icon);

        // File name
        const name = document.createElement('div');
        name.style.cssText = `
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 8px;
        `;
        name.textContent = fileName;
        display.appendChild(name);

        // Error message
        const errMsg = document.createElement('div');
        errMsg.style.cssText = `
            font-size: 14px;
            color: #fca5a5;
            margin-bottom: 12px;
            max-width: 80%;
            text-align: center;
            word-break: break-word;
        `;
        errMsg.textContent = `APK execution failed: ${errorMessage}`;
        display.appendChild(errMsg);

        // Description
        const desc = document.createElement('div');
        desc.style.cssText = `
            font-size: 12px;
            color: #94a3b8;
            text-align: center;
            max-width: 80%;
        `;
        desc.textContent = 'The execution pipeline encountered an error. Check console for details.';
        display.appendChild(desc);
    }

    /**
     * Get current performance stats
     */
    getPerformanceStats() {
        return { ...this.perfStats };
    }

    stop() {
        this.running = false;
        this.update('Stopping', 'Shutting down Android...');
        // Best-effort shutdown (removes SystemUI and stops services)
        void androidBootManager.shutdown().catch(() => {});
        try {
            if (this.displayEl) this.displayEl.innerHTML = '';
        } catch {}
        this.displayEl = null;
    }
}