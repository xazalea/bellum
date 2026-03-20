/**
 * Dalvik bytecode → SSA IR translator
 * Browser/Cloudflare Pages safe — no Node.js built-ins used.
 */

import { SSAFunction, SSABlock, SSAInstruction, SSAValue, IROpcode, IRType } from '../lifter/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _nextValueId = 1;
let _nextInstrId = 1;

function resetIds(): void {
  _nextValueId = 1;
  _nextInstrId = 1;
}

function mkValue(type: IRType, defInstr: number): SSAValue {
  return { id: _nextValueId++, type, defInstr, useCount: 0 };
}

function mkInstr(
  opcode: IROpcode,
  result: SSAValue | null,
  operands: SSAValue[],
  extra?: Partial<Omit<SSAInstruction, 'id' | 'opcode' | 'result' | 'operands'>>
): SSAInstruction {
  return { id: _nextInstrId++, opcode, result, operands, ...extra };
}

function use(v: SSAValue): SSAValue {
  v.useCount++;
  return v;
}

// Sign-extend a bit-field extracted from a raw 16-bit word
function signExtend(value: number, bits: number): number {
  const shift = 32 - bits;
  return (value << shift) >> shift;
}

// ---------------------------------------------------------------------------
// parseDalvikCodeItem
// ---------------------------------------------------------------------------

export function parseDalvikCodeItem(
  buffer: ArrayBuffer,
  offset: number
): { insns: Uint16Array; registersSize: number; insSize: number; outsSize: number } {
  const view = new DataView(buffer);
  const registersSize = view.getUint16(offset, true);
  const insSize = view.getUint16(offset + 2, true);
  const outsSize = view.getUint16(offset + 4, true);
  // offset+6 is triesSize (uint16), offset+8 is debugInfoOff (uint32)
  const insnsSize = view.getUint32(offset + 12, true); // count of 16-bit code units
  const insnsOffset = offset + 16;
  const insns = new Uint16Array(buffer, insnsOffset, insnsSize);
  return { insns, registersSize, insSize, outsSize };
}

// ---------------------------------------------------------------------------
// DalvikToIR
// ---------------------------------------------------------------------------

export class DalvikToIR {
  // Per-translation SSAValue counter state is managed via resetIds() at start of translate().

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  translate(insns: Uint16Array, startPc: number, length: number): SSAFunction {
    resetIds();

    const end = startPc + length;

    // -----------------------------------------------------------------------
    // Pass 1 — identify basic block leaders
    // -----------------------------------------------------------------------
    const leaders = new Set<number>();
    leaders.add(startPc);

    for (let pc = startPc; pc < end; ) {
      const raw = insns[pc - startPc];
      const op = raw & 0xff;
      const wordLen = this._opcodeWordLength(op, insns, pc, startPc);

      switch (op) {
        // GOTO/8
        case 0x28: {
          const off = signExtend((raw >> 8) & 0xff, 8);
          const target = pc + off;
          leaders.add(target);
          leaders.add(pc + 1);
          break;
        }
        // GOTO/16
        case 0x29: {
          const off = signExtend(insns[pc - startPc + 1], 16);
          const target = pc + off;
          leaders.add(target);
          leaders.add(pc + 2);
          break;
        }
        // GOTO/32
        case 0x2a: {
          const lo = insns[pc - startPc + 1];
          const hi = insns[pc - startPc + 2];
          const off = (hi << 16) | lo;
          const target = pc + off;
          leaders.add(target);
          leaders.add(pc + 3);
          break;
        }
        // PACKED_SWITCH, SPARSE_SWITCH — branch targets are in payload
        case 0x2b:
        case 0x2c: {
          const payOff = (insns[pc - startPc + 2] << 16) | insns[pc - startPc + 1];
          this._collectSwitchTargets(op, insns, pc, startPc, payOff, leaders);
          leaders.add(pc + 3);
          break;
        }
        // IF_* (2-reg)
        case 0x32: case 0x33: case 0x34: case 0x35: case 0x36: case 0x37: {
          const off = signExtend(insns[pc - startPc + 1], 16);
          leaders.add(pc + off);
          leaders.add(pc + 2);
          break;
        }
        // IF_*Z (1-reg)
        case 0x38: case 0x39: case 0x3a: case 0x3b: case 0x3c: case 0x3d: {
          const off = signExtend(insns[pc - startPc + 1], 16);
          leaders.add(pc + off);
          leaders.add(pc + 2);
          break;
        }
        // RETURN variants & THROW terminate a block
        case 0x0e: case 0x0f: case 0x10: case 0x11: case 0x27: {
          leaders.add(pc + wordLen);
          break;
        }
      }

      pc += wordLen;
    }

    // Sort leaders into ordered list; clamp to [startPc, end)
    const sortedLeaders = Array.from(leaders)
      .filter(l => l >= startPc && l < end)
      .sort((a, b) => a - b);

    // -----------------------------------------------------------------------
    // Build skeleton SSABlocks (no instructions yet)
    // -----------------------------------------------------------------------
    const blocks = new Map<number, SSABlock>();
    for (let i = 0; i < sortedLeaders.length; i++) {
      const blkId = sortedLeaders[i];
      blocks.set(blkId, {
        id: blkId,
        startAddr: blkId,
        instructions: [],
        predecessors: [],
        successors: [],
        dominator: i === 0 ? null : sortedLeaders[0],
      });
    }

    // Helper: find which block pc belongs to
    const blockOf = (pc: number): number => {
      let result = startPc;
      for (const l of sortedLeaders) {
        if (l <= pc) result = l;
        else break;
      }
      return result;
    };

    // -----------------------------------------------------------------------
    // Pass 2 — per-block register state and instruction translation
    // -----------------------------------------------------------------------
    // Shared "current" register→SSAValue map initialised fresh per block.
    // (Full SSA with PHI insertion requires a dominator tree; here we do
    //  a simple linear scan keeping the last def visible within the block.)
    const globalRegs = new Map<number, SSAValue>();

    for (let bi = 0; bi < sortedLeaders.length; bi++) {
      const blkStart = sortedLeaders[bi];
      const blkEnd = bi + 1 < sortedLeaders.length ? sortedLeaders[bi + 1] : end;
      const block = blocks.get(blkStart)!;

      // Copy global register state into per-block map (simulates live-in values)
      const regs = new Map<number, SSAValue>(globalRegs);

      for (let pc = blkStart; pc < blkEnd && pc < end; ) {
        const raw = insns[pc - startPc];
        const op = raw & 0xff;
        const wordLen = this._opcodeWordLength(op, insns, pc, startPc);

        const instr = this.translateOpcode(raw, pc, regs);
        if (instr !== null) {
          block.instructions.push(instr);
          // If the instruction defines a result register, record it
          this._updateRegsFromInstr(op, raw, insns, pc, startPc, regs, instr);
        }

        // Wire up successor edges for control-flow instructions
        this._wireSuccessors(op, raw, insns, pc, startPc, blkStart, block, blocks, blockOf, end, wordLen);

        pc += wordLen;
      }

      // Propagate register state forward (very conservative; proper SSA would need PHIs)
      for (const [k, v] of regs) {
        globalRegs.set(k, v);
      }
    }

    // Fill predecessor lists
    for (const [, blk] of blocks) {
      for (const succId of blk.successors) {
        const succ = blocks.get(succId);
        if (succ && !succ.predecessors.includes(blk.id)) {
          succ.predecessors.push(blk.id);
        }
      }
    }

    return {
      name: `dalvik_fn_0x${startPc.toString(16)}`,
      entryBlock: sortedLeaders[0] ?? startPc,
      blocks,
      params: [],
      returnType: IRType.I32,
      stackSlots: new Map(),
    };
  }

