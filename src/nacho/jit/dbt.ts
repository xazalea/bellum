import { X64Decoder, X64Instruction } from '../../engine/cpu/x64';
import { DalvikDecoder } from './dalvik';
import { IRModule, BasicBlock, Opcode, Operand } from './ir';

/**
 * DBT: Dynamic Binary Translator
 * Frontend that converts machine code (x86_64) into Nacho IR.
 */
export class DBT {
    private module: IRModule;

    constructor() {
        this.module = new IRModule();
    }

    /**
     * Translates a sequence of bytes (Dalvik/DEX) into an IR Module.
     */
    public translateDalvik(buffer: ArrayBuffer): IRModule {
        const decoder = new DalvikDecoder(buffer);
        const ir = decoder.decode();
        // In real implementation, we would merge this into the main module or link it.
        return ir;
    }

    /**
     * Translates a sequence of bytes (x86 code) into an IR BasicBlock.
     * @param bytes Machine code
     * @param address Start address (RIP)
     */
    public translateBlock(bytes: Uint8Array, address: number): BasicBlock {
        const block = this.module.createBlock(`block_0x${address.toString(16)}`);

        // 1. Decode x86 using existing decoder
        const instructions = X64Decoder.decode(bytes, address);

        // 2. Lift to IR
        for (const instr of instructions) {
            this.liftInstruction(instr, block);
        }

        return block;
    }

    private liftInstruction(instr: X64Instruction, block: BasicBlock) {
        // Simplified Lifting Logic for Demo
        // Map x86 Opcode ranges to IR Opcodes

        const op = instr.opcode;

        // MOV reg, imm (0xB8 + reg) -> MOVE dst, imm
        if (op >= 0xB8 && op <= 0xBF) {
            const regCtx: Operand = { type: 'REG', value: op - 0xB8 }; // EAX..EDI
            const immVal: Operand = { type: 'IMM', value: instr.immediate || 0 };
            block.addInstruction(Opcode.MOVE, regCtx, immVal);
            return;
        }

        // ADD reg, reg (0x01) -> ADD dst, src
        // Simplified: Assuming ModRM is strictly reg-reg for demo
        if (op === 0x01) {
            // In real x86, we parse ModRM to get src/dst regs.
            // Mocking extraction for demo purposes:
            // ModRM: 0xC0 (11 000 000) -> EAX, EAX
            const modrm = instr.modrm || 0;
            const regDest = (modrm >> 3) & 0x07;
            const regSrc = modrm & 0x07;

            const dst: Operand = { type: 'REG', value: regDest };
            const src: Operand = { type: 'REG', value: regSrc };

            block.addInstruction(Opcode.ADD, dst, dst, src); // dst = dst + src
            return;
        }

        // JMP rel8 (0xEB)
        if (op === 0xEB) {
            const target = instr.address + 2 + (instr.immediate || 0); // 2 bytes size
            block.addInstruction(Opcode.JMP, { type: 'LABEL', value: `block_0x${target.toString(16)}` });
            block.successors.push(`block_0x${target.toString(16)}`);
            return;
        }

        // Fallback for unknown
        console.warn(`DBT: Unknown Opcode 0x${op.toString(16)}`);
    }
}
