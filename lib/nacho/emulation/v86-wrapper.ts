
/**
 * V86 WASM x86 Emulator Wrapper
 * Allows booting real Linux ISOs in the browser.
 */
export class V86Wrapper {
    private instance: any; // V86Starter type

    async boot(config: {
        bios: { url: string },
        vga: { url: string },
        hda: { url: string, size: number },
        wasm_path: string,
        memory_size: number
    }) {
        // Dynamically load the V86 library from a CDN if not present
        if (!(window as any).V86Starter) {
            await this.loadScript('https://unpkg.com/v86@latest/build/libv86.js');
        }

        const V86Starter = (window as any).V86Starter;
        
        this.instance = new V86Starter({
            wasm_path: config.wasm_path || 'https://unpkg.com/v86@latest/build/v86.wasm',
            memory_size: config.memory_size || 512 * 1024 * 1024,
            vga_memory_size: 8 * 1024 * 1024,
            bios: { url: config.bios.url },
            vga_bios: { url: config.vga.url },
            hda: { url: config.hda.url, async: true, size: config.hda.size },
            autostart: true,
            disable_mouse: false,
            disable_keyboard: false
        });

        return new Promise<void>((resolve) => {
            this.instance.add_listener('emulator-ready', () => {
                console.log('V86 Emulator Ready');
                resolve();
            });
        });
    }

    private loadScript(src: string) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    stop() {
        if (this.instance) {
            this.instance.stop();
            this.instance = null;
        }
    }
}

