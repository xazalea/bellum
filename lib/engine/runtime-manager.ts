
import { FileType, BinaryAnalyzer } from './analyzers/binary-analyzer';
import { puterClient } from '../storage/hiberfile';
import { X86Loader } from './loaders/x86-loader';
import { APKLoader } from './loaders/apk-loader';
import { NachoLoader } from './loaders/nacho-loader';

export interface RuntimeConfig {
    memory: number; // MB
    vfsMounts: string[];
    env: Record<string, string>;
}

export class RuntimeManager {
    private static instance: RuntimeManager;
    private activeLoader: any = null;

    private constructor() {}

    static getInstance(): RuntimeManager {
        if (!RuntimeManager.instance) {
            RuntimeManager.instance = new RuntimeManager();
        }
        return RuntimeManager.instance;
    }

    getActiveLoader(): any {
        return this.activeLoader;
    }

    /**
     * "Converts" the file by analyzing it and preparing the runtime configuration.
     * Returns a playable "Runtime Packet".
     */
    async prepareRuntime(filePath: string): Promise<{ type: FileType, config: RuntimeConfig }> {
        // Read first 4KB for header analysis
        const headerChunk = await puterClient.readChunk(filePath, 0, 4096);
        let type = await BinaryAnalyzer.detectType(headerChunk);

        // Heuristic: If ZIP, check file extension or internals to see if it's APK
        if (type === FileType.ZIP) {
            if (filePath.toLowerCase().endsWith('.apk')) {
                type = FileType.APK;
            }
        }
        
        // Fallback: ISO -> PE_EXE logic (auto-boot Windows)
        if (filePath.toLowerCase().endsWith('.iso')) {
            type = FileType.PE_EXE; // Treat as x86 bootable
        }

        console.log(`Detected file type for ${filePath}: ${type}`);

        return {
             type,
             config: this.generateConfig(type, filePath)
        };
    }

    private generateConfig(type: FileType, filePath: string): RuntimeConfig {
        switch (type) {
            case FileType.PE_EXE:
                return {
                    memory: 512,
                    vfsMounts: [filePath],
                    env: { 'PATH': 'C:\\Windows' }
                };
            case FileType.APK:
                return {
                    memory: 1024,
                    vfsMounts: [filePath],
                    env: { 'ANDROID_ROOT': '/system' }
                };
            default:
                 // Fallback for unknown types (treat as generic x86)
                 return {
                    memory: 256,
                    vfsMounts: [filePath],
                    env: {}
                 };
        }
    }

    async launch(container: HTMLElement, type: FileType, filePath: string, config: RuntimeConfig) {
        if (this.activeLoader) {
            try { this.activeLoader.stop(); } catch(e) {}
        }

        switch (type) {
            case FileType.PE_EXE:
                // Switch to Nacho Transpiler for PE files
                this.activeLoader = new NachoLoader();
                await this.activeLoader.load(container, filePath, type);
                break;
            case FileType.APK:
                // Switch to APK Loader (Dalvik Simulator) for visual feedback
                this.activeLoader = new APKLoader();
                await this.activeLoader.load(container, filePath);
                break;
            default:
                // Fallback to x86 for ISOs/Unknowns
                this.activeLoader = new X86Loader();
                await this.activeLoader.load(container, filePath, config.memory);
                break;
        }
    }
    
    stop() {
        if (this.activeLoader) {
            try { this.activeLoader.stop(); } catch(e) {}
            this.activeLoader = null;
        }
    }
}


