/**
 * Dalvik Bytecode Interpreter
 * Enhanced implementation with comprehensive opcode support
 */

import { AndroidRuntime } from './runtime';

export class DalvikInterpreter {
  private runtime: AndroidRuntime;
  private registers: Int32Array = new Int32Array(256); // v0-v255
  private pc: number = 0;
  private code: Uint8Array = new Uint8Array(0);
  private objectHeap: Map<number, any> = new Map(); // Simple object storage
  private nextObjectId: number = 1;

  constructor(runtime: AndroidRuntime) {
    this.runtime = runtime;
  }

  /**
   * Execute Dalvik bytecode
   */
  async execute(code: Uint8Array) {
    this.code = code;
    this.pc = 0;
    
    while (this.pc < this.code.length) {
      const opcode = this.code[this.pc];
      
      try {
        await this.executeInstruction(opcode);
      } catch (e: any) {
        console.error(`Dalvik: Error at pc=${this.pc}, opcode=0x${opcode.toString(16)}:`, e);
        return;
      }
    }
  }

  private async executeInstruction(opcode: number) {
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
          // Result register would be set by invoke operations
          this.pc += 2;
        }
        break;

      // ===== RETURN OPERATIONS =====
      case 0x0E: // return-void
        return;

      case 0x0F: // return vAA
        {
          const vAA = this.code[this.pc + 1];
          console.log(`Dalvik: return ${this.registers[vAA]}`);
          return;
        }

      case 0x10: // return-wide vAA
        {
          const vAA = this.code[this.pc + 1];
          console.log(`Dalvik: return-wide ${this.registers[vAA]}, ${this.registers[vAA + 1]}`);
          return;
        }

      case 0x11: // return-object vAA
        {
          const vAA = this.code[this.pc + 1];
          console.log(`Dalvik: return-object ${this.registers[vAA]}`);
          return;
        }

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

      // ===== NEW-INSTANCE =====
      case 0x22: // new-instance vAA, type@BBBB
        {
          const vAA = this.code[this.pc + 1];
          const objId = this.nextObjectId++;
          this.objectHeap.set(objId, {}); // Empty object
          this.registers[vAA] = objId;
          this.pc += 4;
        }
        break;

      // ===== NEW-ARRAY =====
      case 0x23: // new-array vA, vB, type@CCCC
        {
          const byte2 = this.code[this.pc + 1];
          const vA = byte2 & 0xF;
          const vB = (byte2 >> 4) & 0xF;
          const length = this.registers[vB];
          const arrayId = this.nextObjectId++;
          this.objectHeap.set(arrayId, new Array(length).fill(0));
          this.registers[vA] = arrayId;
          this.pc += 4;
        }
        break;

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

      // if-*z (compare with zero)
      case 0x38: // if-eqz vAA, +BBBB
        {
          const vAA = this.code[this.pc + 1];
          const offset = (this.code[this.pc + 3] << 8) | this.code[this.pc + 2];
          const signedOffset = offset > 32767 ? offset - 65536 : offset;
          if (this.registers[vAA] === 0) {
            this.pc += signedOffset * 2;
          } else {
            this.pc += 4;
          }
        }
        break;

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

      // ===== ARRAY GET/PUT =====
      case 0x44: // aget vAA, vBB, vCC
        {
          const vAA = this.code[this.pc + 1];
          const vBB = this.code[this.pc + 2];
          const vCC = this.code[this.pc + 3];
          const arrayRef = this.registers[vBB];
          const index = this.registers[vCC];
          const array = this.objectHeap.get(arrayRef);
          this.registers[vAA] = array?.[index] || 0;
          this.pc += 4;
        }
        break;

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

      // ===== INVOKE =====
      case 0x6E: // invoke-virtual {vC, vD, vE, vF, vG}, meth@BBBB
      case 0x6F: // invoke-super {vC, vD, vE, vF, vG}, meth@BBBB
      case 0x70: // invoke-direct {vC, vD, vE, vF, vG}, meth@BBBB
      case 0x71: // invoke-static {vC, vD, vE, vF, vG}, meth@BBBB
      case 0x72: // invoke-interface {vC, vD, vE, vF, vG}, meth@BBBB
        {
          // Method invocation - simplified
          console.log(`Dalvik: invoke opcode=0x${opcode.toString(16)}`);
          this.pc += 6;
        }
        break;

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
}
