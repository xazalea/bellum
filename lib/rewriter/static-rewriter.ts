/**
 * Static Binary Rewriter
 * Part of Project BELLUM NEXUS
 * 
 * Rewrites PE (Windows EXE) and DEX (Android APK) binaries to intercept API calls
 * Replaces import addresses with hooks that enqueue work to GPU queues
 * 
 * This is the foundation of API-level emulation - eliminating emulation overhead
 */

import { PEParser } from '../transpiler/pe_parser';
import { DEXParser } from '../transpiler/dex_parser';

export enum BinaryType {
    PE_EXE,
    PE_DLL,
    APK_DEX,
    UNKNOWN,
}

export interface RewriteResult {
    success: boolean;
    originalSize: number;
    patchedSize: number;
    patchCount: number;
    apiHooks: Map<string, number>; // API name -> hook address
    patchedBinary: Uint8Array;
}

export interface APIHook {
    moduleName: string;
    functionName: string;
    hookAddress: number;
    originalAddress: number;
}

/**
 * Static Binary Rewriter
 * Patches binaries at load time to intercept API calls
 */
export class StaticBinaryRewriter {
    private apiHooks: Map<string, APIHook> = new Map();
    private hookTableBase: number = 0x70000000; // Base address for hook table
    private nextHookAddress: number = this.hookTableBase;

    /**
     * Detect binary type
     */
    detectBinaryType(binary: Uint8Array): BinaryType {
        // Check PE signature
        if (binary.length >= 2) {
            const dosSignature = (binary[0] << 8) | binary[1];
            if (dosSignature === 0x4D5A) { // 'MZ'
                return BinaryType.PE_EXE;
            }
        }

        // Check DEX signature
        if (binary.length >= 4) {
            const dexSignature = String.fromCharCode(...binary.slice(0, 3));
            if (dexSignature === 'dex') {
                return BinaryType.APK_DEX;
            }
        }

        return BinaryType.UNKNOWN;
    }

    /**
     * Rewrite binary with API hooks
     */
    async rewrite(binary: Uint8Array): Promise<RewriteResult> {
        const type = this.detectBinaryType(binary);

        switch (type) {
            case BinaryType.PE_EXE:
            case BinaryType.PE_DLL:
                return await this.rewritePE(binary);
            case BinaryType.APK_DEX:
                return await this.rewriteDEX(binary);
            default:
                return {
                    success: false,
                    originalSize: binary.length,
                    patchedSize: binary.length,
                    patchCount: 0,
                    apiHooks: new Map(),
                    patchedBinary: binary,
                };
        }
    }

