/**
 * x86 Protected-Mode Interpreter for Abyss Engine
 * 32-bit protected-mode with full ModR/M + SIB decoding
 * ~230 opcodes, REP prefixes, flag computation, interrupt/syscall callbacks
 */

export type OpSize = 1 | 2 | 4;

const CF = 0x0001, PF = 0x0004, AF = 0x0010, ZF = 0x0040;
const SF = 0x0080, TF = 0x0100, IF = 0x0200, DF = 0x0400, OF = 0x0800;

const EAX = 0, ECX = 1, EDX = 2, EBX = 3, ESP = 4, EBP = 5, ESI = 6, EDI = 7;
const ES = 0, CS = 1, SS = 2, DS = 3, FS = 4, GS = 5;

const SEG_OVERRIDE: Record<number, number> = {
  0x26: ES, 0x2E: CS, 0x36: SS, 0x3E: DS, 0x64: FS, 0x65: GS,
};

const MEM_SIZE = 256 * 1024 * 1024;

export interface X86Callbacks {
  onInterrupt?(cpu: X86Interpreter, intNum: number): void;
  onSyscall?(cpu: X86Interpreter, sysNum: number): void;
  onPortRead?(port: number, size: OpSize): number;
  onPortWrite?(port: number, value: number, size: OpSize): void;
}

export class X86Interpreter {
  regs: Int32Array;
  segs: Uint16Array;
  eflags: number;
  eip: number;
  halted: boolean;
  mem: Uint8Array;
  mem16: Uint16Array;
  mem32: Int32Array;
  private callbacks: X86Callbacks;
  private segOverride: number;
  private repPrefix: number;
  private effectiveAddr: number = 0;
  private modrmReg: number = 0;
  private modRMisReg: boolean = false;

  constructor(callbacks: X86Callbacks = {}, memSize = MEM_SIZE) {
    this.regs = new Int32Array(8);
    this.segs = new Uint16Array(6);
    this.eflags = IF;
    this.eip = 0;
    this.halted = false;
    this.callbacks = callbacks;
    this.segOverride = -1;
    this.repPrefix = 0;
    const buffer = new ArrayBuffer(memSize);
    this.mem = new Uint8Array(buffer);
    this.mem16 = new Uint16Array(buffer);
    this.mem32 = new Int32Array(buffer);
  }

  read8(a: number): number { return this.mem[a >>> 0]; }
  read16(a: number): number { return this.mem16[a >>> 1]; }
  read32(a: number): number { return this.mem32[a >>> 2]; }
  write8(a: number, v: number): void { this.mem[a >>> 0] = v & 0xFF; }
  write16(a: number, v: number): void { this.mem16[a >>> 1] = v & 0xFFFF; }
  write32(a: number, v: number): void { this.mem32[a >>> 2] = v | 0; }

  readMem(a: number, s: OpSize): number {
    return s === 1 ? this.read8(a) : s === 2 ? this.read16(a) : this.read32(a);
  }
  writeMem(a: number, v: number, s: OpSize): void {
    if (s === 1) this.write8(a, v); else if (s === 2) this.write16(a, v); else this.write32(a, v);
  }

  private fetch8(): number { const v = this.read8(this.eip); this.eip = (this.eip + 1) >>> 0; return v; }
  private fetch16(): number { const v = this.read16(this.eip); this.eip = (this.eip + 2) >>> 0; return v; }
  private fetch32(): number { const v = this.read32(this.eip); this.eip = (this.eip + 4) >>> 0; return v; }
  private fetchImm(s: OpSize): number { return s === 1 ? this.fetch8() : s === 2 ? this.fetch16() : this.fetch32(); }

  push32(v: number): void { this.regs[ESP] = (this.regs[ESP] - 4) | 0; this.write32(this.regs[ESP] >>> 0, v); }
  pop32(): number { const v = this.read32(this.regs[ESP] >>> 0); this.regs[ESP] = (this.regs[ESP] + 4) | 0; return v; }
  push16(v: number): void { this.regs[ESP] = (this.regs[ESP] - 2) | 0; this.write16(this.regs[ESP] >>> 0, v); }
  pop16(): number { const v = this.read16(this.regs[ESP] >>> 0); this.regs[ESP] = (this.regs[ESP] + 2) | 0; return v; }

  pushVal(v: number, s: OpSize): void { if (s === 2) this.push16(v); else this.push32(v); }
  popVal(s: OpSize): number { return s === 2 ? this.pop16() : this.pop32(); }

  getFlag(m: number): boolean { return (this.eflags & m) !== 0; }
  setFlag(m: number, on: boolean): void { if (on) this.eflags |= m; else this.eflags &= ~m; }

  private parity(v: number): boolean {
    let b = v & 0xFF; b ^= b >> 4; b ^= b >> 2; b ^= b >> 1; return (b & 1) === 0;
  }

  updateFlagsResult(r: number, s: OpSize): void {
    const mask = s === 1 ? 0xFF : s === 2 ? 0xFFFF : 0xFFFFFFFF;
    const v = r & mask;
    this.setFlag(ZF, v === 0);
    this.setFlag(SF, !!(v & (s === 1 ? 0x80 : s === 2 ? 0x8000 : 0x80000000)));
    this.setFlag(PF, this.parity(v));
  }

  updateFlagsAdd(a: number, b: number, r: number, s: OpSize): void {
    const mask = s === 1 ? 0xFF : s === 2 ? 0xFFFF : 0xFFFFFFFF;
    const sb = s === 1 ? 0x80 : s === 2 ? 0x8000 : 0x80000000;
    this.updateFlagsResult(r, s);
    this.setFlag(CF, (r & ~mask) !== 0);
    this.setFlag(AF, ((a ^ b ^ r) & 0x10) !== 0);
    this.setFlag(OF, !!((a ^ r) & (b ^ r) & sb));
  }

  updateFlagsSub(a: number, b: number, r: number, s: OpSize): void {
    const mask = s === 1 ? 0xFF : s === 2 ? 0xFFFF : 0xFFFFFFFF;
    const sb = s === 1 ? 0x80 : s === 2 ? 0x8000 : 0x80000000;
    this.updateFlagsResult(r, s);
    this.setFlag(CF, (a & mask) < (b & mask));
    this.setFlag(AF, ((a ^ b ^ r) & 0x10) !== 0);
    this.setFlag(OF, !!((a ^ b) & (a ^ r) & sb));
  }

  updateFlagsLogic(r: number, s: OpSize): void {
    this.updateFlagsResult(r, s);
    this.setFlag(CF, false); this.setFlag(OF, false); this.setFlag(AF, false);
  }

