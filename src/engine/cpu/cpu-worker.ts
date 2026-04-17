type OpSize = 1 | 2 | 4;
const CF = 0x0001, PF = 0x0004, AF = 0x0010, ZF = 0x0040;
const SF = 0x0080, IF = 0x0200, DF = 0x0400, OF = 0x0800;
const EAX = 0, ECX = 1, EDX = 2, EBX = 3, ESP = 4, EBP = 5, ESI = 6, EDI = 7;
const MASKS: Record<number, number> = { 1: 0xFF, 2: 0xFFFF, 4: 0xFFFFFFFF };
const SIGNS: Record<number, number> = { 1: 0x80, 2: 0x8000, 4: 0x80000000 };
const SEG_OV: Record<number, number> = { 0x26: 0, 0x2E: 1, 0x36: 2, 0x3E: 3, 0x64: 4, 0x65: 5 };

let regs = new Int32Array(8);
let segs = new Uint16Array(6);
let eflags = IF, eip = 0, halted = false;
let mem: Uint8Array, mem16: Uint16Array, mem32: Int32Array;
let ea = 0, mr = 0, mrr = false, sov = -1, rp = 0;
let surfaceW = 800, surfaceH = 600, batchSz = 500000;

const r8 = (a: number) => mem[a >>> 0];
const r16 = (a: number) => mem16[a >>> 1];
const r32 = (a: number) => mem32[a >>> 2];
const w8 = (a: number, v: number) => { mem[a >>> 0] = v & 0xFF; };
const w16 = (a: number, v: number) => { mem16[a >>> 1] = v & 0xFFFF; };
const w32 = (a: number, v: number) => { mem32[a >>> 2] = v | 0; };
const rm = (a: number, s: OpSize) => s === 1 ? r8(a) : s === 2 ? r16(a) : r32(a);
const wm = (a: number, v: number, s: OpSize) => { if (s === 1) w8(a, v); else if (s === 2) w16(a, v); else w32(a, v); };

let f8 = () => { const v = r8(eip); eip = (eip + 1) >>> 0; return v; };
let f16 = () => { const v = r16(eip); eip = (eip + 2) >>> 0; return v; };
let f32 = () => { const v = r32(eip); eip = (eip + 4) >>> 0; return v; };
let fi = (s: OpSize) => s === 1 ? f8() : s === 2 ? f16() : f32();
const p32 = (v: number) => { regs[ESP] = (regs[ESP] - 4) | 0; w32(regs[ESP] >>> 0, v); };
const pp32 = () => { const v = r32(regs[ESP] >>> 0); regs[ESP] = (regs[ESP] + 4) | 0; return v; };
const pv = (v: number, s: OpSize) => { if (s === 2) { regs[ESP] = (regs[ESP] - 2) | 0; w16(regs[ESP] >>> 0, v); } else p32(v); };
const ppv = (s: OpSize) => s === 2 ? (() => { const v = r16(regs[ESP] >>> 0); regs[ESP] = (regs[ESP] + 2) | 0; return v; })() : pp32();
const gf = (m: number) => (eflags & m) !== 0;
const sf = (m: number, on: boolean) => { if (on) eflags |= m; else eflags &= ~m; };
const par = (v: number) => { let b = v & 0xFF; b ^= b >> 4; b ^= b >> 2; b ^= b >> 1; return (b & 1) === 0; };

function ufr(r: number, s: OpSize) { const m = MASKS[s], v = r & m; sf(ZF, v === 0); sf(SF, !!(v & SIGNS[s])); sf(PF, par(v)); }
function ufa(a: number, b: number, r: number, s: OpSize) { ufr(r, s); sf(CF, (r & ~MASKS[s]) !== 0); sf(AF, ((a ^ b ^ r) & 0x10) !== 0); sf(OF, !!((a ^ r) & (b ^ r) & SIGNS[s])); }
function ufs(a: number, b: number, r: number, s: OpSize) { ufr(r, s); sf(CF, (a & MASKS[s]) < (b & MASKS[s])); sf(AF, ((a ^ b ^ r) & 0x10) !== 0); sf(OF, !!((a ^ b) & (a ^ r) & SIGNS[s])); }
function ufl(r: number, s: OpSize) { ufr(r, s); sf(CF, false); sf(OF, false); sf(AF, false); }