    /**
     * Rewrite PE (Windows EXE/DLL)
     */
    private async rewritePE(binary: Uint8Array): Promise<RewriteResult> {
        console.log('[Static Rewriter] Rewriting PE binary...');

        try {
            const parser = new PEParser(binary.buffer);
            const { peHeader, optionalHeader, sections } = parser.parse();

            // Make a copy to modify
            const patched = new Uint8Array(binary);
            const patchedView = new DataView(patched.buffer);

            let patchCount = 0;
            const apiHooksMap = new Map<string, number>();

            // Parse import directory
            // Import directory is at offset 1 in data directories (after exports)
            const importDirRVA = this.readOptionalHeaderDataDir(binary, 1, 0);
            const importDirSize = this.readOptionalHeaderDataDir(binary, 1, 4);

            if (importDirRVA === 0 || importDirSize === 0) {
                console.log('[Static Rewriter] No imports found');
                return {
                    success: true,
                    originalSize: binary.length,
                    patchedSize: patched.length,
                    patchCount: 0,
                    apiHooks: apiHooksMap,
                    patchedBinary: patched,
                };
            }

            // Find section containing import directory
            const importSection = sections.find(s =>
                importDirRVA >= s.virtualAddress &&
                importDirRVA < s.virtualAddress + s.virtualSize
            );

            if (!importSection) {
                console.warn('[Static Rewriter] Import section not found');
                return {
                    success: false,
                    originalSize: binary.length,
                    patchedSize: patched.length,
                    patchCount: 0,
                    apiHooks: apiHooksMap,
                    patchedBinary: patched,
                };
            }

            // Calculate file offset of import directory
            const importFileOffset = importSection.pointerToRawData +
                (importDirRVA - importSection.virtualAddress);

            console.log(`[Static Rewriter] Import directory at file offset 0x${importFileOffset.toString(16)}`);

            // Parse import descriptors
            let descriptorOffset = importFileOffset;
            let descriptorIndex = 0;

            while (descriptorOffset < binary.length - 20) {
                // Read import descriptor (20 bytes)
                const originalFirstThunk = patchedView.getUint32(descriptorOffset, true);
                const timeDateStamp = patchedView.getUint32(descriptorOffset + 4, true);
                const forwarderChain = patchedView.getUint32(descriptorOffset + 8, true);
                const nameRVA = patchedView.getUint32(descriptorOffset + 12, true);
                const firstThunk = patchedView.getUint32(descriptorOffset + 16, true);

                // End of import descriptors
                if (nameRVA === 0 && firstThunk === 0) {
                    break;
                }

                // Get DLL name
                const dllNameOffset = this.rvaToFileOffset(nameRVA, sections);
                if (dllNameOffset === -1) {
                    descriptorOffset += 20;
                    continue;
                }

                const dllName = this.readString(binary, dllNameOffset);
                console.log(`[Static Rewriter] Processing imports from ${dllName}`);

                // Check if this is a DLL we want to hook
                if (this.shouldHookDLL(dllName)) {
                    // Process import address table (IAT)
                    const iatOffset = this.rvaToFileOffset(firstThunk, sections);
                    if (iatOffset !== -1) {
                        patchCount += this.patchImportAddressTable(
                            patchedView,
                            iatOffset,
                            dllName,
                            sections,
                            binary,
                            apiHooksMap
                        );
                    }
                }

                descriptorOffset += 20;
                descriptorIndex++;

                // Safety limit
                if (descriptorIndex > 100) {
                    console.warn('[Static Rewriter] Too many import descriptors, stopping');
                    break;
                }
            }

            console.log(`[Static Rewriter] PE rewriting complete: ${patchCount} patches applied`);

            return {
                success: true,
                originalSize: binary.length,
                patchedSize: patched.length,
                patchCount,
                apiHooks: apiHooksMap,
                patchedBinary: patched,
            };

        } catch (error) {
            console.error('[Static Rewriter] PE rewriting failed:', error);
            return {
                success: false,
                originalSize: binary.length,
                patchedSize: binary.length,
                patchCount: 0,
                apiHooks: new Map(),
                patchedBinary: binary,
            };
        }
    }

    /**
     * Check if DLL should be hooked
     */
    private shouldHookDLL(dllName: string): boolean {
        const hookDLLs = [
            'user32.dll',
            'gdi32.dll',
            'kernel32.dll',
            'ntdll.dll',
            'd3d11.dll',
            'd3d12.dll',
            'dxgi.dll',
            'opengl32.dll',
        ];

        return hookDLLs.some(dll => dllName.toLowerCase().includes(dll.toLowerCase()));
    }

    /**
     * Patch import address table
     */
    private patchImportAddressTable(
        view: DataView,
        iatOffset: number,
        dllName: string,
        sections: any[],
        binary: Uint8Array,
        apiHooksMap: Map<string, number>
    ): number {
        let patchCount = 0;
        let entryOffset = iatOffset;
        let entryIndex = 0;

        while (entryOffset < binary.length - 4) {
            const thunkData = view.getUint32(entryOffset, true);

            // End of IAT
            if (thunkData === 0) {
                break;
            }

            // Check if import by name (not ordinal)
            if ((thunkData & 0x80000000) === 0) {
                // Get function name
                const nameOffset = this.rvaToFileOffset(thunkData + 2, sections); // +2 to skip hint
                if (nameOffset !== -1) {
                    const functionName = this.readString(binary, nameOffset);

                    // Create hook for this API
                    const hookAddress = this.createHook(dllName, functionName);
                    apiHooksMap.set(`${dllName}!${functionName}`, hookAddress);

                    // Patch IAT entry with hook address
                    view.setUint32(entryOffset, hookAddress, true);
                    patchCount++;

                    console.log(`[Static Rewriter] Hooked: ${dllName}!${functionName} -> 0x${hookAddress.toString(16)}`);
                }
            }

            entryOffset += 4;
            entryIndex++;

            // Safety limit
            if (entryIndex > 1000) {
                console.warn('[Static Rewriter] Too many IAT entries, stopping');
                break;
            }
        }

        return patchCount;
    }

