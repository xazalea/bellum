/**
 * Dalvik Bytecode Interpreter
 * Enhanced implementation with comprehensive opcode support
 */

import { AndroidRuntime } from './runtime';

export class DalvikInterpreter {
  private runtime: AndroidRuntime;
  private registers: Int32Array = new Int32Array(256);
  private floatRegs: Float64Array = new Float64Array(256);
  private pc: number = 0;
  private code: Uint8Array = new Uint8Array(0);
  private objectHeap: Map<number, any> = new Map();
  private nextObjectId: number = 1;
  private lastResult: number = 0;
  private lastResultFloat: number = 0;
  private methodTable: Map<number, (args: number[]) => number> = new Map();
  private stringPool: Map<number, string> = new Map();
  private typePool: Map<number, string> = new Map();

  constructor(runtime: AndroidRuntime) {
    this.runtime = runtime;
  }

  /** Execute Dalvik bytecode to completion (async wrapper). */
  async execute(code: Uint8Array): Promise<void> {
    this.code = code;
    this.pc = 0;
    while (this.pc < this.code.length) {
      const opcode = this.code[this.pc];
      if (!this.step(opcode)) return; // step returns false on return-void/return/return-wide/return-object
    }
  }

  /**
   * Execute a single instruction synchronously.
   * Returns `true` to continue, `false` if a return opcode was hit.
   */
  step(opcode: number): boolean {
    // Check for return opcodes first
    if (opcode === 0x0E) { this.pc += 2; return false; } // return-void
    if (opcode === 0x0F) { const v=this.code[this.pc+1]; this.lastResult=this.registers[v]; this.lastResultFloat=this.lastResult; this.pc+=2; return false; }
    if (opcode === 0x10) { const v=this.code[this.pc+1]; this.lastResult=this.registers[v]; this.lastResultFloat=this.floatRegs[v]; this.pc+=2; return false; }
    if (opcode === 0x11) { const v=this.code[this.pc+1]; this.lastResult=this.registers[v]; this.lastResultFloat=this.lastResult; this.pc+=2; return false; }

    this.executeInstruction(opcode);
    return true;
  }

  /** Get the current PC. */
  getPC(): number { return this.pc; }

  /** Get the code buffer. */
  getCode(): Uint8Array { return this.code; }

