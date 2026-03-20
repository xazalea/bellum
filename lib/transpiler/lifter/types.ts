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
    PUSH = 'push',
    ADD = 'add',
    SUB = 'sub',
    MUL = 'mul',
    DIV = 'div',
    DIV_S = 'div_s',
    DIV_U = 'div_u',
    RET = 'ret',
    MOV = 'mov',
    BR = 'br',
    BR_IF = 'br_if',
    BR_TABLE = 'br_table',
    AND = 'and',
    OR = 'or',
    XOR = 'xor',
    SHL = 'shl',
    SHR_S = 'shr_s',
    SHR_U = 'shr_u',
    CMP = 'cmp',
    LOAD = 'load',
    LOAD32 = 'load32',
    STORE = 'store',
    STORE32 = 'store32',
    CALL = 'call',
    CALL_INDIRECT = 'call_indirect',
    JMP = 'jmp',
    POP = 'pop',
    ADC = 'adc',
    CONST_I32 = 'const_i32',
    CONST_I64 = 'const_i64',
    CONST_F32 = 'const_f32',
    CONST_F64 = 'const_f64',
    NEG = 'neg',
    NOT = 'not',
    TRAP = 'trap',
    NOP = 'nop',
    SELECT = 'select',
    PHI = 'phi',
    // SIMD
    V128_LOAD = 'v128_load',
    V128_STORE = 'v128_store',
    I32X4_ADD = 'i32x4_add',
    I32X4_MUL = 'i32x4_mul',
    I32X4_SPLAT = 'i32x4_splat',
    F32X4_ADD = 'f32x4_add',
    F32X4_MUL = 'f32x4_mul',
    F32X4_SPLAT = 'f32x4_splat',
    UNKNOWN = 'unknown'
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
    bytes?: Uint8Array;
    operands?: any[];
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

// ---------------------------------------------------------------------------
// SSA (Static Single Assignment) IR — full form
// ---------------------------------------------------------------------------

export interface SSAValue {
    id: number;
    type: IRType;
    defInstr: number; // SSAInstruction id that defines this value (-1 = parameter)
    useCount: number;
}

export interface SSAInstruction {
    id: number;
    opcode: IROpcode;
    result: SSAValue | null;
    operands: SSAValue[];
    imm?: number | bigint;
    memOffset?: number;
    branchTarget?: number;
    /** PHI node sources: for each predecessor block, which SSAValue to use */
    phiSources?: Array<{ blockId: number; value: SSAValue }>;
}

export interface SSABlock {
    id: number;
    startAddr: number;
    instructions: SSAInstruction[];
    predecessors: number[];
    successors: number[];
    /** Immediate dominator block id (null for entry) */
    dominator: number | null;
}

export interface SSAFunction {
    name: string;
    entryBlock: number;
    blocks: Map<number, SSABlock>;
    params: SSAValue[];
    returnType: IRType;
    /** Maps stack slot offset → type */
    stackSlots: Map<number, IRType>;
}

/** Live interval for register allocation: [start, end) instruction ids */
export interface LiveInterval {
    valueId: number;
    type: IRType;
    start: number;
    end: number;
    /** Assigned WASM local index, or -1 if spilled */
    localIdx: number;
}