  getReg8(i: number): number {
    return i < 4 ? this.regs[i] & 0xFF : (this.regs[i - 4] >>> 8) & 0xFF;
  }
  setReg8(i: number, v: number): void {
    if (i < 4) this.regs[i] = (this.regs[i] & 0xFFFFFF00) | (v & 0xFF);
    else this.regs[i - 4] = (this.regs[i - 4] & 0xFFFF00FF) | ((v & 0xFF) << 8);
  }

  getReg(i: number, s: OpSize): number {
    if (s === 1) return this.getReg8(i);
    if (s === 2) return this.regs[i] & 0xFFFF;
    return this.regs[i];
  }
  setReg(i: number, v: number, s: OpSize): void {
    if (s === 1) { this.setReg8(i, v); return; }
    if (s === 2) { this.regs[i] = (this.regs[i] & 0xFFFF0000) | (v & 0xFFFF); return; }
    this.regs[i] = v | 0;
  }

  decodeModRM(as_: OpSize): void {
    const modrm = this.fetch8();
    const mod = (modrm >>> 6) & 3;
    this.modrmReg = (modrm >>> 3) & 7;
    const rm = modrm & 7;
    if (mod === 3) { this.modRMisReg = true; this.effectiveAddr = rm; return; }
    this.modRMisReg = false;
    let addr: number;
    if (as_ === 4) {
      if (rm === 4) { addr = this.decodeSIB(mod); }
      else if (rm === 5 && mod === 0) { addr = this.fetch32() >>> 0; }
      else { addr = this.regs[rm] >>> 0; }
      if (mod === 1) addr = (addr + ((this.fetch8() << 24) >> 24)) >>> 0;
      else if (mod === 2) addr = (addr + this.fetch32()) >>> 0;
    } else {
      switch (rm) {
        case 0: addr = (this.regs[EBX] + this.regs[ESI]) & 0xFFFF; break;
        case 1: addr = (this.regs[EBX] + this.regs[EDI]) & 0xFFFF; break;
        case 2: addr = (this.regs[EBP] + this.regs[ESI]) & 0xFFFF; break;
        case 3: addr = (this.regs[EBP] + this.regs[EDI]) & 0xFFFF; break;
        case 4: addr = this.regs[ESI] & 0xFFFF; break;
        case 5: addr = this.regs[EDI] & 0xFFFF; break;
        case 6: addr = mod === 0 ? this.fetch16() : this.regs[EBP] & 0xFFFF; break;
        case 7: addr = this.regs[EBX] & 0xFFFF; break;
        default: addr = 0;
      }
      if (mod === 1) addr = (addr + ((this.fetch8() << 24) >> 24)) & 0xFFFF;
      else if (mod === 2) addr = (addr + this.fetch16()) & 0xFFFF;
    }
    this.effectiveAddr = addr >>> 0;
  }

  private decodeSIB(mod: number): number {
    const sib = this.fetch8();
    const scale = (sib >>> 6) & 3;
    const index = (sib >>> 3) & 7;
    const base = sib & 7;
    const baseVal = (base === 5 && mod === 0) ? this.fetch32() : this.regs[base];
    const indexVal = (index === 4) ? 0 : this.regs[index];
    return (baseVal + (indexVal << scale)) >>> 0;
  }

  getRMVal(s: OpSize): number {
    return this.modRMisReg ? this.getReg(this.effectiveAddr, s) : this.readMem(this.effectiveAddr, s);
  }
  setRMVal(v: number, s: OpSize): void {
    if (this.modRMisReg) this.setReg(this.effectiveAddr, v, s);
    else this.writeMem(this.effectiveAddr, v, s);
  }

  run(count: number): void {
    for (let i = 0; i < count && !this.halted; i++) this.step();
  }

  step(): void {
    this.segOverride = -1;
    this.repPrefix = 0;
    let os: OpSize = 4, as_: OpSize = 4;
    let loop = true;
    while (loop) {
      const b = this.fetch8();
      switch (b) {
        case 0xF0: break;
        case 0xF2: this.repPrefix = 0xF2; break;
        case 0xF3: this.repPrefix = 0xF3; break;
        case 0x66: os = 2; break;
        case 0x67: as_ = 2; break;
        case 0x26: case 0x2E: case 0x36: case 0x3E: case 0x64: case 0x65:
          this.segOverride = SEG_OVERRIDE[b]; break;
        default: this.eip--; loop = false; break;
      }
    }
    const op = this.fetch8();
    this.dispatch(op, os, as_);
  }