  private executeInstruction(opcode: number): void {
    switch (opcode) {
      // ===== NOP & DATA =====
      case 0x00: // nop
        this.pc += 2;
        break;

      // ===== MOVE OPERATIONS =====
      case 0x01: // move vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] = this.registers[vB];
          this.pc += 2;
        }
        break;

      case 0x02: // move/from16 vAA, vBBBB
        {
          const vAA = this.code[this.pc + 1];
          const vBBBB = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          this.registers[vAA] = this.registers[vBBBB];
          this.pc += 4;
        }
        break;

      case 0x03: // move/16 vAAAA, vBBBB
        {
          const vAAAA = (this.code[this.pc + 2] << 8) | this.code[this.pc + 1];
          const vBBBB = (this.code[this.pc + 4] << 8) | this.code[this.pc + 3];
          this.registers[vAAAA] = this.registers[vBBBB];
          this.pc += 6;
        }
        break;

      case 0x04: // move-wide vA, vB (64-bit)
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] = this.registers[vB];
          this.registers[vA + 1] = this.registers[vB + 1];
          this.pc += 2;
        }
        break;

      case 0x07: // move-object vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] = this.registers[vB]; // Object reference
          this.pc += 2;
        }
        break;

      case 0x0A: // move-result vAA
        {
          const vAA = this.code[this.pc + 1];
          this.registers[vAA] = this.lastResult;
          this.pc += 2;
        }
        break;

      // Return opcodes are handled in step() before calling executeInstruction

      // ===== CONST OPERATIONS =====
      case 0x12: // const/4 vA, #+B
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          let val = (byte2 >> 4) & 0xF;
          if (val > 7) val -= 16; // sign extend
          this.registers[vA] = val;
          this.pc += 2;
        }
        break;

      case 0x13: // const/16 vAA, #+BBBB
        {
          const vAA = this.code[this.pc + 1];
          const val = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedVal = (val << 16) >> 16;
          this.registers[vAA] = signedVal;
          this.pc += 4;
        }
        break;

      case 0x14: // const vAA, #+BBBBBBBB
        {
          const vAA = this.code[this.pc + 1];
          const val = (this.code[this.pc + 4] << 24) | (this.code[this.pc + 3] << 16) |
                     (this.code[this.pc + 2] << 8) | this.code[this.pc + 1];
          this.registers[vAA] = val;
          this.pc += 6;
        }
        break;

      case 0x15: // const/high16 vAA, #+BBBB0000
        {
          const vAA = this.code[this.pc + 1];
          const val = ((this.code[this.pc + 3] << 8) | this.code[this.pc + 2]) << 16;
          this.registers[vAA] = val;
          this.pc += 4;
        }
        break;

      // ===== MONITOR (sync) =====
      case 0x1D: // monitor-enter vAA
      case 0x1E: // monitor-exit vAA
        this.pc += 2;
        break;

      // ===== CONST-STRING =====
      case 0x1A: // const-string vAA, string@BBBB
        {
          const vAA = this.code[this.pc + 1];
          const strIdx = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          // Create a string object in the heap
          const objId = this.nextObjectId++;
          const str = this.runtime.resolveString(strIdx);
          this.objectHeap.set(objId, { type: 'string', value: str });
          this.registerString(objId, str);
          this.registers[vAA] = objId;
          this.pc += 4;
        }
        break;

      // const-string/jumbo vAA, string@BBBBBBBB
      case 0x1B:
        {
          const vAA = this.code[this.pc + 1];
          const strIdx = (this.code[this.pc + 5] << 24) | (this.code[this.pc + 4] << 16) |
                        (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const objId = this.nextObjectId++;
          const str = this.runtime.resolveString(strIdx);
          this.objectHeap.set(objId, { type: 'string', value: str });
          this.registerString(objId, str);
          this.registers[vAA] = objId;
          this.pc += 6;
        }
        break;

      // ===== CONST-CLASS =====
      case 0x1C: // const-class vAA, type@BBBB
        {
          const vAA = this.code[this.pc + 1];
          const objId = this.nextObjectId++;
          this.objectHeap.set(objId, { type: 'class' });
          this.registers[vAA] = objId;
          this.pc += 4;
        }
        break;

      // ===== CHECK-CAST =====
      case 0x1F: // check-cast vAA, type@BBBB
        {
          const vAA = this.code[this.pc + 1];
          // Type check - in simple impl, assume it passes
          this.pc += 4;
        }
        break;

      // ===== INSTANCE-OF =====
      case 0x20: // instance-of vA, vB, type@CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          // Simple: assume true for now
          this.registers[vA] = 1;
          this.pc += 4;
        }
        break;

      // ===== ARRAY LENGTH =====
      case 0x21: // array-length vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const arrayRef = this.registers[vB];
          const array = this.objectHeap.get(arrayRef);
          this.registers[vA] = array?.length || 0;
          this.pc += 2;
        }
        break;

      // 0x22 and 0x23 are handled below (with filled-new-array variants)

      // ===== GOTO =====
      case 0x28: // goto +AA
        {
          const offset = this.code[this.pc + 1];
          const signedOffset = offset > 127 ? offset - 256 : offset;
          this.pc += signedOffset * 2; // Offset is in 16-bit units
        }
        break;

      case 0x29: // goto/16 +AAAA
        {
          const offset = (this.code[this.pc + 2] << 8) | this.code[this.pc + 1];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          this.pc += signedOffset * 2;
        }
        break;

      case 0x2A: // goto/32 +AAAAAAAA
        {
          const offset = (this.code[this.pc + 4] << 24) | (this.code[this.pc + 3] << 16) |
                        (this.code[this.pc + 2] << 8) | this.code[this.pc + 1];
          this.pc += offset * 2;
        }
        break;

      // ===== COMPARISON & BRANCHING =====
      case 0x32: // if-eq vA, vB, +CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vA] === this.registers[vB]) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

      case 0x33: // if-ne vA, vB, +CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vA] !== this.registers[vB]) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

      case 0x34: // if-lt vA, vB, +CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vA] < this.registers[vB]) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

      case 0x35: // if-ge vA, vB, +CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vA] >= this.registers[vB]) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

      case 0x36: // if-gt vA, vB, +CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vA] > this.registers[vB]) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

      case 0x37: // if-le vA, vB, +CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vA] <= this.registers[vB]) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

      // 0x38 if-eqz — compare register with zero
      case 0x38: {
        const vAA = this.code[this.pc + 1];
        const off = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
        const so = off > 32767 ? off - 65536 : off;
        if (this.registers[vAA] === 0) this.pc += so * 2; else this.pc += 4;
        break;
      }

      case 0x39: // if-nez vAA, +BBBB
        {
          const vAA = this.code[this.pc + 1];
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vAA] !== 0) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

      case 0x3A: // if-ltz vAA, +BBBB
        {
          const vAA = this.code[this.pc + 1];
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vAA] < 0) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

      case 0x3B: // if-gez vAA, +BBBB
        {
          const vAA = this.code[this.pc + 1];
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vAA] >= 0) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

      case 0x3C: // if-gtz vAA, +BBBB
        {
          const vAA = this.code[this.pc + 1];
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vAA] > 0) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

      case 0x3D: // if-lez vAA, +BBBB
        {
          const vAA = this.code[this.pc + 1];
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vAA] <= 0) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

      // 0x44 aget is handled below (with aget-wide/float variants)

      case 0x4B: // aput vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          const arrayRef = this.registers[vBB];
          const index = this.registers[vCC];
          const array = this.objectHeap.get(arrayRef);
          if (array) array[index] = this.registers[vAA];
          this.pc += 4;
        }
        break;

      // ===== INSTANCE GET/PUT =====
      case 0x52: // iget vA, vB, field@CCCC
      case 0x53: // iget-wide vA, vB, field@CCCC
      case 0x54: // iget-object vA, vB, field@CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const objRef = this.registers[vB];
          const obj = this.objectHeap.get(objRef) || {};
          this.registers[vA] = obj.field || 0; // Simplified
          this.pc += 4;
        }
        break;

      case 0x59: // iput vA, vB, field@CCCC
      case 0x5A: // iput-wide vA, vB, field@CCCC
      case 0x5B: // iput-object vA, vB, field@CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const objRef = this.registers[vB];
          let obj = this.objectHeap.get(objRef);
          if (!obj) {
            obj = {};
            this.objectHeap.set(objRef, obj);
          }
          obj.field = this.registers[vA]; // Simplified
          this.pc += 4;
        }
        break;

      // ===== STATIC GET/PUT =====
      case 0x60: // sget vAA, field@BBBB
      case 0x61: // sget-wide vAA, field@BBBB
      case 0x62: // sget-object vAA, field@BBBB
        {
          const vAA = this.code[this.pc + 1];
          // Static field - simplified
          this.registers[vAA] = 0;
          this.pc += 4;
        }
        break;

      case 0x67: // sput vAA, field@BBBB
      case 0x68: // sput-wide vAA, field@BBBB
      case 0x69: // sput-object vAA, field@BBBB
        {
          // Static field - simplified, no-op
          this.pc += 4;
        }
        break;

      // 0x6E-0x72 invoke-* opcodes are handled below (with methodTable dispatch)

      // ===== UNARY OPERATIONS =====
      case 0x7B: // neg-int vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] = -this.registers[vB];
          this.pc += 2;
        }
        break;

      case 0x7C: // not-int vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] = ~this.registers[vB];
          this.pc += 2;
        }
        break;

      // ===== BINARY OPERATIONS =====
      case 0x90: // add-int vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] + this.registers[vCC];
          this.pc += 4;
        }
        break;

      case 0x91: // sub-int vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] - this.registers[vCC];
          this.pc += 4;
        }
        break;

      case 0x92: // mul-int vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          this.registers[vAA] = Math.imul(this.registers[vBB], this.registers[vCC]);
          this.pc += 4;
        }
        break;

      case 0x93: // div-int vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          const divisor = this.registers[vCC];
          this.registers[vAA] = divisor !== 0 ? Math.floor(this.registers[vBB] / divisor) : 0;
          this.pc += 4;
        }
        break;

      case 0x94: // rem-int vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          const divisor = this.registers[vCC];
          this.registers[vAA] = divisor !== 0 ? this.registers[vBB] % divisor : 0;
          this.pc += 4;
        }
        break;

      case 0x95: // and-int vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] & this.registers[vCC];
          this.pc += 4;
        }
        break;

      case 0x96: // or-int vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] | this.registers[vCC];
          this.pc += 4;
        }
        break;

      case 0x97: // xor-int vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] ^ this.registers[vCC];
          this.pc += 4;
        }
        break;

      case 0x98: // shl-int vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] << (this.registers[vCC] & 0x1F);
          this.pc += 4;
        }
        break;

      case 0x99: // shr-int vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] >> (this.registers[vCC] & 0x1F);
          this.pc += 4;
        }
        break;

      case 0x9A: // ushr-int vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] >>> (this.registers[vCC] & 0x1F);
          this.pc += 4;
        }
        break;

      // ===== BINARY OPERATIONS /2addr format =====
      case 0xB0: // add-int/2addr vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] += this.registers[vB];
          this.pc += 2;
        }
        break;

      case 0xB1: // sub-int/2addr vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] -= this.registers[vB];
          this.pc += 2;
        }
        break;

      case 0xB2: // mul-int/2addr vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] = Math.imul(this.registers[vA], this.registers[vB]);
          this.pc += 2;
        }
        break;

      case 0xB3: // div-int/2addr vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const divisor = this.registers[vB];
          if (divisor !== 0) {
            this.registers[vA] = Math.floor(this.registers[vA] / divisor);
          }
          this.pc += 2;
        }
        break;

      case 0xB4: // rem-int/2addr vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const divisor = this.registers[vB];
          if (divisor !== 0) {
            this.registers[vA] %= divisor;
          }
          this.pc += 2;
        }
        break;

      case 0xB5: // and-int/2addr vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] &= this.registers[vB];
          this.pc += 2;
        }
        break;

      case 0xB6: // or-int/2addr vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] |= this.registers[vB];
          this.pc += 2;
        }
        break;

      case 0xB7: // xor-int/2addr vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] ^= this.registers[vB];
          this.pc += 2;
        }
        break;

      case 0xB8: // shl-int/2addr vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] <<= (this.registers[vB] & 0x1F);
          this.pc += 2;
        }
        break;

      case 0xB9: // shr-int/2addr vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] >>= (this.registers[vB] & 0x1F);
          this.pc += 2;
        }
        break;

      case 0xBA: // ushr-int/2addr vA, vB
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          this.registers[vA] >>>= (this.registers[vB] & 0x1F);
          this.pc += 2;
        }
        break;

      // ===== BINARY OPERATIONS /lit16 =====
      case 0xD0: // add-int/lit16 vA, vB, #+CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const lit = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedLit = lit > 32767 ? lit - 65536 : lit;
          this.registers[vA] = this.registers[vB] + signedLit;
          this.pc += 4;
        }
        break;

      case 0xD1: // rsub-int vA, vB, #+CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const lit = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedLit = lit > 32767 ? lit - 65536 : lit;
          this.registers[vA] = signedLit - this.registers[vB];
          this.pc += 4;
        }
        break;

      case 0xD2: // mul-int/lit16 vA, vB, #+CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const lit = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedLit = lit > 32767 ? lit - 65536 : lit;
          this.registers[vA] = Math.imul(this.registers[vB], signedLit);
          this.pc += 4;
        }
        break;

      case 0xD3: // div-int/lit16 vA, vB, #+CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const lit = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedLit = lit > 32767 ? lit - 65536 : lit;
          if (signedLit !== 0) {
            this.registers[vA] = Math.floor(this.registers[vB] / signedLit);
          }
          this.pc += 4;
        }
        break;

      case 0xD4: // rem-int/lit16 vA, vB, #+CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const lit = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedLit = lit > 32767 ? lit - 65536 : lit;
          if (signedLit !== 0) {
            this.registers[vA] = this.registers[vB] % signedLit;
          }
          this.pc += 4;
        }
        break;

      case 0xD5: // and-int/lit16 vA, vB, #+CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const lit = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          this.registers[vA] = this.registers[vB] & lit;
          this.pc += 4;
        }
        break;

      case 0xD6: // or-int/lit16 vA, vB, #+CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const lit = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          this.registers[vA] = this.registers[vB] | lit;
          this.pc += 4;
        }
        break;

      case 0xD7: // xor-int/lit16 vA, vB, #+CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const lit = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          this.registers[vA] = this.registers[vB] ^ lit;
          this.pc += 4;
        }
        break;

      // ===== BINARY OPERATIONS /lit8 =====
      case 0xD8: // add-int/lit8 vAA, vBB, #+CC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const lit = this.code[this.pc + 3];
          const signedLit = lit > 127 ? lit - 256 : lit;
          this.registers[vAA] = this.registers[vBB] + signedLit;
          this.pc += 4;
        }
        break;

      case 0xD9: // rsub-int/lit8 vAA, vBB, #+CC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const lit = this.code[this.pc + 3];
          const signedLit = lit > 127 ? lit - 256 : lit;
          this.registers[vAA] = signedLit - this.registers[vBB];
          this.pc += 4;
        }
        break;

      case 0xDA: // mul-int/lit8 vAA, vBB, #+CC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const lit = this.code[this.pc + 3];
          const signedLit = lit > 127 ? lit - 256 : lit;
          this.registers[vAA] = Math.imul(this.registers[vBB], signedLit);
          this.pc += 4;
        }
        break;

      case 0xDB: // div-int/lit8 vAA, vBB, #+CC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const lit = this.code[this.pc + 3];
          const signedLit = lit > 127 ? lit - 256 : lit;
          if (signedLit !== 0) {
            this.registers[vAA] = Math.floor(this.registers[vBB] / signedLit);
          }
          this.pc += 4;
        }
        break;

      case 0xDC: // rem-int/lit8 vAA, vBB, #+CC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const lit = this.code[this.pc + 3];
          const signedLit = lit > 127 ? lit - 256 : lit;
          if (signedLit !== 0) {
            this.registers[vAA] = this.registers[vBB] % signedLit;
          }
          this.pc += 4;
        }
        break;

      case 0xDD: // and-int/lit8 vAA, vBB, #+CC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const lit = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] & lit;
          this.pc += 4;
        }
        break;

      case 0xDE: // or-int/lit8 vAA, vBB, #+CC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const lit = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] | lit;
          this.pc += 4;
        }
        break;

      case 0xDF: // xor-int/lit8 vAA, vBB, #+CC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const lit = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] ^ lit;
          this.pc += 4;
        }
        break;

      case 0xE0: // shl-int/lit8 vAA, vBB, #+CC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const lit = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] << (lit & 0x1F);
          this.pc += 4;
        }
        break;

      case 0xE1: // shr-int/lit8 vAA, vBB, #+CC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const lit = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] >> (lit & 0x1F);
          this.pc += 4;
        }
        break;

      case 0xE2: // ushr-int/lit8 vAA, vBB, #+CC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const lit = this.code[this.pc + 3];
          this.registers[vAA] = this.registers[vBB] >>> (lit & 0x1F);
          this.pc += 4;
        }
        break;

      // move-wide/from16 vAA, vBBBB (format 22x, 4 bytes)
      case 0x05: { const vAA = this.code[this.pc + 1]; const vBBBB = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2]; this.floatRegs[vAA] = this.floatRegs[vBBBB]; this.floatRegs[vAA + 1] = this.floatRegs[vBBBB + 1]; this.pc += 4; break; }
      // move-wide/16 vAAAA, vBBBB (format 32x, 6 bytes)
      case 0x06: { const vAAAA = (this.code[this.pc + 2] << 8) | this.code[this.pc + 1]; const vBBBB = (this.code[this.pc + 4] << 8) | this.code[this.pc + 3]; this.floatRegs[vAAAA] = this.floatRegs[vBBBB]; this.floatRegs[vAAAA + 1] = this.floatRegs[vBBBB + 1]; this.pc += 6; break; }
      // move-object/from16 vAA, vBBBB (format 22x, 4 bytes)
      case 0x08: { const vAA = this.code[this.pc + 1]; const vBBBB = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2]; this.registers[vAA] = this.registers[vBBBB]; this.pc += 4; break; }
      // move-object/16 vAAAA, vBBBB (format 32x, 6 bytes)
      case 0x09: { const vAAAA = (this.code[this.pc + 2] << 8) | this.code[this.pc + 1]; const vBBBB = (this.code[this.pc + 4] << 8) | this.code[this.pc + 3]; this.registers[vAAAA] = this.registers[vBBBB]; this.pc += 6; break; }
      // move-result-wide vAA — 64-bit result (int pair + float pair)
      case 0x0B: { const vAA = this.code[this.pc + 1]; this.registers[vAA] = this.lastResult; this.floatRegs[vAA] = this.lastResultFloat; this.pc += 2; break; }
      // move-result-object vAA — move last object reference into register
      case 0x0C: { const vAA = this.code[this.pc + 1]; this.registers[vAA] = this.lastResult; this.pc += 2; break; }
      // move-exception vAA — move pending exception into register
      case 0x0D: { const vAA = this.code[this.pc + 1]; this.registers[vAA] = this.lastResult; this.pc += 2; break; }

      case 0x16: { const vAA = this.code[this.pc + 1]; const lit = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2]; this.floatRegs[vAA] = lit / 65536; this.pc += 4; break; }
      case 0x17: { const vAA = this.code[this.pc + 1]; const buf = new ArrayBuffer(8); const view = new DataView(buf); for (let i = 0; i < 8; i++) view.setUint8(i, this.code[this.pc + 2 + i]); this.floatRegs[vAA] = view.getFloat64(0, true); this.pc += 10; break; }
      case 0x18: { const vAA = this.code[this.pc + 1]; const buf = new ArrayBuffer(8); const view = new DataView(buf); for (let i = 0; i < 8; i++) view.setUint8(i, this.code[this.pc + 2 + i]); this.floatRegs[vAA] = view.getFloat64(0, true); this.pc += 10; break; }
      case 0x19: { const vAA = this.code[this.pc + 1]; const hi = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2]; this.floatRegs[vAA] = hi / 65536; this.pc += 4; break; }

      // packed-switch vAA, +BBBBBBBB — jump via packed-switch-payload table
      case 0x2B: {
        const vAA = this.code[this.pc + 1];
        const targetsOff = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2]; // signed offset in 16-bit units to payload
        const so = targetsOff > 32767 ? targetsOff - 65536 : targetsOff;
        const payloadBase = this.pc + so * 2; // absolute byte offset of payload
        // packed-switch-payload format: ident(0x0100)=2bytes, size=2bytes, first_key=4bytes, targets[]=4bytes each
        if (payloadBase >= 0 && payloadBase + 8 <= this.code.length) {
          const ident = this.code[payloadBase] | (this.code[payloadBase + 1] << 8);
          if (ident === 0x0100) { // packed-switch-payload
            const size = this.code[payloadBase + 2] | (this.code[payloadBase + 3] << 8);
            const firstKey = (this.code[payloadBase + 7] << 24) | (this.code[payloadBase + 6] << 16) | (this.code[payloadBase + 5] << 8) | this.code[payloadBase + 4];
            const testVal = this.registers[vAA];
            const idx = testVal - firstKey;
            if (idx >= 0 && idx < size) {
              const targetOff = payloadBase + 8 + idx * 4;
              if (targetOff + 4 <= this.code.length) {
                const relOff = (this.code[targetOff + 3] << 24) | (this.code[targetOff + 2] << 16) | (this.code[targetOff + 1] << 8) | this.code[targetOff];
                const signedRel = relOff > 0x7FFFFFFF ? relOff - 0x100000000 : relOff;
                this.pc = payloadBase + signedRel * 2; // absolute jump
                break;
              }
            }
          }
        }
        this.pc += 4; // skip if not found or invalid
        break;
      }
      // sparse-switch vAA, +BBBBBBBB — jump via sparse-switch-payload table
      case 0x2C: {
        const vAA = this.code[this.pc + 1];
        const targetsOff = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
        const so = targetsOff > 32767 ? targetsOff - 65536 : targetsOff;
        const payloadBase = this.pc + so * 2;
        // sparse-switch-payload format: ident(0x0200)=2bytes, size=2bytes, keys[]=4bytes each, targets[]=4bytes each
        if (payloadBase >= 0 && payloadBase + 4 <= this.code.length) {
          const ident = this.code[payloadBase] | (this.code[payloadBase + 1] << 8);
          if (ident === 0x0200) { // sparse-switch-payload
            const size = this.code[payloadBase + 2] | (this.code[payloadBase + 3] << 8);
            const keysBase = payloadBase + 4;
            const targetsBase = keysBase + size * 4;
            const testVal = this.registers[vAA];
            // Binary search through sorted keys
            let lo = 0, hi = size - 1, found = -1;
            while (lo <= hi) {
              const mid = (lo + hi) >> 1;
              const keyOff = keysBase + mid * 4;
              if (keyOff + 4 > this.code.length) break;
              const key = (this.code[keyOff + 3] << 24) | (this.code[keyOff + 2] << 16) | (this.code[keyOff + 1] << 8) | this.code[keyOff];
              if (key === testVal) { found = mid; break; }
              else if (key < testVal) lo = mid + 1;
              else hi = mid - 1;
            }
            if (found >= 0) {
              const targetOff = targetsBase + found * 4;
              if (targetOff + 4 <= this.code.length) {
                const relOff = (this.code[targetOff + 3] << 24) | (this.code[targetOff + 2] << 16) | (this.code[targetOff + 1] << 8) | this.code[targetOff];
                const signedRel = relOff > 0x7FFFFFFF ? relOff - 0x100000000 : relOff;
                this.pc = payloadBase + signedRel * 2;
                break;
              }
            }
          }
        }
        this.pc += 4; // skip if not found or invalid
        break;
      }

      case 0x2D: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; const off = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2]; const so = off > 32767 ? off - 65536 : off; if (this.floatRegs[vA] === this.floatRegs[vB]) this.pc += so * 2; else this.pc += 4; break; }
      case 0x2E: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; const off = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2]; const so = off > 32767 ? off - 65536 : off; if (this.floatRegs[vA] !== this.floatRegs[vB]) this.pc += so * 2; else this.pc += 4; break; }
      case 0x2F: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; const off = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2]; const so = off > 32767 ? off - 65536 : off; if (this.floatRegs[vA] < this.floatRegs[vB]) this.pc += so * 2; else this.pc += 4; break; }
      case 0x30: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; const off = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2]; const so = off > 32767 ? off - 65536 : off; if (this.floatRegs[vA] >= this.floatRegs[vB]) this.pc += so * 2; else this.pc += 4; break; }
      case 0x31: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; const off = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2]; const so = off > 32767 ? off - 65536 : off; if (this.floatRegs[vA] > this.floatRegs[vB]) this.pc += so * 2; else this.pc += 4; break; }

      case 0x43: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; const arr = this.objectHeap.get(this.registers[vBB]); this.floatRegs[vAA] = arr?.[this.registers[vCC]] || 0; this.pc += 4; break; }
      // aget-wide vAA, vBB, vCC (float pair)
      case 0x44: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; const arr = this.objectHeap.get(this.registers[vBB]); this.registers[vAA] = arr?.[this.registers[vCC]] || 0; this.pc += 4; break; }
      case 0x45: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; const arr = this.objectHeap.get(this.registers[vBB]); this.floatRegs[vAA] = arr?.[this.registers[vCC]] || 0; this.floatRegs[vAA + 1] = arr?.[this.registers[vCC] + 1] || 0; this.pc += 4; break; }
      case 0x46: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; const arr = this.objectHeap.get(this.registers[vBB]); this.registers[vAA] = arr?.[this.registers[vCC]] || 0; this.pc += 4; break; }

      case 0x4C: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; const arr = this.objectHeap.get(this.registers[vBB]); if (arr) arr[this.registers[vCC]] = this.floatRegs[vAA]; this.pc += 4; break; }
      case 0x4D: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; const arr = this.objectHeap.get(this.registers[vBB]); if (arr) arr[this.registers[vCC]] = this.registers[vAA]; this.pc += 4; break; }
      case 0x4E: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; const arr = this.objectHeap.get(this.registers[vBB]); if (arr) { arr[this.registers[vCC]] = this.floatRegs[vAA]; arr[this.registers[vCC] + 1] = this.floatRegs[vAA + 1]; } this.pc += 4; break; }
      case 0x4F: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; const arr = this.objectHeap.get(this.registers[vBB]); if (arr) arr[this.registers[vCC]] = this.registers[vAA]; this.pc += 4; break; }

      // new-instance vAA, type@BBBB
      case 0x22: { const vAA = this.code[this.pc + 1]; const objId = this.nextObjectId++; this.objectHeap.set(objId, {}); this.registers[vAA] = objId; this.pc += 4; break; }
      // new-array vA, vB, type@CCCC
      case 0x23: { const byte2 = this.code[this.pc + 1]; const vA = byte2 & 0xF; const vB = (byte2 >> 4) & 0xF; const length = this.registers[vB]; const arrayId = this.nextObjectId++; this.objectHeap.set(arrayId, new Array(length).fill(0)); this.registers[vA] = arrayId; this.pc += 4; break; }
      // filled-new-array {vC..vG}, type@BBBB
      case 0x24: { const byte2 = this.code[this.pc + 1]; const argCount = (byte2 >> 4) & 0xF; const objId = this.nextObjectId++; const arr: number[] = new Array(argCount).fill(0); this.objectHeap.set(objId, arr); this.registers[byte2 & 0xF] = objId; this.pc += 6; break; }
      // filled-new-array/range {vC..vN}, type@BBBB
      case 0x25: { const byte2 = this.code[this.pc + 1]; const argCount = (byte2 >> 4) & 0xF; const objId = this.nextObjectId++; const arr: number[] = new Array(argCount).fill(0); this.objectHeap.set(objId, arr); this.registers[byte2 & 0xF] = objId; this.pc += 6; break; }

      // fill-array-data vAA, +BBBBBBBB — references inline data payload, skip it
      case 0x26: { this.pc += 6; break; }

      // invoke-virtual/super/direct/static/interface {vC..vG}, meth@BBBB
      case 0x6E: case 0x6F: case 0x70: case 0x71: case 0x72: {
        const byte2 = this.code[this.pc + 1];
        const argCount = (byte2 >> 4) & 0xF;
        const methodIdx = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
        const args: number[] = [];
        if (argCount >= 1) args.push(this.registers[this.code[this.pc + 4] & 0xF]);
        if (argCount >= 2) args.push(this.registers[(this.code[this.pc + 4] >> 4) & 0xF]);
        if (argCount >= 3) args.push(this.registers[this.code[this.pc + 5] & 0xF]);
        if (argCount >= 4) args.push(this.registers[(this.code[this.pc + 5] >> 4) & 0xF]);
        if (argCount >= 5) args.push(this.registers[this.code[this.pc + 6] & 0xF]);

        const handler = this.methodTable.get(methodIdx);
        if (handler) {
          const result = handler(args);
          this.lastResult = result;
          this.lastResultFloat = result;
        } else {
          console.warn(`Dalvik: Unhandled invoke method #${methodIdx} (opcode 0x${opcode.toString(16)})`);
        }
        this.pc += 6;
        break;
      }
      // invoke-virtual/super/direct/static/interface/range {vC..vN}, meth@BBBB
      case 0x73: case 0x74: case 0x75: case 0x76: case 0x77: {
        const byte2 = this.code[this.pc + 1];
        const argCount = (byte2 >> 4) & 0xF;
        const methodIdx = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
        const args: number[] = [];
        const c = this.code[this.pc + 4] | (this.code[this.pc + 5] << 8);
        for (let i = 0; i < argCount; i++) args.push(this.registers[(c >> (i * 4)) & 0xF]);
        const handler = this.methodTable.get(methodIdx);
        if (handler) {
          const r = handler(args);
          this.lastResult = r;
          this.lastResultFloat = r;
        } else {
          console.warn(`Dalvik: Unhandled invoke/range method #${methodIdx} (opcode 0x${opcode.toString(16)})`);
        }
        this.pc += 6;
        break;
      }

      case 0x7D: { const b = this.code[this.pc + 1]; this.floatRegs[b & 0xF] = -this.floatRegs[(b >> 4) & 0xF]; this.pc += 2; break; }
      case 0x7E: { const b = this.code[this.pc + 1]; this.floatRegs[b & 0xF] = -this.floatRegs[(b >> 4) & 0xF]; this.pc += 2; break; }

      case 0x82: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] = this.registers[vB]; this.pc += 2; break; }
      case 0x83: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.registers[vA] = this.floatRegs[vB] | 0; this.pc += 2; break; }
      case 0x84: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] = this.registers[vB] >>> 0; this.pc += 2; break; }
      case 0x85: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] = this.floatRegs[vB]; this.floatRegs[vA + 1] = this.floatRegs[vB + 1]; this.pc += 2; break; }
      case 0x86: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; const buf = new ArrayBuffer(8); const dv = new DataView(buf); dv.setFloat64(0, this.floatRegs[vB], true); this.registers[vA] = dv.getInt32(0, true); this.registers[vA + 1] = dv.getInt32(4, true); this.pc += 2; break; }
      case 0x87: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; const buf = new ArrayBuffer(8); const dv = new DataView(buf); dv.setInt32(0, this.registers[vB], true); dv.setInt32(4, this.registers[vB + 1], true); this.floatRegs[vA] = dv.getFloat64(0, true); this.pc += 2; break; }

      case 0xA0: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; this.floatRegs[vAA] = this.floatRegs[vBB] + this.floatRegs[vCC]; this.pc += 4; break; }
      case 0xA1: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; this.floatRegs[vAA] = this.floatRegs[vBB] - this.floatRegs[vCC]; this.pc += 4; break; }
      case 0xA2: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; this.floatRegs[vAA] = this.floatRegs[vBB] * this.floatRegs[vCC]; this.pc += 4; break; }
      case 0xA3: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; this.floatRegs[vAA] = this.floatRegs[vCC] !== 0 ? this.floatRegs[vBB] / this.floatRegs[vCC] : 0; this.pc += 4; break; }
      case 0xA4: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; this.floatRegs[vAA] = this.floatRegs[vBB] % this.floatRegs[vCC]; this.pc += 4; break; }

      case 0xAB: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; this.floatRegs[vAA] = this.floatRegs[vBB] + this.floatRegs[vCC]; this.pc += 4; break; }
      case 0xAC: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; this.floatRegs[vAA] = this.floatRegs[vBB] - this.floatRegs[vCC]; this.pc += 4; break; }
      case 0xAD: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; this.floatRegs[vAA] = this.floatRegs[vBB] * this.floatRegs[vCC]; this.pc += 4; break; }
      case 0xAE: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; this.floatRegs[vAA] = this.floatRegs[vCC] !== 0 ? this.floatRegs[vBB] / this.floatRegs[vCC] : 0; this.pc += 4; break; }
      case 0xAF: { const vAA = this.code[this.pc + 1]; const vBB = this.code[this.pc + 2]; const vCC = this.code[this.pc + 3]; this.floatRegs[vAA] = this.floatRegs[vBB] % this.floatRegs[vCC]; this.pc += 4; break; }

      case 0xC0: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] += this.floatRegs[vB]; this.pc += 2; break; }
      case 0xC1: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] -= this.floatRegs[vB]; this.pc += 2; break; }
      case 0xC2: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] *= this.floatRegs[vB]; this.pc += 2; break; }
      case 0xC3: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] = this.floatRegs[vB] !== 0 ? this.floatRegs[vA] / this.floatRegs[vB] : 0; this.pc += 2; break; }
      case 0xC4: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] %= this.floatRegs[vB]; this.pc += 2; break; }

      case 0xCB: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] += this.floatRegs[vB]; this.pc += 2; break; }
      case 0xCC: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] -= this.floatRegs[vB]; this.pc += 2; break; }
      case 0xCD: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] *= this.floatRegs[vB]; this.pc += 2; break; }
      case 0xCE: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] = this.floatRegs[vB] !== 0 ? this.floatRegs[vA] / this.floatRegs[vB] : 0; this.pc += 2; break; }
      case 0xCF: { const b = this.code[this.pc + 1]; const vA = b & 0xF, vB = (b >> 4) & 0xF; this.floatRegs[vA] %= this.floatRegs[vB]; this.pc += 2; break; }

      default:
        console.warn(`Dalvik: Unimplemented opcode 0x${opcode.toString(16)} at pc=${this.pc}`);
        this.pc += 2; // Skip unknown opcode
        break;
    }
  }

  getRegister(index: number): number {
    return this.registers[index];
  }

  setRegister(index: number, value: number) {
    this.registers[index] = value;
  }

  getFloatRegister(index: number): number {
    return this.floatRegs[index];
  }

  setFloatRegister(index: number, value: number) {
    this.floatRegs[index] = value;
  }

  registerMethod(idx: number, handler: (args: number[]) => number) {
    this.methodTable.set(idx, handler);
  }

  registerString(idx: number, str: string) {
    this.stringPool.set(idx, str);
  }

  getString(idx: number): string | undefined {
    return this.stringPool.get(idx);
  }

  getLastResult(): number { return this.lastResult; }
  getLastResultFloat(): number { return this.lastResultFloat; }
  setLastResult(val: number, floatVal?: number): void { this.lastResult = val; this.lastResultFloat = floatVal ?? val; }

  // -----------------------------------------------------------------------
  // Public accessors (replace bracket-notation access from unified-runtime)
  // -----------------------------------------------------------------------

  /** Allocate a new object on the heap and return its ID. */
  allocObject(data: Record<string, any> = {}): number {
    const id = this.nextObjectId++;
    this.objectHeap.set(id, data);
    return id;
  }

  /** Look up an object by ID. */
  getObject(id: number): any {
    return this.objectHeap.get(id);
  }

  /** Set a property on a heap object. */
  setObjectField(id: number, key: string, value: any): void {
    const obj = this.objectHeap.get(id);
    if (obj) obj[key] = value;
  }

  /** Get the current nextObjectId (for external allocation coordination). */
  getNextObjectId(): number { return this.nextObjectId; }

  /** Set the next object ID (when externally allocating). */
  setNextObjectId(id: number): void { this.nextObjectId = id; }

  /** Check if a method handler exists for the given method index. */
  hasMethod(idx: number): boolean { return this.methodTable.has(idx); }

  /** Get a copy of the current integer registers. */
  cloneRegisters(): Int32Array { return new Int32Array(this.registers); }

  /** Get a copy of the current float registers. */
  cloneFloatRegs(): Float64Array { return new Float64Array(this.floatRegs); }

  /** Restore integer registers from a snapshot. */
  restoreRegisters(snapshot: Int32Array): void { this.registers.set(snapshot); }

  /** Restore float registers from a snapshot. */
  restoreFloatRegs(snapshot: Float64Array): void { this.floatRegs.set(snapshot); }

  // -----------------------------------------------------------------------
  // Code / PC public setters (replace bracket-notation access from unified-runtime)
  // -----------------------------------------------------------------------

  /** Set the code buffer directly (for resuming execution from a specific bytecode). */
  setCode(code: Uint8Array): void { this.code = code; }

  /** Set the program counter directly. */
  setPC(pc: number): void { this.pc = pc; }

  /** Get the next object ID and advance the counter (for external allocation). */
  allocNextObjectId(): number { return this.nextObjectId++; }

  /** Set a heap object directly. */
  setHeapObject(id: number, data: any): void { this.objectHeap.set(id, data); }

  /** Get a heap object directly. */
  getHeapObject(id: number): any { return this.objectHeap.get(id); }
}
