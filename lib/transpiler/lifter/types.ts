export enum Arch {
    X86 = 'x86',
    X64 = 'x64',
    ARM = 'arm',
    THUMB = 'thumb',
    RISCV = 'riscv',
    MIPS = 'mips',
    WASM = 'wasm'
}

export enum IRType {
    I32 = 'i32',
    I64 = 'i64',
    F32 = 'f32',
    F64 = 'f64',
    V128 = 'v128', // SIMD
    PTR = 'ptr',
    VOID = 'void'
}

// Define IROpcode to match usage in wasm_compiler.ts
export enum IROpcode {
    PUSH = 'push', // Using string values as in previous inference, or int?
    ADD = 'add',
    SUB = 'sub',
    MUL = 'mul',
    DIV = 'div',
    RET = 'ret',
    MOV = 'mov',
    BR = 'br'
}

export interface IROperand {
    type: 'reg' | 'imm' | 'mem' | 'temp';
    value: number | string;
    size?: number; // in bits
}

export interface IRInstruction {
    id: number;
    opcode: string; // e.g., "mov", "add", "br"
    op1?: IROperand;
    op2?: IROperand;
    op3?: IROperand;
    addr?: number; // Original address
    meta?: any;    // Optimizer metadata
}

export interface BasicBlock {
    id: number;
    startAddr: number;
    endAddr: number;
    instructions: IRInstruction[];
    successors: number[]; // Block IDs
}

export interface FunctionIR {
    name: string;
    entryBlock: number;
    blocks: Map<number, BasicBlock>;
    signature: string;
}

export interface Decoder {
    decode(buffer: Uint8Array, offset: number, addr: number): BasicBlock;
}