const gr8 = (i: number) => i < 4 ? regs[i] & 0xFF : (regs[i - 4] >>> 8) & 0xFF;
const sr8 = (i: number, v: number) => { if (i < 4) regs[i] = (regs[i] & 0xFFFFFF00) | (v & 0xFF); else regs[i - 4] = (regs[i - 4] & 0xFFFF00FF) | ((v & 0xFF) << 8); };
const gr = (i: number, s: OpSize) => s === 1 ? gr8(i) : s === 2 ? regs[i] & 0xFFFF : regs[i];
const sr = (i: number, v: number, s: OpSize) => { if (s === 1) { sr8(i, v); return; } if (s === 2) { regs[i] = (regs[i] & 0xFFFF0000) | (v & 0xFFFF); return; } regs[i] = v | 0; };

function dmodrm(as_: OpSize) {
  const b = f8(), mod = (b >>> 6) & 3; mr = (b >>> 3) & 7; const rm = b & 7;
  if (mod === 3) { mrr = true; ea = rm; return; }
  mrr = false; let addr: number;
  if (as_ === 4) {
    if (rm === 4) { const sib = f8(), sc = (sib >>> 6) & 3, ix = (sib >>> 3) & 7, bs = sib & 7; const bv = (bs === 5 && mod === 0) ? f32() : regs[bs]; const iv = ix === 4 ? 0 : regs[ix]; addr = (bv + (iv << sc)) >>> 0; }
    else if (rm === 5 && mod === 0) addr = f32() >>> 0;
    else addr = regs[rm] >>> 0;
    if (mod === 1) addr = (addr + ((f8() << 24) >> 24)) >>> 0;
    else if (mod === 2) addr = (addr + f32()) >>> 0;
  } else {
    switch (rm) { case 0: addr = (regs[EBX] + regs[ESI]) & 0xFFFF; break; case 1: addr = (regs[EBX] + regs[EDI]) & 0xFFFF; break; case 2: addr = (regs[EBP] + regs[ESI]) & 0xFFFF; break; case 3: addr = (regs[EBP] + regs[EDI]) & 0xFFFF; break; case 4: addr = regs[ESI] & 0xFFFF; break; case 5: addr = regs[EDI] & 0xFFFF; break; case 6: addr = mod === 0 ? f16() : regs[EBP] & 0xFFFF; break; case 7: addr = regs[EBX] & 0xFFFF; break; default: addr = 0; }
    if (mod === 1) addr = (addr + ((f8() << 24) >> 24)) & 0xFFFF; else if (mod === 2) addr = (addr + f16()) & 0xFFFF;
  }
  ea = addr >>> 0;
}

const grm = (s: OpSize) => mrr ? gr(ea, s) : rm(ea, s);
const srm = (v: number, s: OpSize) => { if (mrr) sr(ea, v, s); else wm(ea, v, s); };

function alu(alu_: number, a: number, b: number, s: OpSize): number {
  const m = MASKS[s];
  switch (alu_) {
    case 0: { const r = (a + b) & m; ufa(a, b, r, s); return r; }
    case 1: { const r = (a | b) & m; ufl(r, s); return r; }
    case 2: { const c = gf(CF) ? 1 : 0; const r = (a + b + c) & m; ufa(a, b + c, r, s); return r; }
    case 3: { const c = gf(CF) ? 1 : 0; const r = (a - b - c) & m; ufs(a, b + c, r, s); return r; }
    case 4: { const r = (a & b) & m; ufl(r, s); return r; }
    case 5: { const r = (a - b) & m; ufs(a, b, r, s); return r; }
    case 6: { const r = (a ^ b) & m; ufl(r, s); return r; }
    case 7: ufs(a, b, (a - b) & m, s); return a;
    default: return a;
  }
}

function jcc(i: number): boolean {
  return [!gf(OF),!!gf(OF),!!gf(CF),!gf(CF),!!gf(ZF),!gf(ZF),!!(gf(CF)||gf(ZF)),!(gf(CF)||gf(ZF)),!!gf(SF),!gf(SF),!!gf(PF),!gf(PF),gf(SF)!==gf(OF),gf(SF)===gf(OF),gf(SF)!==gf(OF)||gf(ZF),gf(SF)===gf(OF)&&!gf(ZF)][i];
}

