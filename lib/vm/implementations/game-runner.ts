/**
 * Game Runner Implementation
 * Optimized for Direct Execution of games without full OS overhead
 */

import { VMConfig, VMType } from '../types';
import { BaseVM } from '../base';
import { puterClient } from '../../puter/client';
import { JSDOSLoader } from '../../emulators/jsdos-loader';

export class GameRunner extends BaseVM {
    private emulator: any = null;
    private gameType: 'dos' | 'console' | 'arcade' = 'dos'; // Default to DOS for now

    constructor(config: VMConfig) {
        super({ ...config, executionMode: 'game' });
        this.gameType = config.customConfig?.gameType || 'dos';
    }

    async initializeEmulator(container: HTMLElement): Promise<void> {
        await this.ensureStoragePath();

        if (!this.container) {
            throw new Error('Container not initialized');
        }

        // Initialize based on game type
        switch (this.gameType) {
            case 'dos':
                await this.initializeDOS(container);
                break;
            default:
                console.warn(`Game type ${this.gameType} not yet supported, falling back to DOS`);
                await this.initializeDOS(container);
        }

        this.emit('initialized');
    }

    private async initializeDOS(container: HTMLElement): Promise<void> {
        // Load js-dos library
        await JSDOSLoader.load();

        // Create js-dos instance with optimized settings for gaming
        this.emulator = await JSDOSLoader.create(container, {
            hardware: (window.navigator.hardwareConcurrency || 4) > 2 ? 'high-performance' : 'default',
        });
    }

    async start(): Promise<void> {
        if (this.state.isRunning) return;

        if (!this.container) throw new Error('VM not mounted');
        if (!this.emulator) await this.initializeEmulator(this.container);

        // Load game file
        const gamePath = this.config.customConfig?.gamePath;
        if (!gamePath) throw new Error('No game path specified in config');

        try {
            const gameUrl = await puterClient.getReadURL(gamePath);

            if (this.gameType === 'dos') {
                await JSDOSLoader.run(this.emulator, gameUrl);
            }
        } catch (error) {
            console.error('Failed to start game:', error);
            throw error;
        }

        this.state.isRunning = true;
        this.state.isPaused = false;
        this.emit('started');
    }

    async stop(): Promise<void> {
        if (!this.state.isRunning) return;

        if (this.gameType === 'dos' && this.emulator) {
            JSDOSLoader.stop(this.emulator);
        }

        this.state.isRunning = false;
        this.state.isPaused = false;
        this.emit('stopped');
    }

    async pause(): Promise<void> {
        if (!this.state.isRunning || this.state.isPaused) return;

        // Pause logic depends on emulator
        // js-dos might not have a direct pause, but we can stop the loop or mute

        this.state.isPaused = true;
        this.emit('paused');
    }

    async resume(): Promise<void> {
        if (!this.state.isRunning || !this.state.isPaused) return;

        this.state.isPaused = false;
        this.emit('resumed');
    }

    async reset(): Promise<void> {
        await this.stop();
        await this.start();
        this.emit('reset');
    }
}
