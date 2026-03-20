/**
 * x86/x86_64 → SSA IR Translator
 * Part of Project BELLUM NEXUS
 *
 * Wraps X86DecoderFull and converts its BasicBlock output into an SSAFunction
 * in Static Single Assignment form.
 */

import { X86DecoderFull } from '../lifter/decoders/x86-full';
import {
  SSAFunction,
  SSABlock,
  SSAInstruction,
  SSAValue,
  IROpcode,
  IRType,
  BasicBlock,
  IRInstruction,
} from '../lifter/types';

// ---------------------------------------------------------------------------
// X86ToIR
// ---------------------------------------------------------------------------

export class X86ToIR {
  private decoder = new X86DecoderFull();
  private nextValueId = 0;
  private nextInstrId = 0;

  // -------------------------------------------------------------------------
  // Public entry point
  // -------------------------------------------------------------------------

  translate(code: Uint8Array, startAddr: number, name?: string): SSAFunction {
    // Reset per-translation state
    this.nextValueId = 0;
    this.nextInstrId = 0;

    const basicBlock: BasicBlock = this.decoder.decode(code, 0, startAddr);

    const ssaBlock = this.liftBlock(basicBlock);
    const blocks = new Map<number, SSABlock>();
    blocks.set(ssaBlock.id, ssaBlock);

    const fn: SSAFunction = {
      name: name ?? `fn_0x${startAddr.toString(16)}`,
      entryBlock: 0,
      blocks,
      params: [],
      returnType: IRType.I32,
      stackSlots: new Map(),
    };

    return fn;
  }

  // -------------------------------------------------------------------------
  // Block lifting
  // -------------------------------------------------------------------------

  private liftBlock(bb: BasicBlock): SSABlock {
    // Register rename map: x86 register name → current SSAValue
    const regMap = new Map<string, SSAValue>();

    const ssaInstrs: SSAInstruction[] = [];

    for (const irInstr of bb.instructions) {
      const lifted = this.liftInstruction(irInstr, regMap);
      ssaInstrs.push(...lifted);
    }

    const ssaBlock: SSABlock = {
      id: 0,
      startAddr: bb.startAddr,
      instructions: ssaInstrs,
      predecessors: [],
      successors: bb.successors,
      dominator: null,
    };

    return ssaBlock;
  }

  // -------------------------------------------------------------------------
  // Instruction lifting
  // -------------------------------------------------------------------------

  private liftInstruction(
    instr: IRInstruction,
    regMap: Map<string, SSAValue>,
  ): SSAInstruction[] {
    const mnemonic = instr.opcode.toLowerCase();
    const operands: string[] = Array.isArray(instr.operands)
      ? instr.operands.map(String)
      : [];

    const out: SSAInstruction[] = [];

    // ---- Helper: get or create SSAValue for a register
    const getRegValue = (reg: string): SSAValue => {
      const key = reg.toLowerCase();
      if (!regMap.has(key)) {
        const v = this.newValue(this.x86RegType(key));
        v.defInstr = -1; // undefined input
        regMap.set(key, v);
      }
      return regMap.get(key)!;
    };

    // ---- Helper: define new SSAValue for a register write
    const defReg = (reg: string, type: IRType): SSAValue => {
      const v = this.newValue(type);
      regMap.set(reg.toLowerCase(), v);
      return v;
    };

    // ---- Parse operand string to register name or immediate
    const parseOperandReg = (op: string): string | null => {
      const lower = op.toLowerCase();
      if (this.isRegisterName(lower)) return lower;
      return null;
    };

    const parseImm = (op: string): number | null => {
      const n = parseInt(op, 16);
      if (!isNaN(n)) return n;
      const d = parseInt(op, 10);
      if (!isNaN(d)) return d;
      return null;
    };

    const dest   = operands[0] ?? '';
    const src    = operands[1] ?? '';
    const destReg = parseOperandReg(dest);
    const srcReg  = parseOperandReg(src);
    const immVal  = parseImm(src) ?? parseImm(dest) ?? 0;

    // ---- Dispatch by mnemonic
    switch (mnemonic) {
      // -- Data movement
      case 'mov':
      case 'movzx':
      case 'movsx': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const result = destReg ? defReg(destReg, type) : this.newValue(type);
        const srcVal = srcReg
          ? getRegValue(srcReg)
          : this.makeConst(immVal, type, out);
        out.push(this.newInstr(IROpcode.MOV, result, [srcVal]));
        break;
      }

      case 'movaps':
      case 'movups': {
        const result = destReg ? defReg(destReg, IRType.V128) : this.newValue(IRType.V128);
        const srcVal = srcReg ? getRegValue(srcReg) : this.makeConst(0, IRType.V128, out);
        out.push(this.newInstr(IROpcode.MOV, result, [srcVal]));
        break;
      }

      // -- Arithmetic
      case 'add':
      case 'lea': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const rhs = srcReg
          ? getRegValue(srcReg)
          : this.makeConst(immVal, type, out);
        const result = destReg ? defReg(destReg, type) : this.newValue(type);
        out.push(this.newInstr(IROpcode.ADD, result, [lhs, rhs]));
        break;
      }

