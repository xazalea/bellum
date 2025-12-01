
import { V86Loader as V86Core, V86Config } from '../../emulators/v86-loader';
import { puterClient } from '../../storage/hiberfile';

export class X86Loader {
    private emulator: any = null;

    async load(container: HTMLElement, exePath: string, memoryMB: number = 512) {
        // Ensure v86 is loaded
        await V86Core.load();

        // Check for OS image
        let hdaUrl: string | undefined;
        try {
            // In a real engine, we would use a minimal Linux kernel (bzImage) + initrd with Wine
            // For now, we fallback to the user's Windows 98 image if they have it
            // Or a minimal FreeDOS image which is smaller/faster
            const diskPath = 'windows98.img'; // Hardcoded preference for now
            if (await puterClient.fileExists(diskPath)) {
                 hdaUrl = await puterClient.getReadURL(diskPath);
            } else {
                 throw new Error('System Kernel (windows98.img) not found. Please upload it to Library.');
            }
        } catch (e: any) {
            throw new Error(e.message);
        }

        const config: V86Config = {
            wasm_path: '/v86/v86.wasm',
            memory_size: memoryMB * 1024 * 1024,
            vga_memory_size: 8 * 1024 * 1024,
            screen_container: container,
            bios: { url: '/v86/bios/seabios.bin' },
            vga_bios: { url: '/v86/bios/vgabios.bin' },
            hda: { url: hdaUrl, async: true },
            autostart: true,
            filesystem: {
                baseurl: '/',
                basefs: '/'
            }
        };

        this.emulator = V86Core.create(config);
        
        // "Injector" Logic
        // Wait for boot, then try to run the EXE
        // This is the "Zero Lag" trick: pre-inject commands
        this.emulator.add_listener('serial0-output-char', (char: string) => {
            // Monitor boot logs (if using serial console)
        });

        this.emulator.add_listener('emulator-ready', () => {
            console.log('x86 Core Ready');
            // If we had a way to inject the EXE file into the guest FS here, we would.
            // v86 supports 9p filesystem, which we could use to mount the HiberFile.
        });

        return this.emulator;
    }

    stop() {
        if (this.emulator) {
            this.emulator.stop();
            this.emulator.destroy();
        }
    }
}

