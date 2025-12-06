/**
 * Nacho IR: Intermediate Representation for JIT Compilation
 * Optimized for translation to both WASM and WGSL.
 */

export enum Opcode {
    // Data Movement
    MOVE = 'MOVE',          // dst = src
    LOAD = 'LOAD',          // dst = MEM[src]
    STORE = 'STORE',        // MEM[dst] = src

    // Arithmetic
    ADD = 'ADD',            // dst = src1 + src2
    SUB = 'SUB',            // dst = src1 - src2
    MUL = 'MUL',            // dst = src1 * src2
    DIV = 'DIV',            // dst = src1 / src2

    // Logic
    AND = 'AND',
    OR = 'OR',
    XOR = 'XOR',

    // Control Flow
    CMP = 'CMP',            // flags = compare(src1, src2)
    BEQ = 'BEQ',            // if (flags.equal) goto target
    BNE = 'BNE',            // if (!flags.equal) goto target
    JMP = 'JMP',            // goto target

    // Meta
    PHI = 'PHI'             // value selection for SSA form (future proofing)
}

export type Operand = {
    type: 'REG' | 'IMM' | 'MEM' | 'LABEL';
    value: number | string; // Register ID, Immediate Value, or Label ID
};

export interface IRInstruction {
    id: number;
    opcode: Opcode;
    dst?: Operand;
    src1?: Operand;
    src2?: Operand;
}

export class BasicBlock {
    public id: string;
    public instructions: IRInstruction[] = [];
    public successors: string[] = [];

    constructor(id: string) {
        this.id = id;
    }

    public addInstruction(op: Opcode, dst?: Operand, src1?: Operand, src2?: Operand) {
        this.instructions.push({
            id: this.instructions.length,
            opcode: op,
            dst,
            src1,
            src2
        });
    }
}

export class IRModule {
    public blocks: Map<string, BasicBlock> = new Map();
    public entryBlockId: string = 'entry';

    public createBlock(id: string): BasicBlock {
        const block = new BasicBlock(id);
        this.blocks.set(id, block);
        return block;
    }
}
