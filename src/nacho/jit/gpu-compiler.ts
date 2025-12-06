import { BasicBlock, IRInstruction, Opcode, Operand } from './ir';

/**
 * GPUCompiler: Backend for JIT
 * Compiles Nacho IR blocks into WGSL Compute Shaders
 */
export class GPUCompiler {

    public compileBlockToWGSL(block: BasicBlock): string {
        let wgsl = `
// JIT Compiled Shader for Block ${block.id}
@group(0) @binding(0) var<storage, read_write> registers: array<f32>; // Virtual Registers (0-15)
@group(0) @binding(1) var<storage, read_write> memory: array<f32>;    // Virtual RAM

@compute @workgroup_size(1)
fn main() {
`;

        // 1. Generate Body
        for (const instr of block.instructions) {
            wgsl += this.emitInstruction(instr);
        }

        wgsl += `
}
`;
        return wgsl;
    }

    private emitInstruction(instr: IRInstruction): string {
        const dst = this.emitOperand(instr.dst);
        const src1 = this.emitOperand(instr.src1);
        const src2 = this.emitOperand(instr.src2);

        switch (instr.opcode) {
            case Opcode.MOVE:
                return `    ${dst} = ${src1};\n`;
            case Opcode.ADD:
                return `    ${dst} = ${src1} + ${src2};\n`;
            case Opcode.SUB:
                return `    ${dst} = ${src1} - ${src2};\n`;
            case Opcode.MUL:
                return `    ${dst} = ${src1} * ${src2};\n`;
            case Opcode.LOAD: // MOVE dst, [src1]
                // Simple direct mapping for demo. Real impl needs robust addr translation.
                // Assuming src1 is an index into float array
                return `    ${dst} = memory[u32(${src1})];\n`;
            case Opcode.STORE: // STORE [dst], src1
                return `    memory[u32(${dst})] = ${src1};\n`;
            default:
                return `    // Unsupported Opcode: ${instr.opcode}\n`;
        }
    }

    private emitOperand(op?: Operand): string {
        if (!op) return '';
        if (op.type === 'REG') {
            return `registers[${op.value}]`;
        }
        if (op.type === 'IMM') {
            // Check if float
            return `${op.value}.0`; // Force float for simplicity in f32 array
        }
        return '';
    }
}
