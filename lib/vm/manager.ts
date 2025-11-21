/**
 * VM Manager - Handles creation, storage, and management of VMs
 */

import { VMConfig, VMInstance, VMManager, VMType } from './types';
import { puterClient } from '../puter/client';
import { BaseVM } from './base';
import { LinuxVM } from './implementations/linux';
import { WindowsVM } from './implementations/windows';
import { AndroidVM } from './implementations/android';
import { DOSVM } from './implementations/dos';
import { PlayStationVM } from './implementations/playstation';
import { XboxVM } from './implementations/xbox';

export class VMManagerImpl implements VMManager {
  private vms: Map<string, VMInstance> = new Map();
  private storagePath = 'bellum/vms';

  async createVM(config: VMConfig): Promise<VMInstance> {
    // Ensure storage directory exists
    await puterClient.createDirectory(this.storagePath);

    let vm: VMInstance;

    switch (config.type) {
      case VMType.LINUX:
        vm = new LinuxVM(config);
        break;
      case VMType.WINDOWS:
        vm = new WindowsVM(config);
        break;
      case VMType.ANDROID:
        vm = new AndroidVM(config);
        break;
      case VMType.DOS:
        vm = new DOSVM(config);
        break;
      case VMType.PLAYSTATION:
        vm = new PlayStationVM(config);
        break;
      case VMType.XBOX:
        vm = new XboxVM(config);
        break;
      default:
        throw new Error(`Unsupported VM type: ${config.type}`);
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

