import { Arch, FunctionIR, BasicBlock, Decoder } from './types';
import { X86Decoder } from './decoders/x86';
import { ARMDecoder } from './decoders/arm';

// Re-export IROpcode for convenience if it were an enum, but it's not defined here.
// However, to fix the import error in wasm_compiler.ts, we should export it if it exists.
// Since it doesn't exist, we will likely break wasm_compiler.ts if we don't fix it.
// But wait, types.ts has IRInstruction with opcode: string.
// So IROpcode is just a helper object/enum. We should define it in types.ts and export it.

export class FreestandingLifter {
    private decoders: Map<Arch, Decoder> = new Map();
    
    constructor() {
        this.decoders.set(Arch.X86, new X86Decoder());
        this.decoders.set(Arch.ARM, new ARMDecoder());
    }

    /**
     * Lifts a binary blob into Platform-Agnostic IR
     */
    async lift(binary: Uint8Array, arch: Arch, entryPoint: number): Promise<FunctionIR> {
        const decoder = this.decoders.get(arch);
        if (!decoder) throw new Error(`Unsupported architecture: ${arch}`);

        console.log(`Lifter: Starting lift for ${arch} at 0x${entryPoint.toString(16)}`);

        const blocks = new Map<number, BasicBlock>();
        const queue = [entryPoint];
        const visited = new Set<number>();

        // Recursive Descent Disassembly
        while (queue.length > 0) {
            const addr = queue.shift()!;
            if (visited.has(addr)) continue;
            visited.add(addr);

            try {
                // In a real implementation, we need a memory view that maps addresses to file offsets
                // For now, assume linear mapping (offset = addr) for simple ELFs
                // Safety check for buffer bounds
                if (addr >= binary.length) continue;
                
                const block = decoder.decode(binary, addr, addr);
                blocks.set(block.id, block);

                // Follow branches
                for (const succ of block.successors) {
                    if (!visited.has(succ)) {
                        queue.push(succ);
                    }
                }
            } catch (e) {
                console.warn(`Lifter: Decode error at 0x${addr.toString(16)}`, e);
            }
        }

        return {
            name: `func_${entryPoint.toString(16)}`,
            entryBlock: entryPoint, // Use entryPoint as ID
            blocks,
            signature: 'void()'
        };
    }
}

export const lifter = new FreestandingLifter();

