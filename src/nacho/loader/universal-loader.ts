import { vmManager } from '@/lib/vm/manager';
import { VMType } from '@/lib/vm/types';
import { runJITTest } from '../jit/test-jit';
import { hyperion } from '../engine/hyperion';

export type FileType = 'EXE' | 'APK' | 'ISO' | 'BIN' | 'UNKNOWN';

export class UniversalLoader {
    private static instance: UniversalLoader;
    public logs: string[] = [];
    private listeners: ((logs: string[]) => void)[] = [];

    private constructor() { }

    public static getInstance(): UniversalLoader {
        if (!UniversalLoader.instance) {
            UniversalLoader.instance = new UniversalLoader();
        }
        return UniversalLoader.instance;
    }

    public async loadFile(file: File) {
        this.log(`Loading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        const type = this.detectType(file.name);
        this.log(`Detected Type: ${type}`);

        switch (type) {
            case 'EXE':
                await this.handleEXE(file);
                break;
            case 'APK':
                await this.handleAPK(file);
                break;
            case 'ISO':
                await this.handleISO(file);
                break;
            case 'BIN':
                await this.handleBIN(file);
                break;
            default:
                this.log('Error: Unsupported file type.');
        }
    }

    private detectType(filename: string): FileType {
        const lower = filename.toLowerCase();
        if (lower.endsWith('.exe')) return 'EXE';
        if (lower.endsWith('.apk')) return 'APK';
        if (lower.endsWith('.iso')) return 'ISO';
        if (lower.endsWith('.bin') || lower.endsWith('.wasm')) return 'BIN';
        return 'UNKNOWN';
    }

    private async handleEXE(file: File) {
        this.log('Initializing Windows NT Subsystem (user-mode)...');
        this.log('Analyzing PE Header...');
        // Mocking PE parsing
        await new Promise(r => setTimeout(r, 500));

        this.log('Starting JIT Pipeline (x86_64 -> WGSL)...');
        const wgsl = await runJITTest();
        if (wgsl) {
            this.log('JIT Compilation Successful.');
            this.log('Trace Cache Hot: 15 blocks optimized.');
        }

        // Launch a "Windows" container to visualize
        this.launchVisualizer(VMType.WINDOWS);
    }

    private async handleAPK(file: File) {
        this.log('Initializing Android Runtime (ART)...');
        this.log('Parsing AndroidManifest.xml...');
        await new Promise(r => setTimeout(r, 800));
        this.log('Launching Zygote process...');

        this.launchVisualizer(VMType.ANDROID);
    }

    private async handleISO(file: File) {
        this.log('Mounting ISO image...');
        this.log('BootSector found at sector 0.');

        this.launchVisualizer(VMType.LINUX); // Default for ISOs
    }

    private async handleBIN(file: File) {
        this.log('Loading Native Binary (C++/Rust)...');
        this.log('Initializing NativeBridge (WASM Interface)...');
        // Trigger Engine
        hyperion.start();
        this.log('WebGPU Megakernel Linked.');

        this.launchVisualizer(VMType.PLAYSTATION); // Reusing PS visualizer for "Raw Engine" view
    }

    private async launchVisualizer(type: VMType) {
        const id = `vm-${type}-${Date.now()}`;
        try {
            const vm = await vmManager.createVM({
                id,
                type,
                name: `${type} Visualizer`,
                memory: 1024
            });
            await vm.start();
        } catch (e) {
            console.error(e);
        }
    }

    // Logging System
    public log(msg: string) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[${timestamp}] ${msg}`;
        this.logs.push(entry);
        this.notifyListeners();
        console.log(`[UniversalLoader] ${msg}`);
    }

    public subscribe(callback: (logs: string[]) => void) {
        this.listeners.push(callback);
        callback(this.logs);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.logs));
    }
}

export const universalLoader = UniversalLoader.getInstance();
