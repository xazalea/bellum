/**
 * X86 Loader - Uses Challenger Transpiler Pipeline
 * No v86 dependency - uses custom JIT/emulation stack
 */

import { puterClient } from '../../storage/hiberfile';
import { ChallengerLoader } from './challenger-loader';
import { FileType } from '../analyzers/binary-analyzer';
import { executionPipeline } from '../execution-pipeline';

export class X86Loader {
    private challengerLoader: ChallengerLoader | null = null;

    async load(container: HTMLElement, exePath: string, memoryMB: number = 512) {
        console.log(`[X86Loader] Loading ${exePath} using Challenger transpiler pipeline (no v86)`);

        try {
            // Use Challenger loader which uses the custom JIT/emulation stack
            this.challengerLoader = new ChallengerLoader();
            
            // Set up status updates for UI feedback
            this.challengerLoader.onStatusUpdate = (status: string, detail?: string) => {
                console.log(`[X86Loader] ${status}: ${detail || ''}`);
            };

            // Load using Challenger transpiler (PE parsing, IR lifting, WASM compilation)
            await this.challengerLoader.load(container, exePath, FileType.PE_EXE);

            console.log('[X86Loader] Load complete via Challenger pipeline');
            return this.challengerLoader;
        } catch (error: any) {
            console.error('[X86Loader] Failed to load:', error);
            throw new Error(`Failed to load EXE: ${error.message}`);
        }
    }

    stop() {
        if (this.challengerLoader) {
            this.challengerLoader.stop();
            this.challengerLoader = null;
        }
    }
}

