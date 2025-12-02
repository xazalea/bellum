/**
 * ROM Loader Helper
 * Handles checking and loading of ROMs/ISOs from Puter.js storage
 */

import { puterClient } from './client';

export interface RomRequirement {
    id: string;
    name: string;
    path: string; // Path in Puter storage
    description: string;
    required: boolean;
}

export class RomLoader {
    static async checkRequirement(requirement: RomRequirement): Promise<boolean> {
        try {
            return await puterClient.fileExists(requirement.path);
        } catch (error) {
            return false;
        }
    }

    static async checkRequirements(requirements: RomRequirement[]): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {};

        for (const req of requirements) {
            results[req.id] = await this.checkRequirement(req);
        }

        return results;
    }

    static async uploadRom(file: File, destinationPath: string): Promise<void> {
        await puterClient.writeFile(destinationPath, file, { compress: true });
    }

    static getWindowsRequirements(): RomRequirement[] {
        return [
            {
                id: 'windows_img',
                name: 'Windows Disk Image',
                path: 'bellum/vms/images/windows98.img',
                description: 'Windows 98 SE Disk Image (IMG/ISO)',
                required: true,
            }
        ];
    }

    static getLinuxRequirements(): RomRequirement[] {
        return [
            {
                id: 'linux_iso',
                name: 'Linux ISO',
                path: 'bellum/vms/images/linux.iso',
                description: 'Linux Live CD ISO (e.g., DSL, TinyCore)',
                required: true,
            }
        ];
    }
}