  private dispatch(op: number, os: OpSize, as_: OpSize): void {
    switch (op) {
      case 0x00: this.aluRmR(0, 1, as_); break;
      case 0x01: this.aluRmR(0, os, as_); break;
      case 0x02: this.aluRRm(0, 1, as_); break;
      case 0x03: this.aluRRm(0, os, as_); break;
      case 0x04: this.aluAlImm(0, 1); break;
      case 0x05: this.aluEaxImm(0, os); break;

      case 0x08: this.aluRmR(1, 1, as_); break;
      case 0x09: this.aluRmR(1, os, as_); break;
      case 0x0A: this.aluRRm(1, 1, as_); break;
      case 0x0B: this.aluRRm(1, os, as_); break;
      case 0x0C: this.aluAlImm(1, 1); break;
      case 0x0D: this.aluEaxImm(1, os); break;

      case 0x10: this.aluRmR(2, 1, as_); break;
      case 0x11: this.aluRmR(2, os, as_); break;
      case 0x12: this.aluRRm(2, 1, as_); break;
      case 0x13: this.aluRRm(2, os, as_); break;
      case 0x14: this.aluAlImm(2, 1); break;
      case 0x15: this.aluEaxImm(2, os); break;

      case 0x18: this.aluRmR(3, 1, as_); break;
      case 0x19: this.aluRmR(3, os, as_); break;
      case 0x1A: this.aluRRm(3, 1, as_); break;
      case 0x1B: this.aluRRm(3, os, as_); break;
      case 0x1C: this.aluAlImm(3, 1); break;
      case 0x1D: this.aluEaxImm(3, os); break;

      case 0x20: this.aluRmR(4, 1, as_); break;
      case 0x21: this.aluRmR(4, os, as_); break;
      case 0x22: this.aluRRm(4, 1, as_); break;
      case 0x23: this.aluRRm(4, os, as_); break;
      case 0x24: this.aluAlImm(4, 1); break;
      case 0x25: this.aluEaxImm(4, os); break;

      case 0x28: this.aluRmR(5, 1, as_); break;
      case 0x29: this.aluRmR(5, os, as_); break;
      case 0x2A: this.aluRRm(5, 1, as_); break;
      case 0x2B: this.aluRRm(5, os, as_); break;
      case 0x2C: this.aluAlImm(5, 1); break;
      case 0x2D: this.aluEaxImm(5, os); break;

      case 0x30: this.aluRmR(6, 1, as_); break;
      case 0x31: this.aluRmR(6, os, as_); break;
      case 0x32: this.aluRRm(6, 1, as_); break;
      case 0x33: this.aluRRm(6, os, as_); break;
      case 0x34: this.aluAlImm(6, 1); break;
      case 0x35: this.aluEaxImm(6, os); break;

      case 0x38: this.aluRmR(7, 1, as_); break;
      case 0x39: this.aluRmR(7, os, as_); break;
      case 0x3A: this.aluRRm(7, 1, as_); break;
      case 0x3B: this.aluRRm(7, os, as_); break;
      case 0x3C: this.aluAlImm(7, 1); break;
      case 0x3D: this.aluEaxImm(7, os); break;

      case 0x06: this.pushVal(this.segs[ES], os); break;
      case 0x07: this.segs[ES] = this.popVal(os) & 0xFFFF; break;
      case 0x0E: this.pushVal(this.segs[CS], os); break;
      case 0x16: this.pushVal(this.segs[SS], os); break;
      case 0x17: this.segs[SS] = this.popVal(os) & 0xFFFF; break;
      case 0x1E: this.pushVal(this.segs[DS], os); break;
      case 0x1F: this.segs[DS] = this.popVal(os) & 0xFFFF; break;

      case 0x27: break;
      case 0x2F: break;
      case 0x37: break;
      case 0x3F: break;

      case 0x40: case 0x41: case 0x42: case 0x43:
      case 0x44: case 0x45: case 0x46: case 0x47:
        this.incReg(op - 0x40, os); break;
      case 0x48: case 0x49: case 0x4A: case 0x4B:
      case 0x4C: case 0x4D: case 0x4E: case 0x4F:
        this.decReg(op - 0x48, os); break;

      case 0x50: case 0x51: case 0x52: case 0x53:
      case 0x54: case 0x55: case 0x56: case 0x57:
        this.pushVal(this.regs[op - 0x50], os); break;
      case 0x58: case 0x59: case 0x5A: case 0x5B:
      case 0x5C: case 0x5D: case 0x5E: case 0x5F:
        this.setReg(op - 0x58, this.popVal(os), os); break;

      case 0x60: { const t = this.regs[ESP]; for (let i = 0; i < 8; i++) this.push32(i === ESP ? t : this.regs[i]); break; }
      case 0x61: {
        const edi = this.pop32(), esi = this.pop32(), ebp = this.pop32(); this.pop32();
        const ebx = this.pop32(), edx = this.pop32(), ecx = this.pop32(), eax = this.pop32();
        this.regs[EAX] = eax; this.regs[ECX] = ecx; this.regs[EDX] = edx;
        this.regs[EBX] = ebx; this.regs[ESI] = esi; this.regs[EDI] = edi; break;
      }
      case 0x62: break;
      case 0x63: this.arpl(as_); break;

      case 0x68: this.pushVal(this.fetchImm(os), os); break;
      case 0x69: this.imulRmImm(os, as_, false); break;
      case 0x6A: this.pushVal((this.fetch8() << 24) >> 24, os); break;
      case 0x6B: this.imulRmImm(os, as_, true); break;

      case 0x70: this.jccShort(!this.getFlag(OF)); break;
      case 0x71: this.jccShort(!!this.getFlag(OF)); break;
      case 0x72: this.jccShort(!!this.getFlag(CF)); break;
      case 0x73: this.jccShort(!this.getFlag(CF)); break;
      case 0x74: this.jccShort(!!this.getFlag(ZF)); break;
      case 0x75: this.jccShort(!this.getFlag(ZF)); break;
      case 0x76: this.jccShort(!!(this.getFlag(CF) || this.getFlag(ZF))); break;
      case 0x77: this.jccShort(!(this.getFlag(CF) || this.getFlag(ZF))); break;
      case 0x78: this.jccShort(!!this.getFlag(SF)); break;
      case 0x79: this.jccShort(!this.getFlag(SF)); break;
      case 0x7A: this.jccShort(!!this.getFlag(PF)); break;
      case 0x7B: this.jccShort(!this.getFlag(PF)); break;
      case 0x7C: this.jccShort(this.getFlag(SF) !== this.getFlag(OF)); break;
      case 0x7D: this.jccShort(this.getFlag(SF) === this.getFlag(OF)); break;
      case 0x7E: this.jccShort(this.getFlag(SF) !== this.getFlag(OF) || this.getFlag(ZF)); break;
      case 0x7F: this.jccShort(this.getFlag(SF) === this.getFlag(OF) && !this.getFlag(ZF)); break;

      case 0x80: this.group1Imm(1, as_); break;
      case 0x81: this.group1Imm(os, as_); break;
      case 0x82: this.group1Imm(1, as_); break;
      case 0x83: this.group1Imm(os, as_, true); break;

      case 0x84: this.testRmR(1, as_); break;
      case 0x85: this.testRmR(os, as_); break;
      case 0x86: this.xchgRmR(1, as_); break;
      case 0x87: this.xchgRmR(os, as_); break;
      case 0x88: this.movRmR(1, as_); break;
      case 0x89: this.movRmR(os, as_); break;
      case 0x8A: this.movRRm(1, as_); break;
      case 0x8B: this.movRRm(os, as_); break;
      case 0x8C: this.movSregRm(as_); break;
      case 0x8D: this.lea(os, as_); break;
      case 0x8E: this.movRmSreg(as_); break;
      case 0x8F: this.popRm(os, as_); break;

      case 0x90: break;
      case 0x91: case 0x92: case 0x93:
      case 0x94: case 0x95: case 0x96: case 0x97: {
        const t = this.regs[EAX]; this.regs[EAX] = this.regs[op - 0x90]; this.regs[op - 0x90] = t; break;
      }

      case 0x98: if (os === 2) { this.regs[EAX] = (this.regs[EAX] & 0xFFFF0000) | ((this.regs[EAX] & 0xFF) << 24 >> 24 & 0xFFFF); }
                  else { this.regs[EDX] = (this.regs[EAX] & 0x80000000) ? 0xFFFFFFFF : 0; } break;
      case 0x99: if (os === 2) { this.regs[EDX] = (this.regs[EAX] & 0x8000) ? 0xFFFF : 0; }
                  else { this.regs[EDX] = (this.regs[EAX] & 0x80000000) ? 0xFFFFFFFF : 0; } break;
      case 0x9C: this.push32(this.eflags & 0x00FCFFFF); break;
      case 0x9D: this.eflags = (this.pop32() & 0x00FCFFFF) | (this.eflags & ~0x00FCFFFF); break;
      case 0x9E: this.saHF(); break;
      case 0x9F: this.laHF(); break;

      case 0xA0: { const a = this.fetch32(); this.setReg(0, this.read8(a), 1); break; }
      case 0xA1: this.setReg(EAX, this.readMem(this.fetch32(), os), os); break;
      case 0xA2: { const a = this.fetch32(); this.write8(a, this.getReg8(0)); break; }
      case 0xA3: this.writeMem(this.fetch32(), this.getReg(EAX, os), os); break;

      case 0xA4: this.stringOp(os, as_, 'movs'); break;
      case 0xA5: this.stringOp(os, as_, 'movs'); break;
      case 0xA6: this.stringOp(os, as_, 'cmps'); break;
      case 0xA7: this.stringOp(os, as_, 'cmps'); break;
      case 0xA8: { const r = (this.regs[EAX] & 0xFF) & this.fetch8(); this.updateFlagsLogic(r, 1); break; }
      case 0xA9: { const r = (os === 2 ? this.regs[EAX] & 0xFFFF : this.regs[EAX]) & this.fetchImm(os); this.updateFlagsLogic(r, os); break; }
      case 0xAA: this.stringOp(os, as_, 'stos'); break;
      case 0xAB: this.stringOp(os, as_, 'stos'); break;
      case 0xAC: this.stringOp(os, as_, 'lods'); break;
      case 0xAD: this.stringOp(os, as_, 'lods'); break;
      case 0xAE: this.stringOp(os, as_, 'scas'); break;
      case 0xAF: this.stringOp(os, as_, 'scas'); break;

      case 0xB0: case 0xB1: case 0xB2: case 0xB3:
      case 0xB4: case 0xB5: case 0xB6: case 0xB7:
        this.setReg8(op - 0xB0, this.fetch8()); break;
      case 0xB8: case 0xB9: case 0xBA: case 0xBB:
      case 0xBC: case 0xBD: case 0xBE: case 0xBF:
        this.setReg(op - 0xB8, this.fetchImm(os), os); break;

      case 0xC0: this.shiftGroup(1, as_, this.fetch8()); break;
      case 0xC1: this.shiftGroup(os, as_, this.fetch8()); break;
      case 0xC2: { const imm = this.fetch16(); this.eip = this.pop32(); this.regs[ESP] = (this.regs[ESP] + imm) | 0; break; }
      case 0xC3: this.eip = this.pop32(); break;
      case 0xC4: this.les(os, as_); break;
      case 0xC5: this.lds(os, as_); break;
      case 0xC6: this.movRmImm(1, as_); break;
      case 0xC7: this.movRmImm(os, as_); break;
      case 0xC8: {
        const fsz = this.fetch16(); const nst = this.fetch8();
        this.push32(this.regs[EBP]);
        if (nst > 0) { for (let i = 1; i < nst; i++) this.push32(this.read32((this.regs[EBP] - i * 4) >>> 0)); this.push32(this.regs[ESP]); }
        this.regs[EBP] = this.regs[ESP]; this.regs[ESP] = (this.regs[ESP] - fsz) | 0; break;
      }
      case 0xC9: this.regs[ESP] = this.regs[EBP]; this.regs[EBP] = this.pop32(); break;
      case 0xCA: { const imm = this.fetch16(); this.eip = this.pop32(); this.regs[ESP] = (this.regs[ESP] + imm) | 0; break; }
      case 0xCB: this.eip = this.pop32(); break;
      case 0xCC: this.callbacks.onInterrupt?.(this, 3); break;
      case 0xCD: {
        const n = this.fetch8();
        if (n === 0x80) this.callbacks.onSyscall?.(this, this.regs[EAX]);
        else this.callbacks.onInterrupt?.(this, n);
        break;
      }
      case 0xCE: this.callbacks.onInterrupt?.(this, 4); break;

      case 0xD0: this.shiftGroup(1, as_, 1); break;
      case 0xD1: this.shiftGroup(os, as_, 1); break;
      case 0xD2: this.shiftGroup(1, as_, this.regs[ECX] & 0x1F); break;
      case 0xD3: this.shiftGroup(os, as_, this.regs[ECX] & 0x1F); break;
      case 0xD4: this.fetch8(); break;
      case 0xD5: this.fetch8(); break;
      case 0xD6: break;
      case 0xD7: this.xlat(as_); break;

      case 0xE0: this.loopJcc(os, false, true, (this.fetch8() << 24) >> 24); break;
      case 0xE1: this.loopJcc(os, false, false, (this.fetch8() << 24) >> 24); break;
      case 0xE2: this.loopJcc(os, true, false, (this.fetch8() << 24) >> 24); break;
      case 0xE3: { const r = (this.fetch8() << 24) >> 24; if (os === 2 ? (this.regs[ECX] & 0xFFFF) === 0 : this.regs[ECX] === 0) this.eip = (this.eip + r) >>> 0; break; }
      case 0xE4: { const p = this.fetch8(); this.setReg8(0, this.callbacks.onPortRead?.(p, 1) ?? 0); break; }
      case 0xE5: { const p = this.fetch8(); this.setReg(EAX, this.callbacks.onPortRead?.(p, os) ?? 0, os); break; }
      case 0xE6: { const p = this.fetch8(); this.callbacks.onPortWrite?.(p, this.getReg8(0), 1); break; }
      case 0xE7: { const p = this.fetch8(); this.callbacks.onPortWrite?.(p, this.getReg(EAX, os), os); break; }
      case 0xE8: { const r = this.fetch32() | 0; this.push32(this.eip); this.eip = (this.eip + r) >>> 0; break; }
      case 0xE9: { const r = this.fetch32() | 0; this.eip = (this.eip + r) >>> 0; break; }
      case 0xEA: { this.fetch32(); this.fetch16(); break; }
      case 0xEB: { const r = (this.fetch8() << 24) >> 24; this.eip = (this.eip + r) >>> 0; break; }
      case 0xEC: this.setReg8(0, this.callbacks.onPortRead?.(this.regs[EDX] & 0xFFFF, 1) ?? 0); break;
      case 0xED: this.setReg(EAX, this.callbacks.onPortRead?.(this.regs[EDX] & 0xFFFF, os) ?? 0, os); break;
      case 0xEE: this.callbacks.onPortWrite?.(this.regs[EDX] & 0xFFFF, this.getReg8(0), 1); break;
      case 0xEF: this.callbacks.onPortWrite?.(this.regs[EDX] & 0xFFFF, this.getReg(EAX, os), os); break;

      case 0xF0: break;
      case 0xF1: break;
      case 0xF4: this.halted = true; break;
      case 0xF5: this.setFlag(CF, !this.getFlag(CF)); break;
      case 0xF6: this.group3(1, as_); break;
      case 0xF7: this.group3(os, as_); break;
      case 0xF8: this.setFlag(CF, false); break;
      case 0xF9: this.setFlag(CF, true); break;
      case 0xFA: this.setFlag(IF, false); break;
      case 0xFB: this.setFlag(IF, true); break;
      case 0xFC: this.setFlag(DF, false); break;
      case 0xFD: this.setFlag(DF, true); break;
      case 0xFE: this.incDecRm(1, as_); break;
      case 0xFF: this.groupFF(os, as_); break;

      case 0x0F: this.dispatch0F(os, as_); break;
      default: break;
    }
  }

