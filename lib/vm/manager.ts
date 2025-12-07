/**
 * VM Manager - Handles creation, storage, and management of VMs
 */

import { VMConfig, VMInstance, VMManager, VMType } from './types';
import { puterClient } from '../puter/client';
import { BaseVM } from './base';
// Legacy VM implementations are temporarily unavailable in this build.
// Once the Nacho Transpiler replaces legacy VMs, reintroduce the modules below.
// import { LinuxVM } from './implementations/linux';
// import { WindowsVM } from './implementations/windows';
// import { AndroidVM } from './implementations/android';
// import { DOSVM } from './implementations/dos';
// import { PlayStationVM } from './implementations/playstation';
// import { XboxVM } from './implementations/xbox';
// CodeExecutionVM imported dynamically to avoid fengari SSR issues

// import { GameRunner } from './implementations/game-runner';

import { GenericVM } from './implementations/generic';

// Lazy load CodeExecutionVM to prevent fengari from being bundled
let codeExecutionModule: typeof import('./implementations/code-execution') | null = null;
async function getCodeExecutionVM() {
  // Dynamic import ensures it's only loaded when needed (client-side)
  if (!codeExecutionModule) {
    const importedModule = await import('./implementations/code-execution');
    codeExecutionModule = importedModule;
  }
  return codeExecutionModule.CodeExecutionVM;
}

export class VMManagerImpl implements VMManager {
  private vms: Map<string, VMInstance> = new Map();
  private storagePath = 'bellum/vms';

  async createVM(config: VMConfig): Promise<VMInstance> {
    // Ensure storage directory exists
    await puterClient.createDirectory(this.storagePath);

    // Resource Management: Pause other running VMs to save resources
    for (const existingVM of this.vms.values()) {
      if (existingVM.state.isRunning && !existingVM.state.isPaused) {
        console.log(`Pausing VM ${existingVM.id} to free resources`);
        await existingVM.pause();
      }
    }

    let vm: VMInstance;

    // Check for Game Mode
    if (config.executionMode === 'game') {
        vm = new GenericVM(config);
    } else if (config.executionMode === 'code' || config.type === VMType.CODE) {
      // Dynamically import CodeExecutionVM to avoid fengari SSR issues
      // Use string-based import to prevent webpack from analyzing it
      if (typeof window === 'undefined') {
        throw new Error('Code execution VMs are only available in browser');
      }
      const CodeExecutionVM = await getCodeExecutionVM();
      vm = new CodeExecutionVM(config);
    } else {
      // Use GenericVM for all other types (Windows, Android, etc.) powered by Nacho Engine
      vm = new GenericVM(config);
    }

    // Load existing state if available
    await vm.loadState();

    // Save initial state
    await vm.saveState();

    this.vms.set(config.id, vm);
    return vm;
  }

  getVM(id: string): VMInstance | null {
    return this.vms.get(id) || null;
  }

  listVMs(): VMInstance[] {
    return Array.from(this.vms.values());
  }

  async deleteVM(id: string): Promise<void> {
    const vm = this.vms.get(id);
    if (!vm) {
      throw new Error(`VM with id ${id} not found`);
    }

    // Stop the VM if it's running
    if (vm.state.isRunning) {
      await vm.stop();
    }

    // Delete storage
    if (vm.state.storagePath) {
      try {
        // Note: Puter.js doesn't have a recursive delete, so we'd need to delete files individually
        // For now, we'll just remove from memory
        // In production, you'd want to implement recursive deletion
      } catch (error) {
        console.error(`Failed to delete storage for VM ${id}:`, error);
      }
    }

    this.vms.delete(id);
  }

  async saveAllVMs(): Promise<void> {
    const savePromises = Array.from(this.vms.values()).map(vm => vm.saveState());
    await Promise.all(savePromises);
  }

  async loadAllVMs(): Promise<void> {
    try {
      const vmsList = await puterClient.listDirectory(this.storagePath);

      for (const vmDir of vmsList) {
        if (vmDir.is_dir) {
          try {
            const statePath = `${vmDir.path}/state.json`;
            const stateJson = await puterClient.readFileAsText(statePath);
            const state = JSON.parse(stateJson);

            // Recreate VM from saved state
            await this.createVM(state.config);
          } catch (error) {
            console.warn(`Failed to load VM from ${vmDir.path}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load VMs, starting fresh:', error);
      // No VMs exist yet, that's okay
    }
  }
}

// Singleton instance
export const vmManager = new VMManagerImpl();

