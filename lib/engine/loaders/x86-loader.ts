/**
 * X86 Loader - Uses Nacho Transpiler Pipeline
 * No v86 dependency - uses custom JIT/emulation stack
 */

import { puterClient } from '../../storage/hiberfile';
import { NachoLoader } from './nacho-loader';
import { FileType } from '../analyzers/binary-analyzer';
import { executionPipeline } from '../execution-pipeline';

export class X86Loader {
    private nachoLoader: NachoLoader | null = null;

    async load(container: HTMLElement, exePath: string, memoryMB: number = 512) {
        console.log(`[X86Loader] Loading ${exePath} using Nacho transpiler pipeline (no v86)`);

        try {
            // Use Nacho loader which uses the custom JIT/emulation stack
            this.nachoLoader = new NachoLoader();
            
            // Set up status updates for UI feedback
            this.nachoLoader.onStatusUpdate = (status: string, detail?: string) => {
                console.log(`[X86Loader] ${status}: ${detail || ''}`);
            };

            // Load using Nacho transpiler (PE parsing, IR lifting, WASM compilation)
            await this.nachoLoader.load(container, exePath, FileType.PE_EXE);

            console.log('[X86Loader] Load complete via Nacho pipeline');
            return this.nachoLoader;
        } catch (error: any) {
            console.error('[X86Loader] Failed to load:', error);
            throw new Error(`Failed to load EXE: ${error.message}`);
        }
    }

    stop() {
        if (this.nachoLoader) {
            this.nachoLoader.stop();
            this.nachoLoader = null;
        }
    }
}