  private aluExec(alu: number, a: number, b: number, size: OpSize): number {
    const mask = size === 1 ? 0xFF : size === 2 ? 0xFFFF : 0xFFFFFFFF;
    switch (alu) {
      case 0: { const r = (a + b) & mask; this.updateFlagsAdd(a, b, r, size); return r; }
      case 1: { const r = (a | b) & mask; this.updateFlagsLogic(r, size); return r; }
      case 2: { const c = this.getFlag(CF) ? 1 : 0; const r = (a + b + c) & mask; this.updateFlagsAdd(a, b + c, r, size); return r; }
      case 3: { const c = this.getFlag(CF) ? 1 : 0; const r = (a - b - c) & mask; this.updateFlagsSub(a, b + c, r, size); return r; }
      case 4: { const r = (a & b) & mask; this.updateFlagsLogic(r, size); return r; }
      case 5: { const r = (a - b) & mask; this.updateFlagsSub(a, b, r, size); return r; }
      case 6: { const r = (a ^ b) & mask; this.updateFlagsLogic(r, size); return r; }
      case 7: { this.updateFlagsSub(a, b, (a - b) & mask, size); return a; }
      default: return a;
    }
  }

  private aluRmR(alu: number, sz: OpSize, as_: OpSize): void {
    this.decodeModRM(as_); this.setRMVal(this.aluExec(alu, this.getRMVal(sz), this.getReg(this.modrmReg, sz), sz), sz);
  }
  private aluRRm(alu: number, sz: OpSize, as_: OpSize): void {
    this.decodeModRM(as_); this.setReg(this.modrmReg, this.aluExec(alu, this.getReg(this.modrmReg, sz), this.getRMVal(sz), sz), sz);
  }
  private aluAlImm(alu: number, sz: OpSize): void {
    const a = this.regs[EAX] & (sz === 1 ? 0xFF : 0xFFFF);
    const r = this.aluExec(alu, a, this.fetchImm(sz), sz);
    if (alu !== 7) { if (sz === 1) this.setReg8(0, r); else this.regs[EAX] = (this.regs[EAX] & 0xFFFF0000) | (r & 0xFFFF); }
  }
  private aluEaxImm(alu: number, sz: OpSize): void {
    const a = sz === 2 ? this.regs[EAX] & 0xFFFF : this.regs[EAX];
    const r = this.aluExec(alu, a, this.fetchImm(sz), sz);
    if (alu !== 7) this.setReg(EAX, r, sz);
  }