function dispatch(op: number, os: OpSize, as_: OpSize): void {
  switch (op) {
    case 0x00: dmodrm(as_); srm(alu(0, grm(1), gr(mr, 1), 1), 1); break;
    case 0x01: dmodrm(as_); srm(alu(0, grm(os), gr(mr, os), os), os); break;
    case 0x02: dmodrm(as_); sr(mr, alu(0, gr(mr, 1), grm(1), 1), 1); break;
    case 0x03: dmodrm(as_); sr(mr, alu(0, gr(mr, os), grm(os), os), os); break;
    case 0x04: { const r = alu(0, regs[EAX] & 0xFF, f8(), 1); sr8(0, r); break; }
    case 0x05: { sr(EAX, alu(0, os === 2 ? regs[EAX] & 0xFFFF : regs[EAX], fi(os), os), os); break; }
    case 0x08: dmodrm(as_); srm(alu(1, grm(1), gr(mr, 1), 1), 1); break;
    case 0x09: dmodrm(as_); srm(alu(1, grm(os), gr(mr, os), os), os); break;
    case 0x0A: dmodrm(as_); sr(mr, alu(1, gr(mr, 1), grm(1), 1), 1); break;
    case 0x0B: dmodrm(as_); sr(mr, alu(1, gr(mr, os), grm(os), os), os); break;
    case 0x0C: sr8(0, alu(1, regs[EAX] & 0xFF, f8(), 1)); break;
    case 0x0D: { sr(EAX, alu(1, os === 2 ? regs[EAX] & 0xFFFF : regs[EAX], fi(os), os), os); break; }
    case 0x10: dmodrm(as_); srm(alu(2, grm(1), gr(mr, 1), 1), 1); break;
    case 0x11: dmodrm(as_); srm(alu(2, grm(os), gr(mr, os), os), os); break;
    case 0x12: dmodrm(as_); sr(mr, alu(2, gr(mr, 1), grm(1), 1), 1); break;
    case 0x13: dmodrm(as_); sr(mr, alu(2, gr(mr, os), grm(os), os), os); break;
    case 0x14: sr8(0, alu(2, regs[EAX] & 0xFF, f8(), 1)); break;
    case 0x15: { sr(EAX, alu(2, os === 2 ? regs[EAX] & 0xFFFF : regs[EAX], fi(os), os), os); break; }
    case 0x18: dmodrm(as_); srm(alu(3, grm(1), gr(mr, 1), 1), 1); break;
    case 0x19: dmodrm(as_); srm(alu(3, grm(os), gr(mr, os), os), os); break;
    case 0x1A: dmodrm(as_); sr(mr, alu(3, gr(mr, 1), grm(1), 1), 1); break;
    case 0x1B: dmodrm(as_); sr(mr, alu(3, gr(mr, os), grm(os), os), os); break;
    case 0x1C: sr8(0, alu(3, regs[EAX] & 0xFF, f8(), 1)); break;
    case 0x1D: { sr(EAX, alu(3, os === 2 ? regs[EAX] & 0xFFFF : regs[EAX], fi(os), os), os); break; }
    case 0x20: dmodrm(as_); srm(alu(4, grm(1), gr(mr, 1), 1), 1); break;
    case 0x21: dmodrm(as_); srm(alu(4, grm(os), gr(mr, os), os), os); break;
    case 0x22: dmodrm(as_); sr(mr, alu(4, gr(mr, 1), grm(1), 1), 1); break;
    case 0x23: dmodrm(as_); sr(mr, alu(4, gr(mr, os), grm(os), os), os); break;
    case 0x24: sr8(0, alu(4, regs[EAX] & 0xFF, f8(), 1)); break;
    case 0x25: { sr(EAX, alu(4, os === 2 ? regs[EAX] & 0xFFFF : regs[EAX], fi(os), os), os); break; }
    case 0x28: dmodrm(as_); srm(alu(5, grm(1), gr(mr, 1), 1), 1); break;
    case 0x29: dmodrm(as_); srm(alu(5, grm(os), gr(mr, os), os), os); break;
    case 0x2A: dmodrm(as_); sr(mr, alu(5, gr(mr, 1), grm(1), 1), 1); break;
    case 0x2B: dmodrm(as_); sr(mr, alu(5, gr(mr, os), grm(os), os), os); break;
    case 0x2C: sr8(0, alu(5, regs[EAX] & 0xFF, f8(), 1)); break;
    case 0x2D: { sr(EAX, alu(5, os === 2 ? regs[EAX] & 0xFFFF : regs[EAX], fi(os), os), os); break; }
    case 0x30: dmodrm(as_); srm(alu(6, grm(1), gr(mr, 1), 1), 1); break;
    case 0x31: dmodrm(as_); srm(alu(6, grm(os), gr(mr, os), os), os); break;
    case 0x32: dmodrm(as_); sr(mr, alu(6, gr(mr, 1), grm(1), 1), 1); break;
    case 0x33: dmodrm(as_); sr(mr, alu(6, gr(mr, os), grm(os), os), os); break;
    case 0x34: sr8(0, alu(6, regs[EAX] & 0xFF, f8(), 1)); break;
    case 0x35: { sr(EAX, alu(6, os === 2 ? regs[EAX] & 0xFFFF : regs[EAX], fi(os), os), os); break; }
    case 0x38: dmodrm(as_); alu(7, grm(1), gr(mr, 1), 1); break;
    case 0x39: dmodrm(as_); alu(7, grm(os), gr(mr, os), os); break;
    case 0x3A: dmodrm(as_); alu(7, gr(mr, 1), grm(1), 1); break;
    case 0x3B: dmodrm(as_); alu(7, gr(mr, os), grm(os), os); break;
    case 0x3C: alu(7, regs[EAX] & 0xFF, f8(), 1); break;
    case 0x3D: { alu(7, os === 2 ? regs[EAX] & 0xFFFF : regs[EAX], fi(os), os); break; }
    case 0x40: case 0x41: case 0x42: case 0x43: case 0x44: case 0x45: case 0x46: case 0x47: { const c = gf(CF); const v = gr(op - 0x40, os); ufa(v, 1, (v + 1), os); sf(CF, c); sr(op - 0x40, (v + 1), os); break; }
    case 0x48: case 0x49: case 0x4A: case 0x4B: case 0x4C: case 0x4D: case 0x4E: case 0x4F: { const c = gf(CF); const v = gr(op - 0x48, os); ufs(v, 1, (v - 1), os); sf(CF, c); sr(op - 0x48, (v - 1), os); break; }
    case 0x50: case 0x51: case 0x52: case 0x53: case 0x54: case 0x55: case 0x56: case 0x57: pv(regs[op - 0x50], os); break;
    case 0x58: case 0x59: case 0x5A: case 0x5B: case 0x5C: case 0x5D: case 0x5E: case 0x5F: sr(op - 0x58, ppv(os), os); break;
    case 0x68: pv(fi(os), os); break;
    case 0x6A: pv((f8() << 24) >> 24, os); break;
    case 0x70: case 0x71: case 0x72: case 0x73: case 0x74: case 0x75: case 0x76: case 0x77: case 0x78: case 0x79: case 0x7A: case 0x7B: case 0x7C: case 0x7D: case 0x7E: case 0x7F: { const r = (f8() << 24) >> 24; if (jcc(op - 0x70)) eip = (eip + r) >>> 0; break; }
    case 0x80: case 0x81: case 0x82: case 0x83: { const sz: OpSize = (op === 0x80 || op === 0x82) ? 1 : os; dmodrm(as_); const a = grm(sz); const im = op === 0x83 ? ((f8() << 24) >> 24) & (os === 2 ? 0xFFFF : 0xFFFFFFFF) : fi(sz); const r = alu(mr, a, im, sz); if (mr !== 7) srm(r, sz); break; }
    case 0x84: dmodrm(as_); ufl(grm(1) & gr(mr, 1), 1); break;
    case 0x85: dmodrm(as_); ufl(grm(os) & gr(mr, os), os); break;
    case 0x86: dmodrm(as_); { const a = grm(1), b = gr(mr, 1); srm(b, 1); sr(mr, a, 1); break; }
    case 0x87: dmodrm(as_); { const a = grm(os), b = gr(mr, os); srm(b, os); sr(mr, a, os); break; }
    case 0x88: dmodrm(as_); srm(gr(mr, 1), 1); break;
    case 0x89: dmodrm(as_); srm(gr(mr, os), os); break;
    case 0x8A: dmodrm(as_); sr(mr, grm(1), 1); break;
    case 0x8B: dmodrm(as_); sr(mr, grm(os), os); break;
    case 0x8D: dmodrm(as_); sr(mr, ea, os); break;
    case 0x8F: dmodrm(as_); srm(ppv(os), os); break;
    case 0x90: break;
    case 0x91: case 0x92: case 0x93: case 0x94: case 0x95: case 0x96: case 0x97: { const t = regs[EAX]; regs[EAX] = regs[op - 0x90]; regs[op - 0x90] = t; break; }
    case 0x99: regs[EDX] = (regs[EAX] & (os === 2 ? 0x8000 : 0x80000000)) ? (os === 2 ? 0xFFFF : -1) : 0; break;
    case 0xA0: sr8(0, r8(f32())); break;
    case 0xA1: sr(EAX, rm(f32(), os), os); break;
    case 0xA2: w8(f32(), gr8(0)); break;
    case 0xA3: wm(f32(), gr(EAX, os), os); break;
    case 0xA8: ufl((regs[EAX] & 0xFF) & f8(), 1); break;
    case 0xA9: ufl((os === 2 ? regs[EAX] & 0xFFFF : regs[EAX]) & fi(os), os); break;
    case 0xB0: case 0xB1: case 0xB2: case 0xB3: case 0xB4: case 0xB5: case 0xB6: case 0xB7: sr8(op - 0xB0, f8()); break;
    case 0xB8: case 0xB9: case 0xBA: case 0xBB: case 0xBC: case 0xBD: case 0xBE: case 0xBF: sr(op - 0xB8, fi(os), os); break;
    case 0xC2: { const im = f16(); eip = pp32(); regs[ESP] = (regs[ESP] + im) | 0; break; }
    case 0xC3: eip = pp32(); break;
    case 0xC6: dmodrm(as_); srm(fi(1), 1); break;
    case 0xC7: dmodrm(as_); srm(fi(os), os); break;
    case 0xC9: regs[ESP] = regs[EBP]; regs[EBP] = pp32(); break;
    case 0xCD: f8(); break;
    case 0xE8: { const r = f32() | 0; p32(eip); eip = (eip + r) >>> 0; break; }
    case 0xE9: { const r = f32() | 0; eip = (eip + r) >>> 0; break; }
    case 0xEB: { const r = (f8() << 24) >> 24; eip = (eip + r) >>> 0; break; }
    case 0xF4: halted = true; break;
    case 0xF5: sf(CF, !gf(CF)); break;
    case 0xF6: case 0xF7: { const sz: OpSize = op === 0xF6 ? 1 : os; dmodrm(as_);
      if (mr === 0 || mr === 1) { ufl(grm(sz) & fi(sz), sz); }
      else if (mr === 4) { const v = grm(sz); srm(~v & MASKS[sz], sz); ufl(~v & MASKS[sz], sz); }
      else if (mr === 5) { const v = grm(sz); const r = (-v) & MASKS[sz]; srm(r, sz); ufs(0, v, r, sz); sf(CF, v !== 0); }
      else if (mr === 2 && sz === 4) { const val = grm(sz) >>> 0; const r = (regs[EAX] >>> 0) * val; regs[EAX] = r >>> 0; regs[EDX] = (r / 0x100000000) >>> 0; sf(CF, regs[EDX] !== 0); sf(OF, regs[EDX] !== 0); }
      else if (mr === 3) { const val = grm(sz) >>> 0; if (val === 0) { halted = true; return; } if (sz === 4) { const hi = regs[EDX] >>> 0, lo = regs[EAX] >>> 0; const d = hi * 0x100000000 + lo; regs[EAX] = (d / val) | 0; regs[EDX] = (d % val) | 0; } }
      break; }
    case 0xFE: dmodrm(as_); { const sz: OpSize = 1; const c = gf(CF); const v = grm(sz); if (mr === 0) { ufa(v, 1, (v + 1), sz); sf(CF, c); srm((v + 1), sz); } else { ufs(v, 1, (v - 1), sz); sf(CF, c); srm((v - 1), sz); } break; }
    case 0xFF: dmodrm(as_); {
      if (mr === 0) { const c = gf(CF); const v = grm(os); ufa(v, 1, (v + 1), os); sf(CF, c); srm((v + 1), os); }
      else if (mr === 1) { const c = gf(CF); const v = grm(os); ufs(v, 1, (v - 1), os); sf(CF, c); srm((v - 1), os); }
      else if (mr === 2) pv(grm(os), os);
      else if (mr === 4) { p32(eip); eip = grm(os); }
      else if (mr === 6) pv(grm(os), os);
      break; }
    case 0x0F: { const op2 = f8();
      if (op2 >= 0x80 && op2 <= 0x8F) { const r = f32() | 0; if (jcc(op2 - 0x80)) eip = (eip + r) >>> 0; }
      else if (op2 >= 0x90 && op2 <= 0x9F) { dmodrm(as_); if (jcc(op2 - 0x90)) sr(mr, grm(os), os); }
      else if (op2 >= 0xB0 && op2 <= 0xBF) { dmodrm(as_); srm(jcc(op2 - 0xB0) ? 1 : 0, 1); }
      else if (op2 === 0xAF) { dmodrm(as_); const r = Math.imul(gr(mr, os) | 0, grm(os) | 0); sr(mr, r, os); sf(CF, (r & ~MASKS[os]) !== 0); sf(OF, (r & ~MASKS[os]) !== 0); }
      else if (op2 === 0xB6) { dmodrm(as_); sr(mr, grm(1 as OpSize) & 0xFF, os); }
      else if (op2 === 0xB7) { dmodrm(as_); sr(mr, grm(2 as OpSize) & 0xFFFF, os); }
      else if (op2 === 0xBE) { dmodrm(as_); let v = grm(1 as OpSize); sr(mr, (v << 24) >> 24, os); }
      else if (op2 === 0xBF) { dmodrm(as_); let v = grm(2 as OpSize); sr(mr, (v << 16) >> 16, os); }
      else if (op2 === 0xA0) p32(regs[4]);
      else if (op2 === 0xA1) regs[4] = pp32() & 0xFFFF;
      else if (op2 === 0xA8) p32(regs[5]);
      else if (op2 === 0xA9) regs[5] = pp32() & 0xFFFF;
      break; }
    default: break;
  }
}