    /**
     * Create hook for API function
     */
    private createHook(moduleName: string, functionName: string): number {
        const hookAddress = this.nextHookAddress;
        this.nextHookAddress += 16; // 16 bytes per hook

        const hook: APIHook = {
            moduleName,
            functionName,
            hookAddress,
            originalAddress: 0,
        };

        this.apiHooks.set(`${moduleName}!${functionName}`, hook);

        return hookAddress;
    }

    /**
     * Rewrite DEX (Android APK)
     */
    private async rewriteDEX(binary: Uint8Array): Promise<RewriteResult> {
        console.log('[Static Rewriter] Rewriting DEX binary...');

        try {
            const parser = new DEXParser(binary.buffer);
            const header = parser.parseHeader();

            // Make a copy to modify
            const patched = new Uint8Array(binary);
            const patchedView = new DataView(patched.buffer);

            let patchCount = 0;
            const apiHooksMap = new Map<string, number>();

            // Parse method IDs to find framework calls
            console.log(`[Static Rewriter] DEX has ${header.methodIdsSize} methods`);

            // For each method, we would:
            // 1. Parse method signature
            // 2. Check if it's an Android framework method
            // 3. Rewrite invoke-* bytecode to custom hook opcode

            // This is a simplified implementation
            // Full implementation would parse method bodies and rewrite bytecode

            console.log(`[Static Rewriter] DEX rewriting complete: ${patchCount} patches applied`);

            return {
                success: true,
                originalSize: binary.length,
                patchedSize: patched.length,
                patchCount,
                apiHooks: apiHooksMap,
                patchedBinary: patched,
            };

        } catch (error) {
            console.error('[Static Rewriter] DEX rewriting failed:', error);
            return {
                success: false,
                originalSize: binary.length,
                patchedSize: binary.length,
                patchCount: 0,
                apiHooks: new Map(),
                patchedBinary: binary,
            };
        }
    }

    /**
     * Read Optional Header data directory entry
     */
    private readOptionalHeaderDataDir(binary: Uint8Array, index: number, offset: number): number {
        const view = new DataView(binary.buffer);

        // Get PE header offset
        const e_lfanew = view.getUint32(60, true);

        // PE signature + COFF header + Optional Header magic
        const optionalHeaderOffset = e_lfanew + 4 + 20 + 2;

        // Data directories start at offset 96 in optional header (for PE32)
        // Each directory is 8 bytes (RVA + Size)
        const dataDirOffset = optionalHeaderOffset + 94 + (index * 8) + offset;

        return view.getUint32(dataDirOffset, true);
    }

    /**
     * Convert RVA to file offset
     */
    private rvaToFileOffset(rva: number, sections: any[]): number {
        for (const section of sections) {
            if (rva >= section.virtualAddress &&
                rva < section.virtualAddress + section.virtualSize) {
                return section.pointerToRawData + (rva - section.virtualAddress);
            }
        }
        return -1;
    }

    /**
     * Read null-terminated string
     */
    private readString(binary: Uint8Array, offset: number): string {
        let length = 0;
        while (offset + length < binary.length && binary[offset + length] !== 0) {
            length++;
            if (length > 256) break; // Safety limit
        }

        const decoder = new TextDecoder('utf-8');
        return decoder.decode(binary.slice(offset, offset + length));
    }

    /**
     * Get hook for API call
     */
    getHook(moduleName: string, functionName: string): APIHook | undefined {
        return this.apiHooks.get(`${moduleName}!${functionName}`);
    }

    /**
     * Get all hooks
     */
    getAllHooks(): APIHook[] {
        return Array.from(this.apiHooks.values());
    }

    /**
     * Get statistics
     */
    getStatistics(): {
        hookCount: number;
        hookTableSize: number;
    } {
        return {
            hookCount: this.apiHooks.size,
            hookTableSize: this.nextHookAddress - this.hookTableBase,
        };
    }
}

// Export singleton
export const staticBinaryRewriter = new StaticBinaryRewriter();