  private group1Imm(os: OpSize, as_: OpSize, signExt = false): void {
    this.decodeModRM(as_);
    const a = this.getRMVal(os);
    const imm = signExt ? ((this.fetch8() << 24) >> 24) & (os === 2 ? 0xFFFF : 0xFFFFFFFF) : this.fetchImm(os);
    const r = this.aluExec(this.modrmReg, a, imm, os);
    if (this.modrmReg !== 7) this.setRMVal(r, os);
  }

  private incReg(idx: number, os: OpSize): void {
    const savedCF = this.getFlag(CF);
    const v = this.getReg(idx, os);
    const r = (v + 1) | 0;
    this.updateFlagsAdd(v, 1, r, os);
    this.setFlag(CF, savedCF);
    this.setReg(idx, r, os);
  }
  private decReg(idx: number, os: OpSize): void {
    const savedCF = this.getFlag(CF);
    const v = this.getReg(idx, os);
    const r = (v - 1) | 0;
    this.updateFlagsSub(v, 1, r, os);
    this.setFlag(CF, savedCF);
    this.setReg(idx, r, os);
  }

  private jccShort(cond: boolean): void { const r = (this.fetch8() << 24) >> 24; if (cond) this.eip = (this.eip + r) >>> 0; }

  private testRmR(sz: OpSize, as_: OpSize): void {
    this.decodeModRM(as_); this.updateFlagsLogic(this.getRMVal(sz) & this.getReg(this.modrmReg, sz), sz);
  }
  private xchgRmR(sz: OpSize, as_: OpSize): void {
    this.decodeModRM(as_); const a = this.getRMVal(sz), b = this.getReg(this.modrmReg, sz);
    this.setRMVal(b, sz); this.setReg(this.modrmReg, a, sz);
  }
  private movRmR(sz: OpSize, as_: OpSize): void { this.decodeModRM(as_); this.setRMVal(this.getReg(this.modrmReg, sz), sz); }
  private movRRm(sz: OpSize, as_: OpSize): void { this.decodeModRM(as_); this.setReg(this.modrmReg, this.getRMVal(sz), sz); }
  private movRmImm(sz: OpSize, as_: OpSize): void { this.decodeModRM(as_); this.setRMVal(this.fetchImm(sz), sz); }
  private lea(os: OpSize, as_: OpSize): void { this.decodeModRM(as_); this.setReg(this.modrmReg, this.effectiveAddr, os); }

  private movSregRm(as_: OpSize): void { this.decodeModRM(as_); this.segs[this.modrmReg] = this.getRMVal(2) & 0xFFFF; }
  private movRmSreg(as_: OpSize): void { this.decodeModRM(as_); this.setRMVal(this.segs[this.modrmReg], 2); }
  private popRm(os: OpSize, as_: OpSize): void { this.decodeModRM(as_); this.setRMVal(this.popVal(os), os); }
  private arpl(as_: OpSize): void { this.decodeModRM(as_); }
  private les(os: OpSize, as_: OpSize): void { this.decodeModRM(as_); this.setReg(this.modrmReg, this.readMem(this.effectiveAddr, os), os); this.segs[ES] = this.read16(this.effectiveAddr + (os === 2 ? 2 : 4)); }
  private lds(os: OpSize, as_: OpSize): void { this.decodeModRM(as_); this.setReg(this.modrmReg, this.readMem(this.effectiveAddr, os), os); this.segs[DS] = this.read16(this.effectiveAddr + (os === 2 ? 2 : 4)); }

  private saHF(): void {
    const ah = (this.regs[EAX] >>> 8) & 0xFF;
    this.setFlag(CF, !!(ah & 0x01)); this.setFlag(PF, !!(ah & 0x04));
    this.setFlag(AF, !!(ah & 0x10)); this.setFlag(ZF, !!(ah & 0x40));
    this.setFlag(SF, !!(ah & 0x80));
  }
  private laHF(): void {
    let ah = 0x02;
    if (this.getFlag(CF)) ah |= 0x01; if (this.getFlag(PF)) ah |= 0x04;
    if (this.getFlag(AF)) ah |= 0x10; if (this.getFlag(ZF)) ah |= 0x40;
    if (this.getFlag(SF)) ah |= 0x80;
    this.setReg8(4, ah);
  }