function step() {
  sov = -1; rp = 0; let os: OpSize = 4, as_: OpSize = 4;
  let loop = true;
  while (loop) { const b = f8(); switch (b) { case 0xF0: break; case 0xF2: rp = 0xF2; break; case 0xF3: rp = 0xF3; break; case 0x66: os = 2; break; case 0x67: as_ = 2; break; case 0x26: case 0x2E: case 0x36: case 0x3E: case 0x64: case 0x65: sov = SEG_OV[b]; break; default: eip--; loop = false; break; } }
  dispatch(f8(), os, as_);
}

function runBatch(count: number) {
  for (let i = 0; i < count && !halted; i++) step();
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init': {
      const buf = new ArrayBuffer(msg.memSize || 256 * 1024 * 1024);
      mem = new Uint8Array(buf); mem16 = new Uint16Array(buf); mem32 = new Int32Array(buf);
      if (msg.memBase64) { const d = atob(msg.memBase64); for (let i = 0; i < d.length && i < mem.length; i++) mem[i] = d.charCodeAt(i); }
      if (msg.regs) { for (let i = 0; i < 8; i++) regs[i] = msg.regs[i] | 0; }
      if (msg.eip !== undefined) eip = msg.eip;
      if (msg.eflags !== undefined) eflags = msg.eflags;
      if (msg.segs) { for (let i = 0; i < 6; i++) segs[i] = msg.segs[i] & 0xFFFF; }
      halted = false; batchSz = msg.batchSize || 500000;
      self.postMessage({ type: 'ready' });
      break;
    }
    case 'run': {
      if (halted) { self.postMessage({ type: 'halted' }); break; }
      runBatch(msg.count || batchSz);
      self.postMessage({ type: 'state', regs: Array.from(regs), eip, eflags, segs: Array.from(segs), halted });
      break;
    }
    case 'writeMem': {
      if (msg.offset !== undefined && msg.data) mem.set(msg.data, msg.offset);
      break;
    }
    case 'setReg': {
      if (msg.idx !== undefined && msg.val !== undefined) regs[msg.idx] = msg.val | 0;
      break;
    }
    case 'setEIP': {
      if (msg.val !== undefined) eip = msg.val >>> 0;
      break;
    }
    case 'getState': {
      self.postMessage({ type: 'state', regs: Array.from(regs), eip, eflags, segs: Array.from(segs), halted });
      break;
    }
  }
};
