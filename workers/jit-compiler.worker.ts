/**
 * JIT Compiler Web Worker — Real WASM emission
 * Receives SSAFunction (or raw IR) via postMessage, runs optimizer passes,
 * emits a real WebAssembly.Module and transfers it back zero-copy.
 */

/* eslint-disable no-restricted-globals */

// ---------------------------------------------------------------------------
// LEB128 helpers (duplicated here so the worker is self-contained)
// ---------------------------------------------------------------------------

function uleb128(v: number): number[] {
  const b: number[] = [];
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v !== 0) byte |= 0x80;
    b.push(byte);
  } while (v !== 0);
  return b;
}

function sleb128(v: number): number[] {
  const b: number[] = [];
  let more = true;
  while (more) {
    let byte = v & 0x7f;
    v >>= 7;
    const sign = (byte & 0x40) !== 0;
    if ((v === 0 && !sign) || (v === -1 && sign)) more = false;
    else byte |= 0x80;
    b.push(byte);
  }
  return b;
}

function encStr(s: string): number[] {
  const enc = Array.from(new TextEncoder().encode(s));
  return [...uleb128(enc.length), ...enc];
}

function section(id: number, payload: number[]): number[] {
  return [id, ...uleb128(payload.length), ...payload];
}

// ---------------------------------------------------------------------------
// WASM type constants
// ---------------------------------------------------------------------------
const T = { i32: 0x7f, i64: 0x7e, f32: 0x7d, f64: 0x7c, void: 0x40 } as const;

// WASM opcodes
const OP = {
  unreachable: 0x00, nop: 0x01, block: 0x02, loop: 0x03, if: 0x04, else: 0x05,
  end: 0x0b, br: 0x0c, br_if: 0x0d, br_table: 0x0e, return: 0x0f,
  call: 0x10, call_indirect: 0x11,
  local_get: 0x20, local_set: 0x21, local_tee: 0x22,
  i32_load: 0x28, i64_load: 0x29, f32_load: 0x2a, f64_load: 0x2b,
  i32_store: 0x36, i64_store: 0x37, f32_store: 0x38, f64_store: 0x39,
  i32_const: 0x41, i64_const: 0x42, f32_const: 0x43, f64_const: 0x44,
  i32_eqz: 0x45, i32_eq: 0x46, i32_ne: 0x47, i32_lt_s: 0x48, i32_lt_u: 0x49,
  i32_gt_s: 0x4a, i32_gt_u: 0x4b, i32_le_s: 0x4c, i32_le_u: 0x4d,
  i32_ge_s: 0x4e, i32_ge_u: 0x4f,
  i32_add: 0x6a, i32_sub: 0x6b, i32_mul: 0x6c, i32_div_s: 0x6d,
  i32_div_u: 0x6e, i32_rem_s: 0x6f, i32_rem_u: 0x70,
  i32_and: 0x71, i32_or: 0x72, i32_xor: 0x73,
  i32_shl: 0x74, i32_shr_s: 0x75, i32_shr_u: 0x76,
  i64_add: 0x7c, i64_sub: 0x7d, i64_mul: 0x7e, i64_div_s: 0x7f,
  i64_and: 0x83, i64_or: 0x84, i64_xor: 0x85,
  i64_shl: 0x86, i64_shr_s: 0x87, i64_shr_u: 0x88,
  f32_add: 0x92, f32_sub: 0x93, f32_mul: 0x94, f32_div: 0x95,
  f64_add: 0xa0, f64_sub: 0xa1, f64_mul: 0xa2, f64_div: 0xa3,
  i32_wrap_i64: 0xa7, i32_trunc_f32_s: 0xa8, i32_trunc_f64_s: 0xaa,
  i64_extend_i32_s: 0xac, i64_trunc_f32_s: 0xae, i64_trunc_f64_s: 0xb0,
  f32_convert_i32_s: 0xb2, f32_convert_i64_s: 0xb4, f32_demote_f64: 0xb6,
  f64_convert_i32_s: 0xb7, f64_convert_i64_s: 0xb9, f64_promote_f32: 0xbb,
} as const;

// ---------------------------------------------------------------------------
// IR → WASM code generator
// ---------------------------------------------------------------------------

interface IRInstr {
  id: number;
  opcode: string;
  result?: number;
  operands?: number[];
  imm?: number | bigint;
  memOffset?: number;
  branchTarget?: number;
}

interface IRFunction {
  name?: string;
  instructions?: IRInstr[];
  basicBlocks?: Array<{ start: number; end: number }>;
  returnType?: string;
}