  private xlat(as_: OpSize): void {
    const addr = as_ === 2 ? ((this.regs[EBX] & 0xFFFF) + (this.regs[EAX] & 0xFF)) & 0xFFFF : (this.regs[EBX] + (this.regs[EAX] & 0xFF)) >>> 0;
    this.setReg8(0, this.read8(addr));
  }

  private loopJcc(os: OpSize, isLoop: boolean, isNe: boolean, rel: number): void {
    if (os === 2) this.regs[ECX] = (this.regs[ECX] & 0xFFFF0000) | ((this.regs[ECX] - 1) & 0xFFFF);
    else this.regs[ECX] = (this.regs[ECX] - 1) | 0;
    const cx = os === 2 ? this.regs[ECX] & 0xFFFF : this.regs[ECX];
    if (isLoop) { if (cx !== 0) this.eip = (this.eip + rel) >>> 0; }
    else if (isNe) { if (cx !== 0 && !this.getFlag(ZF)) this.eip = (this.eip + rel) >>> 0; }
    else { if (cx !== 0 && this.getFlag(ZF)) this.eip = (this.eip + rel) >>> 0; }
  }
  private stringOp(os: OpSize, as_: OpSize, op: string): void {
    const df = this.getFlag(DF) ? -1 : 1;
    const sz: OpSize = os;
    const doOne = () => {
      const esi = as_ === 2 ? this.regs[ESI] & 0xFFFF : this.regs[ESI] >>> 0;
      const edi = as_ === 2 ? this.regs[EDI] & 0xFFFF : this.regs[EDI] >>> 0;
      switch (op) {
        case 'movs': this.writeMem(edi, this.readMem(esi, sz), sz); break;
        case 'cmps': {
          const a = this.readMem(esi, sz), b = this.readMem(edi, sz);
          this.updateFlagsSub(a, b, (a - b), sz); break;
        }
        case 'stos': this.writeMem(edi, this.getReg(EAX, sz), sz); break;
        case 'lods': this.setReg(EAX, this.readMem(esi, sz), sz); break;
        case 'scas': {
          const a = this.getReg(EAX, sz), b = this.readMem(edi, sz);
          this.updateFlagsSub(a, b, (a - b), sz); break;
        }
      }
      const delta = df * (sz as number);
      if (as_ === 2) {
        this.regs[ESI] = (this.regs[ESI] & 0xFFFF0000) | ((this.regs[ESI] + delta) & 0xFFFF);
        this.regs[EDI] = (this.regs[EDI] & 0xFFFF0000) | ((this.regs[EDI] + delta) & 0xFFFF);
      } else {
        this.regs[ESI] = (this.regs[ESI] + delta) | 0;
        this.regs[EDI] = (this.regs[EDI] + delta) | 0;
      }
    };

    if (this.repPrefix === 0) { doOne(); return; }

    const useCx = as_ === 2 ? () => this.regs[ECX] & 0xFFFF : () => this.regs[ECX] >>> 0;
    const decCx = as_ === 2 ? () => { this.regs[ECX] = (this.regs[ECX] & 0xFFFF0000) | ((this.regs[ECX] - 1) & 0xFFFF); }
                          : () => { this.regs[ECX] = (this.regs[ECX] - 1) | 0; };
    const maxIter = Math.min(useCx(), 100000);
    for (let i = 0; i < maxIter; i++) {
      doOne();
      decCx();
      if (useCx() === 0) break;
      if (this.repPrefix === 0xF2 || this.repPrefix === 0xF3) {
        if (op === 'cmps' || op === 'scas') {
          const match = this.getFlag(ZF);
          if (this.repPrefix === 0xF2 && match) break;
          if (this.repPrefix === 0xF3 && !match) break;
        }
      }
    }
  }

  private imulRmImm(os: OpSize, as_: OpSize, byteImm: boolean): void {
    this.decodeModRM(as_);
    const a = this.getRMVal(os) | 0;
    const imm = byteImm ? ((this.fetch8() << 24) >> 24) : (os === 2 ? (this.fetch16() << 16) >> 16 : this.fetch32() | 0);
    const r = Math.imul(a, imm);
    this.setReg(this.modrmReg, r, os);
    const mask = os === 1 ? 0xFF : os === 2 ? 0xFFFF : 0xFFFFFFFF;
    this.setFlag(CF, (r & ~mask) !== 0); this.setFlag(OF, (r & ~mask) !== 0);
  }

  private shiftGroup(size: OpSize, as_: OpSize, count: number): void {
    this.decodeModRM(as_);
    const op = this.modrmReg;
    const mask = size === 1 ? 0xFF : size === 2 ? 0xFFFF : 0xFFFFFFFF;
    const sb = size === 1 ? 0x80 : size === 2 ? 0x8000 : 0x80000000;
    let val = this.getRMVal(size);
    count &= 0x1F;
    if (count === 0) return;
    if (op === 4 || op === 6) {
      this.setFlag(CF, !!((val << (count - 1)) & sb));
      val = (val << count) & mask;
    } else if (op === 5) {
      this.setFlag(CF, !!(val & 1));
      val = ((val >>> 1) | (val & sb)) & mask;
    } else if (op === 7) {
      this.setFlag(CF, !!(val & 1));
      val = (val >>> count) & mask;
    } else {
      for (let i = 0; i < count; i++) {
        switch (op) {
          case 0: { const hi = val & sb; val = ((val << 1) | (hi ? 1 : 0)) & mask; this.setFlag(CF, !!hi); break; }
          case 1: { const lo = val & 1; val = ((val >>> 1) | (lo ? sb : 0)) & mask; this.setFlag(CF, !!lo); break; }
          case 2: { const hi = val & sb; val = ((val << 1) | (this.getFlag(CF) ? 1 : 0)) & mask; this.setFlag(CF, !!hi); break; }
          case 3: { const lo = val & 1; val = ((val >>> 1) | (this.getFlag(CF) ? sb : 0)) & mask; this.setFlag(CF, !!lo); break; }
          default: val = (val >>> 1) & mask; break;
        }
      }
    }
    this.setRMVal(val, size);
    this.updateFlagsResult(val, size);
    if (op === 4 || op === 5) this.setFlag(OF, !!((val ^ (val << 1)) & sb));
  }

