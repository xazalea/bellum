/**
 * Dalvik Bytecode Interpreter
 * Executes basic Dalvik instructions
 */

import { AndroidRuntime } from './runtime';

export class DalvikInterpreter {
  private runtime: AndroidRuntime;
  private registers: Int32Array = new Int32Array(256); // v0-v255
  private pc: number = 0;
  private code: Uint8Array = new Uint8Array(0);

  constructor(runtime: AndroidRuntime) {
    this.runtime = runtime;
  }

  /**
   * execute method
   */
  async execute(code: Uint8Array) {
    this.code = code;
    this.pc = 0;
    
    while (this.pc < this.code.length) {
      const opcode = this.code[this.pc];
      
      switch (opcode) {
        case 0x00: // nop
          this.pc += 2; // instructions are 16-bit aligned/units usually, but opcodes vary. NOP is 1 unit (2 bytes) usually 00 00
          break;
          
        case 0x01: // move vA, vB (4 bits each in 2nd byte)
          {
            const byte2 = this.code[this.pc + 1];
            const vA = byte2 & 0xF;
            const vB = (byte2 >> 4) & 0xF;
            this.registers[vA] = this.registers[vB];
            this.pc += 2;
          }
          break;

        case 0x0E: // return-void
          console.log("Dalvik: return-void");
          return;

        case 0x12: // const/4 vA, #+B
            {
                // B is signed 4-bit
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
                // sign extend 16-bit
                const signedVal = (val << 16) >> 16;
                this.registers[vAA] = signedVal;
                this.pc += 4;
            }
            break;

        default:
          console.warn(`Dalvik: Unknown opcode 0x${opcode.toString(16)} at pc=${this.pc}`);
          this.pc += 2; // Skip 2 bytes and hope for best? Real impl needs opcode table length
          break;
      }
    }
  }
}