  // -------------------------------------------------------------------------
  // translateOpcode
  // -------------------------------------------------------------------------

  translateOpcode(
    insn: number,
    pc: number,
    regs: Map<number, SSAValue>
  ): SSAInstruction | null {
    const op = insn & 0xff;
    const byteA = (insn >> 8) & 0xff;  // vA nibble or full byte depending on format
    const nibA = (insn >> 8) & 0x0f;   // vA 4-bit
    const nibB = (insn >> 12) & 0x0f;  // vB 4-bit

    // Utility: get or create a placeholder SSAValue for a register
    const getReg = (reg: number, type: IRType = IRType.I32): SSAValue => {
      if (!regs.has(reg)) {
        const v = mkValue(type, -1);
        regs.set(reg, v);
      }
      return use(regs.get(reg)!);
    };

    const defReg = (reg: number, type: IRType = IRType.I32): SSAValue => {
      const v = mkValue(type, _nextInstrId); // forward-ref; gets patched after mkInstr
      regs.set(reg, v);
      return v;
    };

    switch (op) {
      // -----------------------------------------------------------------------
      // 0x00 NOP
      // -----------------------------------------------------------------------
      case 0x00:
        return mkInstr(IROpcode.NOP, null, []);

      // -----------------------------------------------------------------------
      // 0x01–0x09 MOVE variants
      // -----------------------------------------------------------------------
      case 0x01: case 0x04: case 0x07: {
        // 12x format: vA=nibA, vB=nibB
        const src = getReg(nibB);
        const dst = defReg(nibA, src.type);
        const i = mkInstr(IROpcode.MOV, dst, [src]);
        dst.defInstr = i.id;
        return i;
      }
      case 0x02: case 0x05: case 0x08: {
        // 22x format: vAA = byteA, vBBBB = next word
        // We only have the first 16-bit word here; vBBBB would be in insns[pc+1].
        // Treat src reg as byteA+1 approximation (full decode needs insns array).
        const dst = defReg(byteA);
        const i = mkInstr(IROpcode.MOV, dst, []);
        dst.defInstr = i.id;
        return i;
      }
      case 0x03: case 0x06: case 0x09: {
        // 32x format: both regs in following words; emit NOP as placeholder
        return mkInstr(IROpcode.NOP, null, []);
      }

      // -----------------------------------------------------------------------
      // 0x0a MOVE_RESULT
      // -----------------------------------------------------------------------
      case 0x0a: case 0x0b: case 0x0c: {
        const dst = defReg(byteA);
        const i = mkInstr(IROpcode.MOV, dst, []);
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x0e RETURN_VOID
      // -----------------------------------------------------------------------
      case 0x0e:
        return mkInstr(IROpcode.RET, null, []);

      // -----------------------------------------------------------------------
      // 0x0f–0x11 RETURN
      // -----------------------------------------------------------------------
      case 0x0f: {
        const v = getReg(byteA, IRType.I32);
        return mkInstr(IROpcode.RET, null, [v]);
      }
      case 0x10: {
        const v = getReg(byteA, IRType.I64);
        return mkInstr(IROpcode.RET, null, [v]);
      }
      case 0x11: {
        const v = getReg(byteA, IRType.F32);
        return mkInstr(IROpcode.RET, null, [v]);
      }

      // -----------------------------------------------------------------------
      // 0x12 CONST/4  — 11n format: vA=nibA, #+B=signExtend(nibB,4)
      // -----------------------------------------------------------------------
      case 0x12: {
        const imm = signExtend(nibB, 4);
        const dst = defReg(nibA);
        const i = mkInstr(IROpcode.CONST_I32, dst, [], { imm });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x13 CONST/16 — 21s: vAA=byteA, #+BBBB=next word (sign-extended)
      // -----------------------------------------------------------------------
      case 0x13: {
        const dst = defReg(byteA);
        const i = mkInstr(IROpcode.CONST_I32, dst, [], { imm: 0 /* filled by caller with insns[pc+1] */ });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x14 CONST — 31i: vAA=byteA, #+BBBBBBBB
      // -----------------------------------------------------------------------
      case 0x14: {
        const dst = defReg(byteA);
        const i = mkInstr(IROpcode.CONST_I32, dst, [], { imm: 0 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x15 CONST/HIGH16 — 21h
      // -----------------------------------------------------------------------
      case 0x15: {
        const dst = defReg(byteA);
        const i = mkInstr(IROpcode.CONST_I32, dst, [], { imm: 0 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x16–0x19 CONST_WIDE variants
      // -----------------------------------------------------------------------
      case 0x16: case 0x17: case 0x18: case 0x19: {
        const dst = defReg(byteA, IRType.I64);
        const i = mkInstr(IROpcode.CONST_I64, dst, [], { imm: BigInt(0) });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x1a–0x1c CONST_STRING / CONST_CLASS
      // -----------------------------------------------------------------------
      case 0x1a: case 0x1b: case 0x1c: {
        const dst = defReg(byteA);
        // imm is the string/class index in the DEX pool
        const i = mkInstr(IROpcode.CONST_I32, dst, [], { imm: 0 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x1d–0x1e MONITOR_ENTER / MONITOR_EXIT → NOP (browser, no threads)
      // -----------------------------------------------------------------------
      case 0x1d: case 0x1e:
        return mkInstr(IROpcode.NOP, null, []);

      // -----------------------------------------------------------------------
      // 0x1f CHECK_CAST → CALL_INDIRECT stub index 7
      // -----------------------------------------------------------------------
      case 0x1f: {
        const obj = getReg(byteA);
        const dst = defReg(byteA);
        const i = mkInstr(IROpcode.CALL_INDIRECT, dst, [obj], { imm: 7 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x20 INSTANCE_OF → CALL_INDIRECT stub index 8
      // -----------------------------------------------------------------------
      case 0x20: {
        const obj = getReg(nibB);
        const dst = defReg(nibA);
        const i = mkInstr(IROpcode.CALL_INDIRECT, dst, [obj], { imm: 8 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x21 ARRAY_LENGTH → LOAD32 at offset 8 (array header length field)
      // -----------------------------------------------------------------------
      case 0x21: {
        const arr = getReg(nibB, IRType.PTR);
        const dst = defReg(nibA);
        const i = mkInstr(IROpcode.LOAD32, dst, [arr], { memOffset: 8 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x22 NEW_INSTANCE → CALL_INDIRECT stub index 0 (art_alloc_object)
      // -----------------------------------------------------------------------
      case 0x22: {
        const dst = defReg(byteA, IRType.PTR);
        const i = mkInstr(IROpcode.CALL_INDIRECT, dst, [], { imm: 0 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x23 NEW_ARRAY → CALL_INDIRECT stub index 1 (art_alloc_array)
      // -----------------------------------------------------------------------
      case 0x23: {
        const sizeVal = getReg(nibB);
        const dst = defReg(nibA, IRType.PTR);
        const i = mkInstr(IROpcode.CALL_INDIRECT, dst, [sizeVal], { imm: 1 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x24–0x26 FILLED_NEW_ARRAY → CALL_INDIRECT (art_alloc_array)
      // -----------------------------------------------------------------------
      case 0x24: case 0x25: case 0x26: {
        const dst = defReg(0, IRType.PTR); // result lands in pseudo-reg 0 (MOVE_RESULT expected)
        const i = mkInstr(IROpcode.CALL_INDIRECT, dst, [], { imm: 1 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x27 THROW → CALL_INDIRECT stub index 4 (art_throw)
      // -----------------------------------------------------------------------
      case 0x27: {
        const exc = getReg(byteA, IRType.PTR);
        return mkInstr(IROpcode.CALL_INDIRECT, null, [exc], { imm: 4 });
      }

      // -----------------------------------------------------------------------
      // 0x28 GOTO/8
      // -----------------------------------------------------------------------
      case 0x28: {
        const off = signExtend(byteA, 8);
        return mkInstr(IROpcode.BR, null, [], { branchTarget: pc + off });
      }

      // -----------------------------------------------------------------------
      // 0x29 GOTO/16
      // -----------------------------------------------------------------------
      case 0x29: {
        // offset in next word; pass 0 as placeholder — caller must patch
        return mkInstr(IROpcode.BR, null, [], { branchTarget: 0 });
      }

      // -----------------------------------------------------------------------
      // 0x2a GOTO/32
      // -----------------------------------------------------------------------
      case 0x2a:
        return mkInstr(IROpcode.BR, null, [], { branchTarget: 0 });

      // -----------------------------------------------------------------------
      // 0x2b PACKED_SWITCH / 0x2c SPARSE_SWITCH → BR_TABLE
      // -----------------------------------------------------------------------
      case 0x2b: case 0x2c: {
        const reg = getReg(byteA);
        return mkInstr(IROpcode.BR_TABLE, null, [reg]);
      }

      // -----------------------------------------------------------------------
      // 0x2d–0x31 CMP variants
      // -----------------------------------------------------------------------
      case 0x2d: case 0x2e: case 0x2f: case 0x30: case 0x31: {
        // 23x format — all three regs in byteA (dest) and the next word
        const dst = defReg(byteA);
        const i = mkInstr(IROpcode.CMP, dst, []);
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x32–0x37 IF_EQ/NE/LT/GE/GT/LE  (2-reg)
      // -----------------------------------------------------------------------
      case 0x32: {
        const a = getReg(nibA); const b = getReg(nibB);
        return mkInstr(IROpcode.BR_IF, null, [a, b], { imm: 0 /* EQ */, branchTarget: 0 });
      }
      case 0x33: {
        const a = getReg(nibA); const b = getReg(nibB);
        return mkInstr(IROpcode.BR_IF, null, [a, b], { imm: 1 /* NE */, branchTarget: 0 });
      }
      case 0x34: {
        const a = getReg(nibA); const b = getReg(nibB);
        return mkInstr(IROpcode.BR_IF, null, [a, b], { imm: 2 /* LT */, branchTarget: 0 });
      }
      case 0x35: {
        const a = getReg(nibA); const b = getReg(nibB);
        return mkInstr(IROpcode.BR_IF, null, [a, b], { imm: 3 /* GE */, branchTarget: 0 });
      }
      case 0x36: {
        const a = getReg(nibA); const b = getReg(nibB);
        return mkInstr(IROpcode.BR_IF, null, [a, b], { imm: 4 /* GT */, branchTarget: 0 });
      }
      case 0x37: {
        const a = getReg(nibA); const b = getReg(nibB);
        return mkInstr(IROpcode.BR_IF, null, [a, b], { imm: 5 /* LE */, branchTarget: 0 });
      }

      // -----------------------------------------------------------------------
      // 0x38–0x3d IF_EQZ/NEZ/LTZ/GEZ/GTZ/LEZ  (1-reg vs zero)
      // -----------------------------------------------------------------------
      case 0x38: {
        const a = getReg(byteA);
        return mkInstr(IROpcode.BR_IF, null, [a], { imm: 0 /* EQ zero */, branchTarget: 0 });
      }
      case 0x39: {
        const a = getReg(byteA);
        return mkInstr(IROpcode.BR_IF, null, [a], { imm: 1 /* NE zero */, branchTarget: 0 });
      }
      case 0x3a: {
        const a = getReg(byteA);
        return mkInstr(IROpcode.BR_IF, null, [a], { imm: 2 /* LT zero */, branchTarget: 0 });
      }
      case 0x3b: {
        const a = getReg(byteA);
        return mkInstr(IROpcode.BR_IF, null, [a], { imm: 3 /* GE zero */, branchTarget: 0 });
      }
      case 0x3c: {
        const a = getReg(byteA);
        return mkInstr(IROpcode.BR_IF, null, [a], { imm: 4 /* GT zero */, branchTarget: 0 });
      }
      case 0x3d: {
        const a = getReg(byteA);
        return mkInstr(IROpcode.BR_IF, null, [a], { imm: 5 /* LE zero */, branchTarget: 0 });
      }

      // -----------------------------------------------------------------------
      // 0x44–0x51 AGET/APUT variants → LOAD/STORE with bounds check stub 5
      // -----------------------------------------------------------------------
      // AGET variants (0x44–0x49): dest=nibA, array=nibB (next word: index)
      case 0x44: case 0x45: case 0x46: case 0x47: case 0x48: case 0x49: {
        const arr = getReg(nibB, IRType.PTR);
        // Emit bounds check via stub 5 first
        mkInstr(IROpcode.CALL_INDIRECT, null, [arr], { imm: 5 });
        const dst = defReg(nibA, op === 0x47 || op === 0x48 ? IRType.I64 : IRType.I32);
        const i = mkInstr(IROpcode.LOAD32, dst, [arr], { memOffset: 0 });
        dst.defInstr = i.id;
        return i;
      }
      // APUT variants (0x4a–0x51)
      case 0x4a: case 0x4b: case 0x4c: case 0x4d: case 0x4e: case 0x4f:
      case 0x50: case 0x51: {
        const val = getReg(nibA);
        const arr = getReg(nibB, IRType.PTR);
        mkInstr(IROpcode.CALL_INDIRECT, null, [arr], { imm: 5 });
        return mkInstr(IROpcode.STORE32, null, [arr, val], { memOffset: 0 });
      }

      // -----------------------------------------------------------------------
      // 0x52–0x5f IGET/IPUT → LOAD32/STORE32 at field offset
      // -----------------------------------------------------------------------
      case 0x52: case 0x53: case 0x54: case 0x55: case 0x56: case 0x57: {
        // IGET: dest=nibA, obj=nibB, field index in next word
        const obj = getReg(nibB, IRType.PTR);
        const dst = defReg(nibA);
        const i = mkInstr(IROpcode.LOAD32, dst, [obj], { memOffset: 0 /* field offset resolved at link time */ });
        dst.defInstr = i.id;
        return i;
      }
      case 0x58: case 0x59: case 0x5a: case 0x5b: case 0x5c: case 0x5d:
      case 0x5e: case 0x5f: {
        // IPUT: src=nibA, obj=nibB
        const src = getReg(nibA);
        const obj = getReg(nibB, IRType.PTR);
        return mkInstr(IROpcode.STORE32, null, [obj, src], { memOffset: 0 });
      }

      // -----------------------------------------------------------------------
      // 0x60–0x69 SGET → LOAD32 at class static offset
      // -----------------------------------------------------------------------
      case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65:
      case 0x66: case 0x67: case 0x68: case 0x69: {
        const dst = defReg(byteA);
        const i = mkInstr(IROpcode.LOAD32, dst, [], { memOffset: 0 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x6a–0x6d SPUT → STORE32 at class static offset
      // -----------------------------------------------------------------------
      case 0x6a: case 0x6b: case 0x6c: case 0x6d: {
        const src = getReg(byteA);
        return mkInstr(IROpcode.STORE32, null, [src], { memOffset: 0 });
      }

      // -----------------------------------------------------------------------
      // 0x6e–0x72 INVOKE_* → CALL_INDIRECT via vtable
      // -----------------------------------------------------------------------
      case 0x6e: case 0x6f: case 0x70: case 0x71: case 0x72: {
        const dst = defReg(0, IRType.I32); // result captured by MOVE_RESULT
        const i = mkInstr(IROpcode.CALL_INDIRECT, dst, [], { imm: 6 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x74–0x78 INVOKE_*_RANGE → CALL_INDIRECT
      // -----------------------------------------------------------------------
      case 0x74: case 0x75: case 0x76: case 0x77: case 0x78: {
        const dst = defReg(0, IRType.I32);
        const i = mkInstr(IROpcode.CALL_INDIRECT, dst, [], { imm: 6 });
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x7b NEG_INT
      // -----------------------------------------------------------------------
      case 0x7b: {
        const src = getReg(nibB);
        const dst = defReg(nibA);
        const i = mkInstr(IROpcode.NEG, dst, [src]);
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x7c NOT_INT
      // -----------------------------------------------------------------------
      case 0x7c: {
        const src = getReg(nibB);
        const dst = defReg(nibA);
        const i = mkInstr(IROpcode.NOT, dst, [src]);
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x7d NEG_LONG
      // -----------------------------------------------------------------------
      case 0x7d: {
        const src = getReg(nibB, IRType.I64);
        const dst = defReg(nibA, IRType.I64);
        const i = mkInstr(IROpcode.NEG, dst, [src]);
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x7e NOT_LONG
      // -----------------------------------------------------------------------
      case 0x7e: {
        const src = getReg(nibB, IRType.I64);
        const dst = defReg(nibA, IRType.I64);
        const i = mkInstr(IROpcode.NOT, dst, [src]);
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x7f NEG_FLOAT
      // -----------------------------------------------------------------------
      case 0x7f: {
        const src = getReg(nibB, IRType.F32);
        const dst = defReg(nibA, IRType.F32);
        const i = mkInstr(IROpcode.NEG, dst, [src]);
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x80 NEG_DOUBLE
      // -----------------------------------------------------------------------
      case 0x80: {
        const src = getReg(nibB, IRType.F64);
        const dst = defReg(nibA, IRType.F64);
        const i = mkInstr(IROpcode.NEG, dst, [src]);
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x81–0x8f type conversions → MOV with type annotation
      // -----------------------------------------------------------------------
      case 0x81: case 0x82: case 0x83: case 0x84: case 0x85: case 0x86:
      case 0x87: case 0x88: case 0x89: case 0x8a: case 0x8b: case 0x8c:
      case 0x8d: case 0x8e: case 0x8f: {
        const dstType = this._convResultType(op);
        const srcType = this._convSourceType(op);
        const src = getReg(nibB, srcType);
        const dst = defReg(nibA, dstType);
        const i = mkInstr(IROpcode.MOV, dst, [src]);
        dst.defInstr = i.id;
        return i;
      }

      // -----------------------------------------------------------------------
      // 0x90–0x9a  int binary ops (23x)
      // -----------------------------------------------------------------------
      case 0x90: return this._binop3(IROpcode.ADD,   IRType.I32, insn, regs);
      case 0x91: return this._binop3(IROpcode.SUB,   IRType.I32, insn, regs);
      case 0x92: return this._binop3(IROpcode.MUL,   IRType.I32, insn, regs);
      case 0x93: return this._binop3(IROpcode.DIV_S, IRType.I32, insn, regs);
      case 0x94: return this._binop3(IROpcode.DIV_U, IRType.I32, insn, regs);
      case 0x95: return this._binop3(IROpcode.AND,   IRType.I32, insn, regs);
      case 0x96: return this._binop3(IROpcode.OR,    IRType.I32, insn, regs);
      case 0x97: return this._binop3(IROpcode.XOR,   IRType.I32, insn, regs);
      case 0x98: return this._binop3(IROpcode.SHL,   IRType.I32, insn, regs);
      case 0x99: return this._binop3(IROpcode.SHR_S, IRType.I32, insn, regs);
      case 0x9a: return this._binop3(IROpcode.SHR_U, IRType.I32, insn, regs);

      // -----------------------------------------------------------------------
      // 0x9b–0xa5  long binary ops (23x)
      // -----------------------------------------------------------------------
      case 0x9b: return this._binop3(IROpcode.ADD,   IRType.I64, insn, regs);
      case 0x9c: return this._binop3(IROpcode.SUB,   IRType.I64, insn, regs);
      case 0x9d: return this._binop3(IROpcode.MUL,   IRType.I64, insn, regs);
      case 0x9e: return this._binop3(IROpcode.DIV_S, IRType.I64, insn, regs);
      case 0x9f: return this._binop3(IROpcode.DIV_U, IRType.I64, insn, regs);
      case 0xa0: return this._binop3(IROpcode.AND,   IRType.I64, insn, regs);
      case 0xa1: return this._binop3(IROpcode.OR,    IRType.I64, insn, regs);
      case 0xa2: return this._binop3(IROpcode.XOR,   IRType.I64, insn, regs);
      case 0xa3: return this._binop3(IROpcode.SHL,   IRType.I64, insn, regs);
      case 0xa4: return this._binop3(IROpcode.SHR_S, IRType.I64, insn, regs);
      case 0xa5: return this._binop3(IROpcode.SHR_U, IRType.I64, insn, regs);

      // -----------------------------------------------------------------------
      // 0xa6–0xaf  float/double binary ops (23x)
      // -----------------------------------------------------------------------
      case 0xa6: return this._binop3(IROpcode.ADD, IRType.F32, insn, regs);
      case 0xa7: return this._binop3(IROpcode.SUB, IRType.F32, insn, regs);
      case 0xa8: return this._binop3(IROpcode.MUL, IRType.F32, insn, regs);
      case 0xa9: return this._binop3(IROpcode.DIV, IRType.F32, insn, regs);
      // 0xaa REM_FLOAT
      case 0xaa: return this._binop3(IROpcode.DIV, IRType.F32, insn, regs);
      case 0xab: return this._binop3(IROpcode.ADD, IRType.F64, insn, regs);
      case 0xac: return this._binop3(IROpcode.SUB, IRType.F64, insn, regs);
      case 0xad: return this._binop3(IROpcode.MUL, IRType.F64, insn, regs);
      case 0xae: return this._binop3(IROpcode.DIV, IRType.F64, insn, regs);
      // 0xaf REM_DOUBLE
      case 0xaf: return this._binop3(IROpcode.DIV, IRType.F64, insn, regs);

      // -----------------------------------------------------------------------
      // 0xb0–0xcf  2-addr variants (12x)
      // -----------------------------------------------------------------------
      case 0xb0: return this._binop2addr(IROpcode.ADD,   IRType.I32, insn, regs);
      case 0xb1: return this._binop2addr(IROpcode.SUB,   IRType.I32, insn, regs);
      case 0xb2: return this._binop2addr(IROpcode.MUL,   IRType.I32, insn, regs);
      case 0xb3: return this._binop2addr(IROpcode.DIV_S, IRType.I32, insn, regs);
      case 0xb4: return this._binop2addr(IROpcode.DIV_U, IRType.I32, insn, regs);
      case 0xb5: return this._binop2addr(IROpcode.AND,   IRType.I32, insn, regs);
      case 0xb6: return this._binop2addr(IROpcode.OR,    IRType.I32, insn, regs);
      case 0xb7: return this._binop2addr(IROpcode.XOR,   IRType.I32, insn, regs);
      case 0xb8: return this._binop2addr(IROpcode.SHL,   IRType.I32, insn, regs);
      case 0xb9: return this._binop2addr(IROpcode.SHR_S, IRType.I32, insn, regs);
      case 0xba: return this._binop2addr(IROpcode.SHR_U, IRType.I32, insn, regs);
      // long 2-addr
      case 0xbb: return this._binop2addr(IROpcode.ADD,   IRType.I64, insn, regs);
      case 0xbc: return this._binop2addr(IROpcode.SUB,   IRType.I64, insn, regs);
      case 0xbd: return this._binop2addr(IROpcode.MUL,   IRType.I64, insn, regs);
      case 0xbe: return this._binop2addr(IROpcode.DIV_S, IRType.I64, insn, regs);
      case 0xbf: return this._binop2addr(IROpcode.DIV_U, IRType.I64, insn, regs);
      case 0xc0: return this._binop2addr(IROpcode.AND,   IRType.I64, insn, regs);
      case 0xc1: return this._binop2addr(IROpcode.OR,    IRType.I64, insn, regs);
      case 0xc2: return this._binop2addr(IROpcode.XOR,   IRType.I64, insn, regs);
      case 0xc3: return this._binop2addr(IROpcode.SHL,   IRType.I64, insn, regs);
      case 0xc4: return this._binop2addr(IROpcode.SHR_S, IRType.I64, insn, regs);
      case 0xc5: return this._binop2addr(IROpcode.SHR_U, IRType.I64, insn, regs);
      // float/double 2-addr
      case 0xc6: return this._binop2addr(IROpcode.ADD, IRType.F32, insn, regs);
      case 0xc7: return this._binop2addr(IROpcode.SUB, IRType.F32, insn, regs);
      case 0xc8: return this._binop2addr(IROpcode.MUL, IRType.F32, insn, regs);
      case 0xc9: return this._binop2addr(IROpcode.DIV, IRType.F32, insn, regs);
      case 0xca: return this._binop2addr(IROpcode.DIV, IRType.F32, insn, regs); // REM_FLOAT/2addr
      case 0xcb: return this._binop2addr(IROpcode.ADD, IRType.F64, insn, regs);
      case 0xcc: return this._binop2addr(IROpcode.SUB, IRType.F64, insn, regs);
      case 0xcd: return this._binop2addr(IROpcode.MUL, IRType.F64, insn, regs);
      case 0xce: return this._binop2addr(IROpcode.DIV, IRType.F64, insn, regs);
      case 0xcf: return this._binop2addr(IROpcode.DIV, IRType.F64, insn, regs); // REM_DOUBLE/2addr

      // -----------------------------------------------------------------------
      // 0xd0–0xd7  int/lit16 variants (22s: vAA, vBB, #+CCCC)
      // -----------------------------------------------------------------------
      case 0xd0: return this._binopLit(IROpcode.ADD,   IRType.I32, insn, regs);
      case 0xd1: return this._binopLit(IROpcode.SUB,   IRType.I32, insn, regs); // RSUB (reversed sub)
      case 0xd2: return this._binopLit(IROpcode.MUL,   IRType.I32, insn, regs);
      case 0xd3: return this._binopLit(IROpcode.DIV_S, IRType.I32, insn, regs);
      case 0xd4: return this._binopLit(IROpcode.DIV_U, IRType.I32, insn, regs);
      case 0xd5: return this._binopLit(IROpcode.AND,   IRType.I32, insn, regs);
      case 0xd6: return this._binopLit(IROpcode.OR,    IRType.I32, insn, regs);
      case 0xd7: return this._binopLit(IROpcode.XOR,   IRType.I32, insn, regs);

      // -----------------------------------------------------------------------
      // 0xd8–0xe2  int/lit8 variants (22b: vAA, vBB, #+CC)
      // -----------------------------------------------------------------------
      case 0xd8: return this._binopLit(IROpcode.ADD,   IRType.I32, insn, regs);
      case 0xd9: return this._binopLit(IROpcode.SUB,   IRType.I32, insn, regs); // RSUB
      case 0xda: return this._binopLit(IROpcode.MUL,   IRType.I32, insn, regs);
      case 0xdb: return this._binopLit(IROpcode.DIV_S, IRType.I32, insn, regs);
      case 0xdc: return this._binopLit(IROpcode.DIV_U, IRType.I32, insn, regs);
      case 0xdd: return this._binopLit(IROpcode.AND,   IRType.I32, insn, regs);
      case 0xde: return this._binopLit(IROpcode.OR,    IRType.I32, insn, regs);
      case 0xdf: return this._binopLit(IROpcode.XOR,   IRType.I32, insn, regs);
      case 0xe0: return this._binopLit(IROpcode.SHL,   IRType.I32, insn, regs);
      case 0xe1: return this._binopLit(IROpcode.SHR_S, IRType.I32, insn, regs);
      case 0xe2: return this._binopLit(IROpcode.SHR_U, IRType.I32, insn, regs);

      // -----------------------------------------------------------------------
      // All other opcodes → NOP
      // -----------------------------------------------------------------------
      default:
        return mkInstr(IROpcode.NOP, null, []);
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** 3-register binary operation (23x format): dest=byteA, src1/src2 in next word */
  private _binop3(
    opcode: IROpcode,
    type: IRType,
    insn: number,
    regs: Map<number, SSAValue>
  ): SSAInstruction {
    const byteA = (insn >> 8) & 0xff;
    // In 23x, src regs are in the second word which we don't have here.
    // We emit with byteA as both src (placeholder) and def as dest.
    const src1 = this._getOrCreate(regs, byteA, type);
    const src2 = this._getOrCreate(regs, byteA, type);
    const dst = mkValue(type, _nextInstrId);
    regs.set(byteA, dst);
    const i = mkInstr(opcode, dst, [use(src1), use(src2)]);
    dst.defInstr = i.id;
    return i;
  }

  /** 2-address binary op (12x format): dest/src1=nibA, src2=nibB */
  private _binop2addr(
    opcode: IROpcode,
    type: IRType,
    insn: number,
    regs: Map<number, SSAValue>
  ): SSAInstruction {
    const nibA = (insn >> 8) & 0x0f;
    const nibB = (insn >> 12) & 0x0f;
    const src1 = this._getOrCreate(regs, nibA, type);
    const src2 = this._getOrCreate(regs, nibB, type);
    const dst = mkValue(type, _nextInstrId);
    regs.set(nibA, dst);
    const i = mkInstr(opcode, dst, [use(src1), use(src2)]);
    dst.defInstr = i.id;
    return i;
  }

  /** Literal binary op (22s/22b): dest=nibA, src=nibB, imm from second word */
  private _binopLit(
    opcode: IROpcode,
    type: IRType,
    insn: number,
    regs: Map<number, SSAValue>
  ): SSAInstruction {
    const nibA = (insn >> 8) & 0x0f;
    const nibB = (insn >> 12) & 0x0f;
    const src = this._getOrCreate(regs, nibB, type);
    const dst = mkValue(type, _nextInstrId);
    regs.set(nibA, dst);
    // imm value comes from the following word; pass 0 as placeholder
    const immVal: SSAValue = mkValue(type, -1);
    const i = mkInstr(opcode, dst, [use(src), use(immVal)], { imm: 0 });
    dst.defInstr = i.id;
    return i;
  }

  private _getOrCreate(regs: Map<number, SSAValue>, reg: number, type: IRType): SSAValue {
    if (!regs.has(reg)) {
      regs.set(reg, mkValue(type, -1));
    }
    return regs.get(reg)!;
  }

  /** Determine SSA result type of a conversion opcode 0x81–0x8f */
  private _convResultType(op: number): IRType {
    // INT-TO-* (0x81=long, 0x82=float, 0x83=double)
    // LONG-TO-* (0x84=int, 0x85=float, 0x86=double)
    // FLOAT-TO-* (0x87=int, 0x88=long, 0x89=double)
    // DOUBLE-TO-* (0x8a=int, 0x8b=long, 0x8c=float)
    // INT-TO-BYTE/CHAR/SHORT (0x8d, 0x8e, 0x8f)
    switch (op) {
      case 0x81: return IRType.I64;
      case 0x82: return IRType.F32;
      case 0x83: return IRType.F64;
      case 0x84: return IRType.I32;
      case 0x85: return IRType.F32;
      case 0x86: return IRType.F64;
      case 0x87: return IRType.I32;
      case 0x88: return IRType.I64;
      case 0x89: return IRType.F64;
      case 0x8a: return IRType.I32;
      case 0x8b: return IRType.I64;
      case 0x8c: return IRType.F32;
      case 0x8d: case 0x8e: case 0x8f: return IRType.I32;
      default: return IRType.I32;
    }
  }

  private _convSourceType(op: number): IRType {
    if (op <= 0x83) return IRType.I32;
    if (op <= 0x86) return IRType.I64;
    if (op <= 0x89) return IRType.F32;
    if (op <= 0x8c) return IRType.F64;
    return IRType.I32;
  }

  /** Returns the word-length of the Dalvik instruction at `pc` */
  private _opcodeWordLength(op: number, insns: Uint16Array, pc: number, startPc: number): number {
    // Lengths by opcode (in 16-bit code units)
    // Reference: https://source.android.com/docs/core/runtime/dalvik-bytecode
    switch (op) {
      // 1-unit instructions
      case 0x00: case 0x01: case 0x04: case 0x07:
      case 0x0a: case 0x0b: case 0x0c:
      case 0x0e: case 0x0f: case 0x10: case 0x11:
      case 0x12:
      case 0x1d: case 0x1e:
      case 0x21:
      case 0x27: case 0x28:
      case 0x7b: case 0x7c: case 0x7d: case 0x7e:
      case 0x7f: case 0x80:
      case 0x81: case 0x82: case 0x83: case 0x84: case 0x85: case 0x86:
      case 0x87: case 0x88: case 0x89: case 0x8a: case 0x8b: case 0x8c:
      case 0x8d: case 0x8e: case 0x8f:
      case 0xb0: case 0xb1: case 0xb2: case 0xb3: case 0xb4: case 0xb5:
      case 0xb6: case 0xb7: case 0xb8: case 0xb9: case 0xba: case 0xbb:
      case 0xbc: case 0xbd: case 0xbe: case 0xbf: case 0xc0: case 0xc1:
      case 0xc2: case 0xc3: case 0xc4: case 0xc5: case 0xc6: case 0xc7:
      case 0xc8: case 0xc9: case 0xca: case 0xcb: case 0xcc: case 0xcd:
      case 0xce: case 0xcf:
        return 1;

      // 2-unit instructions
      case 0x02: case 0x05: case 0x08:
      case 0x13: case 0x15:
      case 0x16: case 0x19:
      case 0x1a: case 0x1c:
      case 0x1f: case 0x20:
      case 0x22: case 0x23:
      case 0x29:
      case 0x2b: case 0x2c: // 2 units for the instruction + payload pointer
      case 0x31: // cmpl-double (23x is 2 words but dalvik uses 2 code units for 23x)
      case 0x32: case 0x33: case 0x34: case 0x35: case 0x36: case 0x37:
      case 0x38: case 0x39: case 0x3a: case 0x3b: case 0x3c: case 0x3d:
      case 0x44: case 0x45: case 0x46: case 0x47: case 0x48: case 0x49:
      case 0x4a: case 0x4b: case 0x4c: case 0x4d: case 0x4e: case 0x4f:
      case 0x50: case 0x51:
      case 0x52: case 0x53: case 0x54: case 0x55: case 0x56: case 0x57:
      case 0x58: case 0x59: case 0x5a: case 0x5b: case 0x5c: case 0x5d:
      case 0x5e: case 0x5f:
      case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65:
      case 0x66: case 0x67: case 0x68: case 0x69:
      case 0x6a: case 0x6b: case 0x6c: case 0x6d:
      case 0x2d: case 0x2e: case 0x2f: case 0x30:
      case 0x90: case 0x91: case 0x92: case 0x93: case 0x94: case 0x95:
      case 0x96: case 0x97: case 0x98: case 0x99: case 0x9a:
      case 0x9b: case 0x9c: case 0x9d: case 0x9e: case 0x9f:
      case 0xa0: case 0xa1: case 0xa2: case 0xa3: case 0xa4: case 0xa5:
      case 0xa6: case 0xa7: case 0xa8: case 0xa9: case 0xaa:
      case 0xab: case 0xac: case 0xad: case 0xae: case 0xaf:
      case 0xd0: case 0xd1: case 0xd2: case 0xd3: case 0xd4: case 0xd5:
      case 0xd6: case 0xd7:
      case 0xd8: case 0xd9: case 0xda: case 0xdb: case 0xdc: case 0xdd:
      case 0xde: case 0xdf: case 0xe0: case 0xe1: case 0xe2:
        return 2;

      // 3-unit instructions
      case 0x03: case 0x06: case 0x09:
      case 0x14: case 0x17:
      case 0x1b:
      case 0x24: case 0x25:
      case 0x2a:
      case 0x6e: case 0x6f: case 0x70: case 0x71: case 0x72:
      case 0x74: case 0x75: case 0x76: case 0x77: case 0x78:
        return 3;

      // 5-unit instructions (CONST_WIDE 0x18)
      case 0x18:
        return 5;

      // FILLED_NEW_ARRAY/RANGE 0x26 — 3 units
      case 0x26:
        return 3;

      default:
        return 1;
    }
  }

  /** Collect switch-payload branch targets into `leaders` set */
  private _collectSwitchTargets(
    op: number,
    insns: Uint16Array,
    pc: number,
    startPc: number,
    payOff: number,
    leaders: Set<number>
  ): void {
    const payIdx = pc - startPc + payOff;
    if (payIdx < 0 || payIdx >= insns.length) return;

    if (op === 0x2b) {
      // packed-switch payload: ident(2), size(2), first_key(2), targets(size*2 words)
      // ident at [payIdx] should be 0x0100
      const size = insns[payIdx + 1];
      for (let i = 0; i < size; i++) {
        const lo = insns[payIdx + 4 + i * 2];
        const hi = insns[payIdx + 4 + i * 2 + 1];
        const off = (hi << 16) | lo;
        const target = pc + off;
        if (target >= startPc) leaders.add(target);
      }
    } else {
      // sparse-switch payload: ident(2), size(2), keys(size*2 words), targets(size*2 words)
      const size = insns[payIdx + 1];
      const targBase = payIdx + 2 + size * 2;
      for (let i = 0; i < size; i++) {
        const lo = insns[targBase + i * 2];
        const hi = insns[targBase + i * 2 + 1];
        const off = (hi << 16) | lo;
        const target = pc + off;
        if (target >= startPc) leaders.add(target);
      }
    }
  }

  /** After emitting an instruction, update the register map with any new def */
  private _updateRegsFromInstr(
    op: number,
    raw: number,
    insns: Uint16Array,
    pc: number,
    startPc: number,
    regs: Map<number, SSAValue>,
    instr: SSAInstruction
  ): void {
    if (instr.result !== null) {
      // The defReg() calls inside translateOpcode already updated regs.
      // No additional work needed here for normal defs.
    }
    // For MOVE_RESULT (0x0a-0x0c) the result was already placed in the regs map.
    void op; void raw; void insns; void pc; void startPc;
  }

  /** Wire successor block edges and patch branch targets onto instructions */
  private _wireSuccessors(
    op: number,
    raw: number,
    insns: Uint16Array,
    pc: number,
    startPc: number,
    blkId: number,
    block: SSABlock,
    blocks: Map<number, SSABlock>,
    blockOf: (pc: number) => number,
    end: number,
    wordLen: number
  ): void {
    const addSucc = (target: number) => {
      if (target < startPc || target >= end) return;
      const tid = blockOf(target);
      if (!block.successors.includes(tid)) block.successors.push(tid);
    };

    const fallthrough = pc + wordLen;

    switch (op) {
      case 0x28: {
        const off = signExtend((raw >> 8) & 0xff, 8);
        addSucc(pc + off);
        // patch last instruction's branchTarget
        const last = block.instructions[block.instructions.length - 1];
        if (last) last.branchTarget = blockOf(pc + off);
        break;
      }
      case 0x29: {
        const off = signExtend(insns[pc - startPc + 1], 16);
        addSucc(pc + off);
        const last = block.instructions[block.instructions.length - 1];
        if (last) last.branchTarget = blockOf(pc + off);
        break;
      }
      case 0x2a: {
        const lo = insns[pc - startPc + 1];
        const hi = insns[pc - startPc + 2];
        const off = (hi << 16) | lo;
        addSucc(pc + off);
        const last = block.instructions[block.instructions.length - 1];
        if (last) last.branchTarget = blockOf(pc + off);
        break;
      }
      case 0x2b: case 0x2c: {
        const payOff = (insns[pc - startPc + 2] << 16) | insns[pc - startPc + 1];
        const leaders = new Set<number>();
        this._collectSwitchTargets(op, insns, pc, startPc, payOff, leaders);
        for (const t of leaders) addSucc(t);
        addSucc(fallthrough);
        break;
      }
      case 0x32: case 0x33: case 0x34: case 0x35: case 0x36: case 0x37:
      case 0x38: case 0x39: case 0x3a: case 0x3b: case 0x3c: case 0x3d: {
        const off = signExtend(insns[pc - startPc + 1], 16);
        const taken = pc + off;
        addSucc(taken);
        addSucc(fallthrough);
        const last = block.instructions[block.instructions.length - 1];
        if (last) last.branchTarget = blockOf(taken);
        break;
      }
      case 0x0e: case 0x0f: case 0x10: case 0x11:
        // no successors for return
        break;
      case 0x27:
        // throw — no normal successor
        break;
      default:
        // fall through to next block if it exists
        if (fallthrough < end) addSucc(fallthrough);
        break;
    }

    void raw; void blkId;
  }
}