  private group3(size: OpSize, as_: OpSize): void {
    this.decodeModRM(as_);
    const op = this.modrmReg;
    const mask = size === 1 ? 0xFF : size === 2 ? 0xFFFF : 0xFFFFFFFF;
    switch (op) {
      case 0: case 1: { const v = this.getRMVal(size); this.updateFlagsLogic(v & this.fetchImm(size), size); break; }
      case 2: {
        const val = this.getRMVal(size) >>> 0;
        if (size === 1) {
          const r = (this.regs[EAX] & 0xFF) * val;
          this.setReg8(0, r & 0xFF); this.setReg8(4, (r >>> 8) & 0xFF);
          this.setFlag(CF, (r & ~0xFF) !== 0); this.setFlag(OF, (r & ~0xFF) !== 0);
        } else if (size === 2) {
          const r = (this.regs[EAX] & 0xFFFF) * val;
          this.regs[EAX] = (this.regs[EAX] & 0xFFFF0000) | (r & 0xFFFF);
          this.regs[EDX] = (this.regs[EDX] & 0xFFFF0000) | ((r >>> 16) & 0xFFFF);
          this.setFlag(CF, (r & ~0xFFFF) !== 0); this.setFlag(OF, (r & ~0xFFFF) !== 0);
        } else {
          const r = (this.regs[EAX] >>> 0) * val;
          this.regs[EAX] = r >>> 0; this.regs[EDX] = (r / 0x100000000) >>> 0;
          this.setFlag(CF, this.regs[EDX] !== 0); this.setFlag(OF, this.regs[EDX] !== 0);
        } break;
      }
      case 3: {
        const val = this.getRMVal(size) >>> 0;
        if (val === 0) { this.halted = true; return; }
        if (size === 1) {
          const ax = this.regs[EAX] & 0xFFFF;
          this.setReg8(0, ((ax / val) | 0) & 0xFF); this.setReg8(4, (ax % val) & 0xFF);
        } else if (size === 2) {
          const dxax = ((this.regs[EDX] & 0xFFFF) << 16) | (this.regs[EAX] & 0xFFFF);
          this.regs[EAX] = (this.regs[EAX] & 0xFFFF0000) | ((dxax / val) & 0xFFFF);
          this.regs[EDX] = (this.regs[EDX] & 0xFFFF0000) | ((dxax % val) & 0xFFFF);
        } else {
          const hi = this.regs[EDX] >>> 0, lo = this.regs[EAX] >>> 0;
          const div = hi * 0x100000000 + lo;
          this.regs[EAX] = (div / val) | 0; this.regs[EDX] = (div % val) | 0;
        } break;
      }
      case 4: { const v = this.getRMVal(size); this.setRMVal(~v & mask, size); this.updateFlagsLogic(~v & mask, size); break; }
      case 5: { const v = this.getRMVal(size); const r = (-v) & mask; this.setRMVal(r, size); this.updateFlagsSub(0, v, r, size); this.setFlag(CF, v !== 0); break; }
      case 6: {
        const val = this.getRMVal(size) | 0;
        if (size === 1) {
          const r = ((this.regs[EAX] & 0xFF) << 24 >> 24) * (val << 24 >> 24);
          this.regs[EAX] = (this.regs[EAX] & 0xFFFF0000) | (r & 0xFFFF);
          this.regs[EDX] = (this.regs[EDX] & 0xFFFF0000) | ((r >> 16) & 0xFFFF);
        } else if (size === 2) {
          const r = ((this.regs[EAX] & 0xFFFF) << 16 >> 16) * (val << 16 >> 16);
          this.regs[EAX] = (this.regs[EAX] & 0xFFFF0000) | (r & 0xFFFF);
          this.regs[EDX] = (this.regs[EDX] & 0xFFFF0000) | ((r >> 16) & 0xFFFF);
        } else {
          const r = Math.imul(this.regs[EAX], val);
          this.regs[EAX] = r; this.regs[EDX] = (r / 0x100000000) | 0;
        } break;
      }
      case 7: {
        const val = this.getRMVal(size) | 0;
        if (val === 0) { this.halted = true; return; }
        if (size === 1) {
          const ax = (this.regs[EAX] & 0xFF) << 24 >> 24;
          this.setReg8(0, (ax / (val << 24 >> 24)) & 0xFF); this.setReg8(4, (ax % (val << 24 >> 24)) & 0xFF);
        } else if (size === 2) {
          const ax = (this.regs[EAX] & 0xFFFF) << 16 >> 16, d = val << 16 >> 16;
          this.regs[EAX] = (this.regs[EAX] & 0xFFFF0000) | ((ax / d) & 0xFFFF);
          this.regs[EDX] = (this.regs[EDX] & 0xFFFF0000) | ((ax % d) & 0xFFFF);
        } else {
          const q = Math.trunc(this.regs[EAX] / val);
          this.regs[EDX] = (this.regs[EAX] % val) | 0; this.regs[EAX] = q | 0;
        } break;
      }
    }
  }

  private incDecRm(size: OpSize, as_: OpSize): void {
    this.decodeModRM(as_);
    const isInc = this.modrmReg === 0;
    const savedCF = this.getFlag(CF);
    const v = this.getRMVal(size);
    const r = isInc ? (v + 1) : (v - 1);
    if (isInc) this.updateFlagsAdd(v, 1, r, size);
    else this.updateFlagsSub(v, 1, r, size);
    this.setFlag(CF, savedCF);
    this.setRMVal(r, size);
  }

  private groupFF(os: OpSize, as_: OpSize): void {
    this.decodeModRM(as_);
    switch (this.modrmReg) {
      case 0: { const savedCF = this.getFlag(CF); const v = this.getRMVal(os); this.updateFlagsAdd(v, 1, (v + 1), os); this.setFlag(CF, savedCF); this.setRMVal((v + 1), os); break; }
      case 1: { const savedCF = this.getFlag(CF); const v = this.getRMVal(os); this.updateFlagsSub(v, 1, (v - 1), os); this.setFlag(CF, savedCF); this.setRMVal((v - 1), os); break; }
      case 2: this.pushVal(this.getRMVal(os), os); break;
      case 3: { const v = this.getRMVal(os); this.pushVal(os === 2 ? ((v & 0xFFFF) << 16) >> 16 : v, os); break; }
      case 4: { const v = this.getRMVal(os); this.pushVal(this.eip, os); this.eip = os === 2 ? v & 0xFFFF : v; break; }
      case 5: { this.pushVal(this.eip, os); const v = this.getRMVal(os); this.eip = os === 2 ? v & 0xFFFF : v; break; }
      case 6: this.pushVal(this.getRMVal(os), os); break;
      default: break;
    }
  }

