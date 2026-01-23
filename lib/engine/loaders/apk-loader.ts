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

    private update(status: string, detail?: string) {
        try { this.onStatusUpdate?.(status, detail); } catch {}
    }

    async load(container: HTMLElement, apkPath: string) {
        this.running = true;
        this.update('Booting Android', 'Initializing framework…');

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
        this.update('Launching APK', 'Installing and starting app…');
        await executionPipeline.executeAndroid(apkPath, {
            enableProfiling: false,
            enableMetrics: false,
        });

        this.update('Running', 'App launched');
    }

    stop() {
        this.running = false;
        this.update('Stopping', 'Shutting down Android…');
        // Best-effort shutdown (removes SystemUI and stops services)
        void androidBootManager.shutdown().catch(() => {});
        try {
            if (this.displayEl) this.displayEl.innerHTML = '';
        } catch {}
        this.displayEl = null;
    }
}