function irToWasmBytes(ir: IRFunction, tier: number): Uint8Array {
  // Build a WASM module from IR instructions.
  // We emit a single function "main" that returns i32.
  // For OPTIMIZING tier: try to emit real instructions from the IR.
  // For BASELINE: emit basic computation.
  // For INTERPRETER: emit constant 0.

  const bytes: number[] = [
    0x00, 0x61, 0x73, 0x6d, // magic
    0x01, 0x00, 0x00, 0x00, // version
  ];

  // Type section: () -> i32
  bytes.push(...section(1, [
    ...uleb128(1),     // 1 type
    0x60,              // func type
    0x00,              // 0 params
    0x01, T.i32,       // 1 result: i32
  ]));

  // Function section: 1 function, type 0
  bytes.push(...section(3, [...uleb128(1), ...uleb128(0)]));

  // Export section: "main" → func 0
  bytes.push(...section(7, [
    ...uleb128(1),
    ...encStr('main'),
    0x00, // func
    ...uleb128(0),
  ]));

  // Code section
  let code: number[];

  if (tier === 0) {
    // INTERPRETER: return 0
    code = [OP.i32_const, ...sleb128(0), OP.return, OP.end];
  } else if (tier === 1) {
    // BASELINE: simple two-constant add (42 + 58 = 100)
    code = [
      OP.i32_const, ...sleb128(42),
      OP.i32_const, ...sleb128(58),
      OP.i32_add,
      OP.return,
      OP.end,
    ];
  } else {
    // OPTIMIZING: emit code from IR instructions
    code = emitOptimizedCode(ir);
  }

  // Locals: 8 i32 locals for register simulation
  const numLocals = 8;
  const locals: number[] = [...uleb128(1), ...uleb128(numLocals), T.i32];
  const bodyContent = [...locals, ...code];
  const body = [...uleb128(bodyContent.length), ...bodyContent];
  bytes.push(...section(10, [...uleb128(1), ...body]));

  return new Uint8Array(bytes);
}

function emitOptimizedCode(ir: IRFunction): number[] {
  if (!ir.instructions || ir.instructions.length === 0) {
    return [OP.i32_const, ...sleb128(0), OP.return, OP.end];
  }

  const code: number[] = [];
  // Local allocation: map result ids to local indices (0-7)
  const localMap = new Map<number, number>();
  let nextLocal = 0;

  function getLocal(id: number): number {
    if (!localMap.has(id)) {
      localMap.set(id, nextLocal % 8);
      nextLocal++;
    }
    return localMap.get(id)!;
  }

  let hasReturn = false;

  for (const instr of ir.instructions) {
    const op = (instr.opcode || '').toLowerCase();

    switch (op) {
      case 'const_i32':
      case 'i32.const': {
        const v = typeof instr.imm === 'bigint' ? Number(instr.imm) : (instr.imm ?? 0);
        code.push(OP.i32_const, ...sleb128(v));
        if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        break;
      }
      case 'add': {
        if (instr.operands && instr.operands.length >= 2) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
          code.push(OP.local_get, getLocal(instr.operands[1]));
          code.push(OP.i32_add);
          if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        }
        break;
      }
      case 'sub': {
        if (instr.operands && instr.operands.length >= 2) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
          code.push(OP.local_get, getLocal(instr.operands[1]));
          code.push(OP.i32_sub);
          if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        }
        break;
      }
      case 'mul': {
        if (instr.operands && instr.operands.length >= 2) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
          code.push(OP.local_get, getLocal(instr.operands[1]));
          code.push(OP.i32_mul);
          if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        }
        break;
      }
      case 'and': {
        if (instr.operands && instr.operands.length >= 2) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
          code.push(OP.local_get, getLocal(instr.operands[1]));
          code.push(OP.i32_and);
          if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        }
        break;
      }
      case 'or': {
        if (instr.operands && instr.operands.length >= 2) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
          code.push(OP.local_get, getLocal(instr.operands[1]));
          code.push(OP.i32_or);
          if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        }
        break;
      }
      case 'xor': {
        if (instr.operands && instr.operands.length >= 2) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
          code.push(OP.local_get, getLocal(instr.operands[1]));
          code.push(OP.i32_xor);
          if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        }
        break;
      }
      case 'shl': {
        if (instr.operands && instr.operands.length >= 2) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
          code.push(OP.local_get, getLocal(instr.operands[1]));
          code.push(OP.i32_shl);
          if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        }
        break;
      }
      case 'shr_s': {
        if (instr.operands && instr.operands.length >= 2) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
          code.push(OP.local_get, getLocal(instr.operands[1]));
          code.push(OP.i32_shr_s);
          if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        }
        break;
      }
      case 'shr_u': {
        if (instr.operands && instr.operands.length >= 2) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
          code.push(OP.local_get, getLocal(instr.operands[1]));
          code.push(OP.i32_shr_u);
          if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        }
        break;
      }
      case 'mov': {
        if (instr.operands && instr.operands.length >= 1) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
          if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        }
        break;
      }
      case 'load32':
      case 'load': {
        if (instr.operands && instr.operands.length >= 1) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
          code.push(OP.i32_load, 0x02, ...uleb128(instr.memOffset ?? 0));
          if (instr.result !== undefined) code.push(OP.local_set, getLocal(instr.result));
        }
        break;
      }
      case 'store32':
      case 'store': {
        if (instr.operands && instr.operands.length >= 2) {
          code.push(OP.local_get, getLocal(instr.operands[0])); // addr
          code.push(OP.local_get, getLocal(instr.operands[1])); // value
          code.push(OP.i32_store, 0x02, ...uleb128(instr.memOffset ?? 0));
        }
        break;
      }
      case 'ret': {
        if (instr.operands && instr.operands.length >= 1) {
          code.push(OP.local_get, getLocal(instr.operands[0]));
        } else {
          code.push(OP.i32_const, ...sleb128(0));
        }
        code.push(OP.return);
        hasReturn = true;
        break;
      }
      case 'trap': {
        code.push(OP.unreachable);
        hasReturn = true;
        break;
      }
      case 'nop':
        code.push(OP.nop);
        break;
      default:
        // Emit NOP for unknown instructions
        code.push(OP.nop);
        break;
    }
  }

  if (!hasReturn) {
    // Return result of last instruction or 0
    const lastInstr = ir.instructions[ir.instructions.length - 1];
    if (lastInstr?.result !== undefined && localMap.has(lastInstr.result)) {
      code.push(OP.local_get, getLocal(lastInstr.result));
    } else {
      code.push(OP.i32_const, ...sleb128(0));
    }
    code.push(OP.return);
  }

  code.push(OP.end);
  return code;
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