  private dispatch0F(os: OpSize, as_: OpSize): void {
    const op2 = this.fetch8();
    switch (op2) {
      case 0x80: case 0x81: case 0x82: case 0x83:
      case 0x84: case 0x85: case 0x86: case 0x87:
      case 0x88: case 0x89: case 0x8A: case 0x8B:
      case 0x8C: case 0x8D: case 0x8E: case 0x8F:
        this.jccNear(op2 - 0x80); break;
      case 0x90: case 0x91: case 0x92: case 0x93:
      case 0x94: case 0x95: case 0x96: case 0x97:
      case 0x98: case 0x99: case 0x9A: case 0x9B:
      case 0x9C: case 0x9D: case 0x9E: case 0x9F:
        this.cmov(op2 - 0x90, os, as_); break;
      case 0xA0: this.push32(this.regs[FS]); break;
      case 0xA1: this.regs[FS] = this.pop32() & 0xFFFF; break;
      case 0xA2: break;
      case 0xA8: this.push32(this.regs[GS]); break;
      case 0xA9: this.regs[GS] = this.pop32() & 0xFFFF; break;
      case 0xAB: this.btsRm(os, as_); break;
      case 0xAF: this.imulRmR(os, as_); break;
      case 0xB0: case 0xB1: case 0xB2: case 0xB3:
      case 0xB4: case 0xB5: case 0xB6: case 0xB7:
      case 0xB8: case 0xB9: case 0xBA: case 0xBB:
      case 0xBC: case 0xBD: case 0xBE: case 0xBF:
        this.setccRm(op2 - 0xB0, as_); break;
      case 0xBA: this.btGroup(os, as_); break;
      case 0xB6: this.movzxRmR(os, as_, 1); break;
      case 0xB7: this.movzxRmR(os, as_, 2); break;
      case 0xBE: this.movsxRmR(os, as_, 1); break;
      case 0xBF: this.movsxRmR(os, as_, 2); break;
      default: break;
    }
  }

  private jccNear(idx: number): void {
    const rel = this.fetch32() | 0;
    const conds: (() => boolean)[] = [
      () => !this.getFlag(OF), () => !!this.getFlag(OF),
      () => !!this.getFlag(CF), () => !this.getFlag(CF),
      () => !!this.getFlag(ZF), () => !this.getFlag(ZF),
      () => !!(this.getFlag(CF) || this.getFlag(ZF)), () => !(this.getFlag(CF) || this.getFlag(ZF)),
      () => !!this.getFlag(SF), () => !this.getFlag(SF),
      () => !!this.getFlag(PF), () => !this.getFlag(PF),
      () => this.getFlag(SF) !== this.getFlag(OF), () => this.getFlag(SF) === this.getFlag(OF),
      () => this.getFlag(SF) !== this.getFlag(OF) || this.getFlag(ZF), () => this.getFlag(SF) === this.getFlag(OF) && !this.getFlag(ZF),
    ];
    if (conds[idx]()) this.eip = (this.eip + rel) >>> 0;
  }

  private cmov(idx: number, os: OpSize, as_: OpSize): void {
    this.decodeModRM(as_);
    const conds: (() => boolean)[] = [
      () => !this.getFlag(OF), () => !!this.getFlag(OF),
      () => !!this.getFlag(CF), () => !this.getFlag(CF),
      () => !!this.getFlag(ZF), () => !this.getFlag(ZF),
      () => !!(this.getFlag(CF) || this.getFlag(ZF)), () => !(this.getFlag(CF) || this.getFlag(ZF)),
      () => !!this.getFlag(SF), () => !this.getFlag(SF),
      () => !!this.getFlag(PF), () => !this.getFlag(PF),
      () => this.getFlag(SF) !== this.getFlag(OF), () => this.getFlag(SF) === this.getFlag(OF),
      () => this.getFlag(SF) !== this.getFlag(OF) || this.getFlag(ZF), () => this.getFlag(SF) === this.getFlag(OF) && !this.getFlag(ZF),
    ];
    if (conds[idx]()) this.setReg(this.modrmReg, this.getRMVal(os), os);
  }

  private setccRm(idx: number, as_: OpSize): void {
    this.decodeModRM(as_);
    const conds: (() => boolean)[] = [
      () => !this.getFlag(OF), () => !!this.getFlag(OF),
      () => !!this.getFlag(CF), () => !this.getFlag(CF),
      () => !!this.getFlag(ZF), () => !this.getFlag(ZF),
      () => !!(this.getFlag(CF) || this.getFlag(ZF)), () => !(this.getFlag(CF) || this.getFlag(ZF)),
      () => !!this.getFlag(SF), () => !this.getFlag(SF),
      () => !!this.getFlag(PF), () => !this.getFlag(PF),
      () => this.getFlag(SF) !== this.getFlag(OF), () => this.getFlag(SF) === this.getFlag(OF),
      () => this.getFlag(SF) !== this.getFlag(OF) || this.getFlag(ZF), () => this.getFlag(SF) === this.getFlag(OF) && !this.getFlag(ZF),
    ];
    this.setRMVal(conds[idx]() ? 1 : 0, 1);
  }

  private btsRm(os: OpSize, as_: OpSize): void {
    this.decodeModRM(as_);
    const bit = this.getReg(this.modrmReg, os);
    const val = this.getRMVal(os);
    this.setFlag(CF, !!((val >>> bit) & 1));
    this.setRMVal(val | (1 << bit), os);
  }

  private btGroup(os: OpSize, as_: OpSize): void {
    this.decodeModRM(as_);
    const bit = this.fetchImm(1);
    const val = this.getRMVal(os);
    switch (this.modrmReg) {
      case 4: this.setFlag(CF, !!((val >>> bit) & 1)); break;
      case 5: this.setFlag(CF, !!((val >>> bit) & 1)); this.setRMVal(val | (1 << bit), os); break;
      case 6: this.setFlag(CF, !!((val >>> bit) & 1)); this.setRMVal(val & ~(1 << bit), os); break;
      case 7: this.setFlag(CF, !!((val >>> bit) & 1)); this.setRMVal(val ^ (1 << bit), os); break;
    }
  }

  private imulRmR(os: OpSize, as_: OpSize): void {
    this.decodeModRM(as_);
    const r = Math.imul(this.getReg(this.modrmReg, os) | 0, this.getRMVal(os) | 0);
    this.setReg(this.modrmReg, r, os);
    const mask = os === 1 ? 0xFF : os === 2 ? 0xFFFF : 0xFFFFFFFF;
    this.setFlag(CF, (r & ~mask) !== 0); this.setFlag(OF, (r & ~mask) !== 0);
  }

  private movzxRmR(os: OpSize, as_: OpSize, srcSz: OpSize): void {
    this.decodeModRM(as_); this.setReg(this.modrmReg, this.getRMVal(srcSz) & (srcSz === 1 ? 0xFF : 0xFFFF), os);
  }
  private movsxRmR(os: OpSize, as_: OpSize, srcSz: OpSize): void {
    this.decodeModRM(as_);
    let v = this.getRMVal(srcSz);
    if (srcSz === 1) v = (v << 24) >> 24; else if (srcSz === 2) v = (v << 16) >> 16;
    this.setReg(this.modrmReg, v, os);
  }
}