      case 'sub': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const rhs = srcReg
          ? getRegValue(srcReg)
          : this.makeConst(immVal, type, out);
        const result = destReg ? defReg(destReg, type) : this.newValue(type);
        out.push(this.newInstr(IROpcode.SUB, result, [lhs, rhs]));
        break;
      }

      case 'imul':
      case 'mul': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const rhs = srcReg
          ? getRegValue(srcReg)
          : this.makeConst(immVal, type, out);
        const result = destReg ? defReg(destReg, type) : this.newValue(type);
        out.push(this.newInstr(IROpcode.MUL, result, [lhs, rhs]));
        break;
      }

      case 'idiv':
      case 'div': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const dividend = this.makeConst(0, type, out); // rax implicit — placeholder
        const divisor  = destReg ? getRegValue(destReg) : this.makeConst(immVal, type, out);
        const result   = this.newValue(type);
        out.push(this.newInstr(IROpcode.DIV_S, result, [dividend, divisor]));
        break;
      }

      // -- Bitwise
      case 'and': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const rhs = srcReg ? getRegValue(srcReg) : this.makeConst(immVal, type, out);
        const result = destReg ? defReg(destReg, type) : this.newValue(type);
        out.push(this.newInstr(IROpcode.AND, result, [lhs, rhs]));
        break;
      }

      case 'or': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const rhs = srcReg ? getRegValue(srcReg) : this.makeConst(immVal, type, out);
        const result = destReg ? defReg(destReg, type) : this.newValue(type);
        out.push(this.newInstr(IROpcode.OR, result, [lhs, rhs]));
        break;
      }

      case 'xor':
      case 'xorps':
      case 'xorpd': {
        const type = mnemonic.endsWith('ps') || mnemonic.endsWith('pd')
          ? IRType.V128
          : (destReg ? this.x86RegType(destReg) : IRType.I64);
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const rhs = srcReg ? getRegValue(srcReg) : this.makeConst(immVal, type, out);
        const result = destReg ? defReg(destReg, type) : this.newValue(type);
        out.push(this.newInstr(IROpcode.XOR, result, [lhs, rhs]));
        break;
      }

      case 'shl': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const rhs = srcReg ? getRegValue(srcReg) : this.makeConst(immVal, type, out);
        const result = destReg ? defReg(destReg, type) : this.newValue(type);
        out.push(this.newInstr(IROpcode.SHL, result, [lhs, rhs]));
        break;
      }

      case 'shr': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const rhs = srcReg ? getRegValue(srcReg) : this.makeConst(immVal, type, out);
        const result = destReg ? defReg(destReg, type) : this.newValue(type);
        out.push(this.newInstr(IROpcode.SHR_U, result, [lhs, rhs]));
        break;
      }

      case 'sar': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const rhs = srcReg ? getRegValue(srcReg) : this.makeConst(immVal, type, out);
        const result = destReg ? defReg(destReg, type) : this.newValue(type);
        out.push(this.newInstr(IROpcode.SHR_S, result, [lhs, rhs]));
        break;
      }

      // -- Stack: push
      case 'push': {
        const srcVal = destReg
          ? getRegValue(destReg)
          : this.makeConst(immVal, IRType.I64, out);

        // rsp -= 4 (or 8 for 64-bit; use 8)
        const rsp     = getRegValue('rsp');
        const four    = this.makeConst(8, IRType.I64, out);
        const newRsp  = defReg('rsp', IRType.I64);
        out.push(this.newInstr(IROpcode.SUB, newRsp, [rsp, four]));

        // store value at [rsp]
        const storeInstr = this.newInstr(IROpcode.STORE32, null, [getRegValue('rsp'), srcVal]);
        storeInstr.memOffset = 0;
        out.push(storeInstr);
        break;
      }

      // -- Stack: pop
      case 'pop': {
        const rsp    = getRegValue('rsp');
        const loaded = this.newValue(destReg ? this.x86RegType(destReg) : IRType.I64);
        const loadI  = this.newInstr(IROpcode.LOAD32, loaded, [rsp]);
        loadI.memOffset = 0;
        out.push(loadI);

        if (destReg) {
          const destVal = defReg(destReg, loaded.type);
          out.push(this.newInstr(IROpcode.MOV, destVal, [loaded]));
        }

        // rsp += 8
        const four   = this.makeConst(8, IRType.I64, out);
        const newRsp = defReg('rsp', IRType.I64);
        out.push(this.newInstr(IROpcode.ADD, newRsp, [rsp, four]));
        break;
      }

      // -- Control flow
      case 'call': {
        const target = parseImm(dest) ?? 0;
        const ci = this.newInstr(IROpcode.CALL_INDIRECT, null, []);
        ci.branchTarget = target;
        ci.imm = target;
        out.push(ci);
        break;
      }

      case 'ret': {
        // Return value is in eax/rax
        const retVal = getRegValue('rax');
        out.push(this.newInstr(IROpcode.RET, null, [retVal]));
        break;
      }

      case 'jmp': {
        const target = parseImm(dest) ?? 0;
        const br = this.newInstr(IROpcode.BR, null, []);
        br.branchTarget = target;
        out.push(br);
        break;
      }

      // Conditional jumps
      case 'je':
      case 'jne':
      case 'jl':
      case 'jge':
      case 'jg':
      case 'jle':
      case 'jb':
      case 'jbe':
      case 'ja':
      case 'jae':
      case 'jo':
      case 'jno':
      case 'js':
      case 'jns':
      case 'jp':
      case 'jnp': {
        // Condition value — look for a flags value in the register map, else make a placeholder
        const flags = regMap.get('__flags') ?? this.makeConst(0, IRType.I32, out);
        const target = parseImm(dest) ?? 0;
        const bri = this.newInstr(IROpcode.BR_IF, null, [flags]);
        bri.branchTarget = target;
        out.push(bri);
        break;
      }

      // -- Compare / test
      case 'cmp': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const rhs = srcReg ? getRegValue(srcReg) : this.makeConst(immVal, type, out);
        const flagVal = defReg('__flags', IRType.I32);
        out.push(this.newInstr(IROpcode.CMP, flagVal, [lhs, rhs]));
        break;
      }

      case 'test': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const rhs = srcReg ? getRegValue(srcReg) : this.makeConst(immVal, type, out);
        // AND result discarded — only flags updated
        const flagVal = defReg('__flags', IRType.I32);
        out.push(this.newInstr(IROpcode.AND, flagVal, [lhs, rhs]));
        break;
      }

      // -- Conditional move
      case 'cmova':
      case 'cmovae':
      case 'cmovb':
      case 'cmovbe':
      case 'cmove':
      case 'cmovg':
      case 'cmovge':
      case 'cmovl':
      case 'cmovle':
      case 'cmovne':
      case 'cmovs':
      case 'cmovns': {
        const type = destReg ? this.x86RegType(destReg) : IRType.I64;
        const cond   = regMap.get('__flags') ?? this.makeConst(0, IRType.I32, out);
        const ifTrue = srcReg ? getRegValue(srcReg) : this.makeConst(immVal, type, out);
        const ifFalse = destReg ? getRegValue(destReg) : this.makeConst(0, type, out);
        const result = destReg ? defReg(destReg, type) : this.newValue(type);
        out.push(this.newInstr(IROpcode.SELECT, result, [cond, ifTrue, ifFalse]));
        break;
      }

      // -- SSE SIMD
      case 'addps': {
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, IRType.V128, out);
        const rhs = srcReg ? getRegValue(srcReg) : this.makeConst(0, IRType.V128, out);
        const result = destReg ? defReg(destReg, IRType.V128) : this.newValue(IRType.V128);
        out.push(this.newInstr(IROpcode.F32X4_ADD, result, [lhs, rhs]));
        break;
      }

      case 'mulps': {
        const lhs = destReg ? getRegValue(destReg) : this.makeConst(0, IRType.V128, out);
        const rhs = srcReg ? getRegValue(srcReg) : this.makeConst(0, IRType.V128, out);
        const result = destReg ? defReg(destReg, IRType.V128) : this.newValue(IRType.V128);
        out.push(this.newInstr(IROpcode.F32X4_MUL, result, [lhs, rhs]));
        break;
      }

      // -- NOP / system calls
      case 'nop': {
        out.push(this.newInstr(IROpcode.NOP, null, []));
        break;
      }

      case 'int':
      case 'syscall': {
        // Treat as a call to a syscall stub
        const ci = this.newInstr(IROpcode.CALL_INDIRECT, null, []);
        ci.branchTarget = 0xFFFF_FFFF; // Sentinel: syscall
        out.push(ci);
        break;
      }

      // -- Load/store via memory operands (generic fallback)
      default: {
        // Attempt a best-effort MOV if operands are register-shaped
        if (destReg && srcReg) {
          const type = this.x86RegType(destReg);
          const srcVal = getRegValue(srcReg);
          const result = defReg(destReg, type);
          out.push(this.newInstr(IROpcode.MOV, result, [srcVal]));
        } else {
          out.push(this.newInstr(IROpcode.NOP, null, []));
        }
        break;
      }
    }

    return out;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Emit a CONST instruction and return the SSAValue it defines */
  private makeConst(value: number, type: IRType, out: SSAInstruction[]): SSAValue {
    const result = this.newValue(type);
    let opcode: IROpcode;
    switch (type) {
      case IRType.F32: opcode = IROpcode.CONST_F32; break;
      case IRType.F64: opcode = IROpcode.CONST_F64; break;
      case IRType.I64: opcode = IROpcode.CONST_I64; break;
      default:         opcode = IROpcode.CONST_I32; break;
    }
    out.push(this.newInstr(opcode, result, [], value));
    return result;
  }

  private newValue(type: IRType): SSAValue {
    return {
      id: this.nextValueId++,
      type,
      defInstr: this.nextInstrId, // Will be set properly by newInstr
      useCount: 0,
    };
  }

  private newInstr(
    opcode: IROpcode,
    result: SSAValue | null,
    operands: SSAValue[],
    imm?: number | bigint,
  ): SSAInstruction {
    const id = this.nextInstrId++;
    if (result !== null) {
      result.defInstr = id;
    }
    for (const op of operands) {
      op.useCount++;
    }
    return { id, opcode, result, operands, imm };
  }

  private x86MnemonicToOpcode(mnemonic: string): IROpcode {
    switch (mnemonic.toLowerCase()) {
      case 'mov':    case 'movzx': case 'movsx':
      case 'movaps': case 'movups':                return IROpcode.MOV;
      case 'add':    case 'lea':                   return IROpcode.ADD;
      case 'sub':                                  return IROpcode.SUB;
      case 'imul':   case 'mul':                   return IROpcode.MUL;
      case 'idiv':   case 'div':                   return IROpcode.DIV_S;
      case 'and':                                  return IROpcode.AND;
      case 'or':                                   return IROpcode.OR;
      case 'xor':    case 'xorps': case 'xorpd':  return IROpcode.XOR;
      case 'shl':                                  return IROpcode.SHL;
      case 'shr':                                  return IROpcode.SHR_U;
      case 'sar':                                  return IROpcode.SHR_S;
      case 'push':                                 return IROpcode.STORE32;
      case 'pop':                                  return IROpcode.LOAD32;
      case 'call':                                 return IROpcode.CALL_INDIRECT;
      case 'ret':                                  return IROpcode.RET;
      case 'jmp':                                  return IROpcode.BR;
      case 'je':  case 'jne': case 'jl':
      case 'jge': case 'jg':  case 'jle':
      case 'jb':  case 'jbe': case 'ja':
      case 'jae': case 'jo':  case 'jno':
      case 'js':  case 'jns': case 'jp':  case 'jnp': return IROpcode.BR_IF;
      case 'cmp':                                  return IROpcode.CMP;
      case 'test':                                 return IROpcode.AND;
      case 'nop':                                  return IROpcode.NOP;
      case 'int':    case 'syscall':               return IROpcode.CALL_INDIRECT;
      case 'addps':                                return IROpcode.F32X4_ADD;
      case 'mulps':                                return IROpcode.F32X4_MUL;
      case 'cmova': case 'cmovae': case 'cmovb':
      case 'cmovbe': case 'cmove': case 'cmovg':
      case 'cmovge': case 'cmovl': case 'cmovle':
      case 'cmovne': case 'cmovs': case 'cmovns': return IROpcode.SELECT;
      default:                                     return IROpcode.UNKNOWN;
    }
  }

  private x86RegType(reg: string): IRType {
    const r = reg.toLowerCase();

    // 128-bit SIMD
    if (/^xmm\d+$/.test(r)) return IRType.V128;

    // x87 FPU
    if (/^st\(\d+\)$/.test(r) || /^st\d$/.test(r)) return IRType.F64;

    // 64-bit GP registers
    if (
      ['rax','rbx','rcx','rdx','rsi','rdi','rsp','rbp','rip'].includes(r) ||
      /^r\d+$/.test(r)
    ) {
      return IRType.I64;
    }

    // 32-bit and smaller GP registers
    if (
      ['eax','ebx','ecx','edx','esi','edi','esp','ebp','eip'].includes(r) ||
      ['ax','bx','cx','dx','si','di','sp','bp'].includes(r) ||
      ['al','ah','bl','bh','cl','ch','dl','dh'].includes(r) ||
      /^r\d+d$/.test(r) || /^r\d+w$/.test(r) || /^r\d+b$/.test(r)
    ) {
      return IRType.I32;
    }

    // Internal flags pseudo-register
    if (r === '__flags') return IRType.I32;

    // Default
    return IRType.I64;
  }

  private isRegisterName(s: string): boolean {
    const known = new Set([
      'rax','rbx','rcx','rdx','rsi','rdi','rsp','rbp','rip',
      'eax','ebx','ecx','edx','esi','edi','esp','ebp','eip',
      'ax','bx','cx','dx','si','di','sp','bp',
      'al','ah','bl','bh','cl','ch','dl','dh',
    ]);
    if (known.has(s)) return true;
    if (/^r\d+(|d|w|b)$/.test(s)) return true;
    if (/^xmm\d+$/.test(s)) return true;
    if (/^st\(\d+\)$/.test(s) || /^st\d$/.test(s)) return true;
    return false;
  }
}

export const x86ToIR = new X86ToIR();