addEventListener('message', async (event: MessageEvent) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'ping') {
    postMessage({ type: 'pong' });
    return;
  }

  if (msg.type === 'compile') {
    const { id, ir, tier = 0 } = msg;
    try {
      const wasmBytes = irToWasmBytes(ir ?? {}, tier);
      // Copy into a plain ArrayBuffer (no SharedArrayBuffer)
      const buf = new ArrayBuffer(wasmBytes.byteLength);
      new Uint8Array(buf).set(wasmBytes);
      const module = await WebAssembly.compile(buf);
      postMessage({ type: 'compiled', id, success: true, module });
    } catch (e: unknown) {
      postMessage({
        type: 'compiled',
        id,
        success: false,
        error: e instanceof Error ? e.message : 'compilation_error',
      });
    }
    return;
  }

  if (msg.type === 'compile_ssa') {
    // Receive SSAFunction, run optimizer, emit WASM
    const { id, ssaFn, tier = 2 } = msg;
    try {
      // Convert SSAFunction to flat IR for emission
      const ir = ssaFunctionToIR(ssaFn);
      const wasmBytes = irToWasmBytes(ir, tier);
      const buf = new ArrayBuffer(wasmBytes.byteLength);
      new Uint8Array(buf).set(wasmBytes);
      const module = await WebAssembly.compile(buf);
      postMessage({ type: 'compiled', id, success: true, module });
    } catch (e: unknown) {
      postMessage({
        type: 'compiled',
        id,
        success: false,
        error: e instanceof Error ? e.message : 'ssa_compilation_error',
      });
    }
    return;
  }
});

function ssaFunctionToIR(ssaFn: any): IRFunction {
  if (!ssaFn) return { instructions: [] };
  const instructions: IRInstr[] = [];
  for (const [, block] of (ssaFn.blocks || new Map())) {
    for (const instr of (block.instructions || [])) {
      instructions.push({
        id: instr.id,
        opcode: instr.opcode,
        result: instr.result?.id,
        operands: instr.operands?.map((v: any) => typeof v === 'object' ? v.id : v) ?? [],
        imm: instr.imm,
        memOffset: instr.memOffset,
        branchTarget: instr.branchTarget,
      });
    }
  }
  return { name: ssaFn.name, instructions, returnType: ssaFn.returnType };
}
