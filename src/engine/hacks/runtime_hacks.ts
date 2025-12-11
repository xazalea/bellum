/**
 * Creative / Hacky Runtime Tricks
 * Covers Items:
 * 19. Fake Vibrator API with CSS Animation.
 * 202. Control Android apps using synthetic touch injection.
 * 208. Provide fake /proc/meminfo.
 * 240. Fake Android property system.
 */

export class CreativeHacks {
    
    /**
     * Fake Vibrator (Item 19)
     * Shakes the screen using CSS transform
     */
    vibrate(pattern: number[]) {
        console.log("[Hacks] Vibrate pattern:", pattern);
        const body = document.body;
        
        // Simple shake animation
        const keyframes = [
            { transform: 'translate(0, 0)' },
            { transform: 'translate(-2px, 2px)' },
            { transform: 'translate(-2px, -2px)' },
            { transform: 'translate(2px, 2px)' },
            { transform: 'translate(2px, -2px)' },
            { transform: 'translate(0, 0)' }
        ];

        body.animate(keyframes, {
            duration: 200, // Fixed duration for now
            iterations: 1
        });
    }

    /**
     * Synthetic Touch Injection (Item 202)
     * Simulates touch events for apps that don't support mouse
     */
    injectTouch(x: number, y: number, action: 'DOWN' | 'MOVE' | 'UP') {
        // Create synthetic TouchEvent
        // Note: TouchEvent constructor is limited in some browsers, PointerEvent is better
        const typeMap = {
            'DOWN': 'pointerdown',
            'MOVE': 'pointermove',
            'UP': 'pointerup'
        };
        
        const event = new PointerEvent(typeMap[action], {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerType: 'touch',
            isPrimary: true
        });

        const target = document.elementFromPoint(x, y) || document.body;
        target.dispatchEvent(event);
    }

    /**
     * Fake /proc/meminfo (Item 208)
     */
    readProcMemInfo(): string {
        // Generate a fake Linux meminfo file
        const totalMem = 8 * 1024 * 1024; // 8GB fake
        const freeMem = 4 * 1024 * 1024;
        
        return `
MemTotal:        ${totalMem} kB
MemFree:         ${freeMem} kB
MemAvailable:    ${freeMem} kB
Buffers:           10240 kB
Cached:           204800 kB
SwapTotal:             0 kB
SwapFree:              0 kB
        `.trim();
    }

    /**
     * Fake System Properties (Item 240)
     */
    getSystemProperty(key: string): string {
        const props: Record<string, string> = {
            'ro.build.version.sdk': '30',
            'ro.product.model': 'Bellum Browser Device',
            'ro.product.manufacturer': 'Nacho Corp',
            'ro.debuggable': '1'
        };
        return props[key] || '';
    }
}
