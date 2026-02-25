import { Decoder, BasicBlock, IRInstruction, IROperand } from '../types';

const REG_NAMES_32 = ['eax', 'ecx', 'edx', 'ebx', 'esp', 'ebp', 'esi', 'edi'];
const REG_NAMES_16 = ['ax', 'cx', 'dx', 'bx', 'sp', 'bp', 'si', 'di'];
const REG_NAMES_8 = ['al', 'cl', 'dl', 'bl', 'ah', 'ch', 'dh', 'bh'];

export class X86Decoder implements Decoder {
    private nextId = 0;
    
    decode(buffer: Uint8Array, offset: number, addr: number): BasicBlock {
        const instructions: IRInstruction[] = [];
        let currentAddr = addr;
        let currentOffset = offset;
        const maxInstructions = 100;
        const successors: number[] = [];
        
        while (currentOffset < buffer.length && instructions.length < maxInstructions) {
            const startOffset = currentOffset;
            const startAddr = currentAddr;
            
            try {
                const result = this.decodeInstruction(buffer, currentOffset, currentAddr);
                if (!result) break;
                
                const { instruction, length } = result;
                instructions.push(instruction);
                
                currentOffset += length;
                currentAddr += length;
                
                // Check for terminating instructions
                if (this.isTerminating(instruction.opcode)) {
                    if (instruction.opcode === 'jmp' && instruction.op1) {
                        const target = typeof instruction.op1.value === 'number' ? instruction.op1.value : null;
                        if (target !== null) successors.push(target);
                    } else if (instruction.opcode === 'ret') {
                        // Return - no successors
                    } else if (['je', 'jne', 'jz', 'jnz', 'jg', 'jge', 'jl', 'jle', 'ja', 'jb', 'jc', 'jnc'].includes(instruction.opcode)) {
                        // Conditional jump - add both targets
                        if (instruction.op1 && typeof instruction.op1.value === 'number') {
                            successors.push(instruction.op1.value);
                        }
                        successors.push(currentAddr); // Fallthrough
                    }
                    break;
                }
            } catch (e) {
                // Unknown instruction - emit a placeholder
                const unknownInstr: IRInstruction = {
                    id: this.nextId++,
                    opcode: 'unknown',
                    addr: startAddr,
                    bytes: buffer.slice(startOffset, startOffset + 1)
                };
                instructions.push(unknownInstr);
                currentOffset++;
                currentAddr++;
            }
        }
        
        return {
            id: addr,
            startAddr: addr,
            endAddr: currentAddr,
            instructions,
            successors
        };
    }
    
    private decodeInstruction(buffer: Uint8Array, offset: number, addr: number): { instruction: IRInstruction; length: number } | null {
        if (offset >= buffer.length) return null;
        
        const opcode = buffer[offset];
        let length = 1;
        
        // Handle two-byte opcodes
        if (opcode === 0x0F && offset + 1 < buffer.length) {
            return this.decodeTwoByteOpcode(buffer, offset, addr);
        }
        
        const instruction = this.decodeOneByteOpcode(buffer, offset, addr, opcode);
        if (!instruction) return null;
        
        length = this.getInstructionLength(buffer, offset, opcode);
        
        return { instruction, length };
    }
    
    private decodeOneByteOpcode(buffer: Uint8Array, offset: number, addr: number, opcode: number): IRInstruction | null {
        const instr: IRInstruction = {
            id: this.nextId++,
            opcode: 'unknown',
            addr
        };
        
        // NOP
        if (opcode === 0x90) {
            instr.opcode = 'nop';
            return instr;
        }
        
        // MOV r32, imm32 (B8-BF)
        if (opcode >= 0xB8 && opcode <= 0xBF) {
            const regIdx = opcode - 0xB8;
            const imm = this.readU32(buffer, offset + 1);
            instr.opcode = 'mov';
            instr.op1 = { type: 'reg', value: REG_NAMES_32[regIdx], size: 32 };
            instr.op2 = { type: 'imm', value: imm, size: 32 };
            return instr;
        }
        
        // MOV r8, imm8 (B0-B7)
        if (opcode >= 0xB0 && opcode <= 0xB7) {
            const regIdx = opcode - 0xB0;
            const imm = this.readU8(buffer, offset + 1);
            instr.opcode = 'mov';
            instr.op1 = { type: 'reg', value: REG_NAMES_8[regIdx], size: 8 };
            instr.op2 = { type: 'imm', value: imm, size: 8 };
            return instr;
        }
        
        // PUSH r32 (50-57)
        if (opcode >= 0x50 && opcode <= 0x57) {
            const regIdx = opcode - 0x50;
            instr.opcode = 'push';
            instr.op1 = { type: 'reg', value: REG_NAMES_32[regIdx], size: 32 };
            return instr;
        }
        
        // POP r32 (58-5F)
        if (opcode >= 0x58 && opcode <= 0x5F) {
            const regIdx = opcode - 0x58;
            instr.opcode = 'pop';
            instr.op1 = { type: 'reg', value: REG_NAMES_32[regIdx], size: 32 };
            return instr;
        }
        
        // INC r32 (40-47)
        if (opcode >= 0x40 && opcode <= 0x47) {
            const regIdx = opcode - 0x40;
            instr.opcode = 'inc';
            instr.op1 = { type: 'reg', value: REG_NAMES_32[regIdx], size: 32 };
            return instr;
        }
        
        // DEC r32 (48-4F)
        if (opcode >= 0x48 && opcode <= 0x4F) {
            const regIdx = opcode - 0x48;
            instr.opcode = 'dec';
            instr.op1 = { type: 'reg', value: REG_NAMES_32[regIdx], size: 32 };
            return instr;
        }
        
        // ADD EAX, imm32 (05)
        if (opcode === 0x05) {
            const imm = this.readU32(buffer, offset + 1);
            instr.opcode = 'add';
            instr.op1 = { type: 'reg', value: 'eax', size: 32 };
            instr.op2 = { type: 'imm', value: imm, size: 32 };
            return instr;
        }
        
        // SUB EAX, imm32 (2D)
        if (opcode === 0x2D) {
            const imm = this.readU32(buffer, offset + 1);
            instr.opcode = 'sub';
            instr.op1 = { type: 'reg', value: 'eax', size: 32 };
            instr.op2 = { type: 'imm', value: imm, size: 32 };
            return instr;
        }
        
        // AND EAX, imm32 (25)
        if (opcode === 0x25) {
            const imm = this.readU32(buffer, offset + 1);
            instr.opcode = 'and';
            instr.op1 = { type: 'reg', value: 'eax', size: 32 };
            instr.op2 = { type: 'imm', value: imm, size: 32 };
            return instr;
        }
        
        // OR EAX, imm32 (0D)
        if (opcode === 0x0D) {
            const imm = this.readU32(buffer, offset + 1);
            instr.opcode = 'or';
            instr.op1 = { type: 'reg', value: 'eax', size: 32 };
            instr.op2 = { type: 'imm', value: imm, size: 32 };
            return instr;
        }
        
        // XOR EAX, imm32 (35)
        if (opcode === 0x35) {
            const imm = this.readU32(buffer, offset + 1);
            instr.opcode = 'xor';
            instr.op1 = { type: 'reg', value: 'eax', size: 32 };
            instr.op2 = { type: 'imm', value: imm, size: 32 };
            return instr;
        }
        
        // CMP EAX, imm32 (3D)
        if (opcode === 0x3D) {
            const imm = this.readU32(buffer, offset + 1);
            instr.opcode = 'cmp';
            instr.op1 = { type: 'reg', value: 'eax', size: 32 };
            instr.op2 = { type: 'imm', value: imm, size: 32 };
            return instr;
        }
        
        // PUSH imm8 (6A)
        if (opcode === 0x6A) {
            const imm = this.readS8(buffer, offset + 1);
            instr.opcode = 'push';
            instr.op1 = { type: 'imm', value: imm, size: 32 };
            return instr;
        }
        
        // PUSH imm32 (68)
        if (opcode === 0x68) {
            const imm = this.readU32(buffer, offset + 1);
            instr.opcode = 'push';
            instr.op1 = { type: 'imm', value: imm, size: 32 };
            return instr;
        }
        
        // JMP rel8 (EB)
        if (opcode === 0xEB) {
            const rel = this.readS8(buffer, offset + 1);
            instr.opcode = 'jmp';
            instr.op1 = { type: 'imm', value: addr + 2 + rel, size: 32 };
            return instr;
        }
        
        // JMP rel32 (E9)
        if (opcode === 0xE9) {
            const rel = this.readS32(buffer, offset + 1);
            instr.opcode = 'jmp';
            instr.op1 = { type: 'imm', value: addr + 5 + rel, size: 32 };
            return instr;
        }
        
        // CALL rel32 (E8)
        if (opcode === 0xE8) {
            const rel = this.readS32(buffer, offset + 1);
            instr.opcode = 'call';
            instr.op1 = { type: 'imm', value: addr + 5 + rel, size: 32 };
            return instr;
        }
        
        // RET (C3)
        if (opcode === 0xC3) {
            instr.opcode = 'ret';
            return instr;
        }
        
        // RET imm16 (C2)
        if (opcode === 0xC2) {
            const imm = this.readU16(buffer, offset + 1);
            instr.opcode = 'ret';
            instr.op1 = { type: 'imm', value: imm, size: 16 };
            return instr;
        }
        
        // HLT (F4)
        if (opcode === 0xF4) {
            instr.opcode = 'hlt';
            return instr;
        }
        
        // INT imm8 (CD)
        if (opcode === 0xCD) {
            const intNum = this.readU8(buffer, offset + 1);
            instr.opcode = 'int';
            instr.op1 = { type: 'imm', value: intNum, size: 8 };
            return instr;
        }
        
        // Conditional jumps (70-7F)
        if (opcode >= 0x70 && opcode <= 0x7F) {
            const rel = this.readS8(buffer, offset + 1);
            const target = addr + 2 + rel;
            const jccOps = ['jo', 'jno', 'jb', 'jnb', 'jz', 'jnz', 'jbe', 'ja',
                           'js', 'jns', 'jp', 'jnp', 'jl', 'jge', 'jle', 'jg'];
            instr.opcode = jccOps[opcode - 0x70];
            instr.op1 = { type: 'imm', value: target, size: 32 };
            return instr;
        }
        
        // Instructions with ModR/M
        if ([0x89, 0x8B, 0x01, 0x03, 0x29, 0x2B, 0x21, 0x23, 0x09, 0x0B, 
             0x31, 0x33, 0x39, 0x3B, 0x85, 0x87, 0x8D, 0x83, 0x81, 0xC7, 0xFF].includes(opcode)) {
            return this.decodeModRM(buffer, offset, addr, opcode);
        }
        
        // XCHG EAX, r32 (91-97)
        if (opcode >= 0x91 && opcode <= 0x97) {
            const regIdx = opcode - 0x90;
            instr.opcode = 'xchg';
            instr.op1 = { type: 'reg', value: 'eax', size: 32 };
            instr.op2 = { type: 'reg', value: REG_NAMES_32[regIdx], size: 32 };
            return instr;
        }
        
        // LEAVE (C9)
        if (opcode === 0xC9) {
            instr.opcode = 'leave';
            return instr;
        }
        
        // NOP multi-byte (0F 1F)
        if (opcode === 0x0F) {
            // Will be handled by two-byte decoder
            instr.opcode = 'nop';
            return instr;
        }
        
        // LEA r32, m (8D) - handled by ModR/M
        
        // Default: mark as unknown
        instr.opcode = 'unknown';
        instr.bytes = new Uint8Array([opcode]);
        return instr;
    }
    
    private decodeTwoByteOpcode(buffer: Uint8Array, offset: number, addr: number): { instruction: IRInstruction; length: number } | null {
        if (offset + 1 >= buffer.length) return null;
        
        const opcode2 = buffer[offset + 1];
        const instr: IRInstruction = {
            id: this.nextId++,
            opcode: 'unknown',
            addr
        };
        
        // MOV r32, CRn (0F 20) - privileged
        // MOV CRn, r32 (0F 22) - privileged
        
        // SYSCALL (0F 05)
        if (opcode2 === 0x05) {
            instr.opcode = 'syscall';
            return { instruction: instr, length: 2 };
        }
        
        // CPUID (0F A2)
        if (opcode2 === 0xA2) {
            instr.opcode = 'cpuid';
            return { instruction: instr, length: 2 };
        }
        
        // RDTSC (0F 31)
        if (opcode2 === 0x31) {
            instr.opcode = 'rdtsc';
            return { instruction: instr, length: 2 };
        }
        
        // RDMSR (0F 32) / WRMSR (0F 30) - privileged
        
        // Conditional jumps rel32 (0F 80-8F)
        if (opcode2 >= 0x80 && opcode2 <= 0x8F) {
            const rel = this.readS32(buffer, offset + 2);
            const target = addr + 6 + rel;
            const jccOps = ['jo', 'jno', 'jb', 'jnb', 'jz', 'jnz', 'jbe', 'ja',
                           'js', 'jns', 'jp', 'jnp', 'jl', 'jge', 'jle', 'jg'];
            instr.opcode = jccOps[opcode2 - 0x80];
            instr.op1 = { type: 'imm', value: target, size: 32 };
            return { instruction: instr, length: 6 };
        }
        
        // IMUL r32, r/m32 (0F AF)
        if (opcode2 === 0xAF) {
            const result = this.decodeModRM(buffer, offset + 2, addr, 0xAF);
            if (result) {
                result.opcode = 'imul';
                return { instruction: result, length: 2 + this.getModRMLength(buffer, offset + 2) };
            }
        }
        
        // MOVZX r32, r/m8 (0F B6) / r16 (0F B7)
        if (opcode2 === 0xB6 || opcode2 === 0xB7) {
            const result = this.decodeModRM(buffer, offset + 2, addr, opcode2);
            if (result) {
                result.opcode = 'movzx';
                return { instruction: result, length: 2 + this.getModRMLength(buffer, offset + 2) };
            }
        }
        
        // MOVSX r32, r/m8 (0F BE) / r16 (0F BF)
        if (opcode2 === 0xBE || opcode2 === 0xBF) {
            const result = this.decodeModRM(buffer, offset + 2, addr, opcode2);
            if (result) {
                result.opcode = 'movsx';
                return { instruction: result, length: 2 + this.getModRMLength(buffer, offset + 2) };
            }
        }
        
        // NOP (0F 1F)
        if (opcode2 === 0x1F) {
            instr.opcode = 'nop';
            const modrm = buffer[offset + 2];
            const length = this.getModRMLength(buffer, offset + 2);
            return { instruction: instr, length: 2 + length };
        }
        
        return { instruction: instr, length: 2 };
    }
    
    private decodeModRM(buffer: Uint8Array, offset: number, addr: number, opcode: number): IRInstruction | null {
        if (offset + 1 >= buffer.length) return null;
        
        const modrm = buffer[offset + 1];
        const mod = (modrm >> 6) & 3;
        const reg = (modrm >> 3) & 7;
        const rm = modrm & 7;
        
        const instr: IRInstruction = {
            id: this.nextId++,
            opcode: 'unknown',
            addr
        };
        
        // Map opcode to operation
        const opMap: { [key: number]: string } = {
            0x89: 'mov', 0x8B: 'mov',
            0x01: 'add', 0x03: 'add',
            0x29: 'sub', 0x2B: 'sub',
            0x21: 'and', 0x23: 'and',
            0x09: 'or', 0x0B: 'or',
            0x31: 'xor', 0x33: 'xor',
            0x39: 'cmp', 0x3B: 'cmp',
            0x85: 'test', 0x87: 'xchg',
            0x8D: 'lea',
            0x83: 'grp83', 0x81: 'grp81',
            0xC7: 'mov_imm',
            0xFF: 'grpff'
        };
        
        instr.opcode = opMap[opcode] || 'unknown';
        
        if (mod === 3) {
            // Register-to-register
            if (opcode === 0x89) {
                // MOV r/m32, r32
                instr.op1 = { type: 'reg', value: REG_NAMES_32[rm], size: 32 };
                instr.op2 = { type: 'reg', value: REG_NAMES_32[reg], size: 32 };
            } else if (opcode === 0x8B) {
                // MOV r32, r/m32
                instr.op1 = { type: 'reg', value: REG_NAMES_32[reg], size: 32 };
                instr.op2 = { type: 'reg', value: REG_NAMES_32[rm], size: 32 };
            } else if (opcode === 0x83) {
                // Group with imm8
                const imm = this.readS8(buffer, offset + 2);
                const subOps = ['add', 'or', 'adc', 'sbb', 'and', 'sub', 'xor', 'cmp'];
                instr.opcode = subOps[reg] || 'unknown';
                instr.op1 = { type: 'reg', value: REG_NAMES_32[rm], size: 32 };
                instr.op2 = { type: 'imm', value: imm, size: 32 };
            } else if (opcode === 0x81) {
                // Group with imm32
                const imm = this.readU32(buffer, offset + 2);
                const subOps = ['add', 'or', 'adc', 'sbb', 'and', 'sub', 'xor', 'cmp'];
                instr.opcode = subOps[reg] || 'unknown';
                instr.op1 = { type: 'reg', value: REG_NAMES_32[rm], size: 32 };
                instr.op2 = { type: 'imm', value: imm, size: 32 };
            } else if (opcode === 0xC7) {
                // MOV r/m32, imm32
                const imm = this.readU32(buffer, offset + 2);
                instr.opcode = 'mov';
                instr.op1 = { type: 'reg', value: REG_NAMES_32[rm], size: 32 };
                instr.op2 = { type: 'imm', value: imm, size: 32 };
            } else if (opcode === 0xFF) {
                // Group FF
                const subOps = ['inc', 'dec', 'call', 'callf', 'jmp', 'jmpf', 'push', 'unknown'];
                instr.opcode = subOps[reg] || 'unknown';
                instr.op1 = { type: 'reg', value: REG_NAMES_32[rm], size: 32 };
            } else {
                instr.op1 = { type: 'reg', value: REG_NAMES_32[reg], size: 32 };
                instr.op2 = { type: 'reg', value: REG_NAMES_32[rm], size: 32 };
            }
        } else {
            // Memory operand - simplified handling
            if (opcode === 0x8D) {
                // LEA
                instr.op1 = { type: 'reg', value: REG_NAMES_32[reg], size: 32 };
                instr.op2 = { type: 'mem', value: this.formatMemoryOperand(buffer, offset + 1, mod, rm), size: 32 };
            } else {
                instr.op1 = { type: 'reg', value: REG_NAMES_32[reg], size: 32 };
                instr.op2 = { type: 'mem', value: `[${REG_NAMES_32[rm]}]`, size: 32 };
            }
        }
        
        return instr;
    }
    
    private formatMemoryOperand(buffer: Uint8Array, modrmOffset: number, mod: number, rm: number): string {
        const modrm = buffer[modrmOffset];
        
        if (mod === 0 && rm === 5) {
            // disp32
            const disp = this.readU32(buffer, modrmOffset + 1);
            return `0x${disp.toString(16)}`;
        }
        
        // Simplified - just return register indirect
        return `[${REG_NAMES_32[rm]}]`;
    }
    
    private getModRMLength(buffer: Uint8Array, offset: number): number {
        if (offset >= buffer.length) return 1;
        
        const modrm = buffer[offset + 1];
        const mod = (modrm >> 6) & 3;
        const rm = modrm & 7;
        
        if (mod === 3) return 1; // Register
        if (mod === 0) {
            if (rm === 5) return 5; // disp32
            if (rm === 4) return 2; // SIB
            return 1;
        }
        if (mod === 1) {
            if (rm === 4) return 3; // SIB + disp8
            return 2; // disp8
        }
        if (mod === 2) {
            if (rm === 4) return 6; // SIB + disp32
            return 5; // disp32
        }
        return 1;
    }
    
    private getInstructionLength(buffer: Uint8Array, offset: number, opcode: number): number {
        // Simple length calculation based on opcode
        const lengths: { [key: number]: number } = {
            0x90: 1, // NOP
            0xC3: 1, // RET
            0xC9: 1, // LEAVE
            0xF4: 1, // HLT
            0x05: 5, 0x2D: 5, 0x25: 5, 0x0D: 5, 0x35: 5, 0x3D: 5, // op EAX, imm32
            0x68: 5, // PUSH imm32
            0x6A: 2, // PUSH imm8
            0xEB: 2, // JMP rel8
            0xE9: 5, // JMP rel32
            0xE8: 5, // CALL rel32
            0xCD: 2, // INT imm8
            0xC2: 3, // RET imm16
        };
        
        if (lengths[opcode]) return lengths[opcode];
        
        // MOV r32, imm32 (B8-BF)
        if (opcode >= 0xB8 && opcode <= 0xBF) return 5;
        // MOV r8, imm8 (B0-B7)
        if (opcode >= 0xB0 && opcode <= 0xB7) return 2;
        // PUSH/POP r32 (50-5F)
        if (opcode >= 0x50 && opcode <= 0x5F) return 1;
        // INC/DEC r32 (40-4F)
        if (opcode >= 0x40 && opcode <= 0x4F) return 1;
        // XCHG EAX, r32 (91-97)
        if (opcode >= 0x91 && opcode <= 0x97) return 1;
        // Conditional jumps (70-7F)
        if (opcode >= 0x70 && opcode <= 0x7F) return 2;
        
        // Instructions with ModR/M
        if ([0x89, 0x8B, 0x01, 0x03, 0x29, 0x2B, 0x21, 0x23, 0x09, 0x0B,
             0x31, 0x33, 0x39, 0x3B, 0x85, 0x87, 0x8D].includes(opcode)) {
            return 1 + this.getModRMLength(buffer, offset);
        }
        
        if (opcode === 0x83) {
            return 2 + this.getModRMLength(buffer, offset);
        }
        
        if (opcode === 0x81) {
            return 5 + this.getModRMLength(buffer, offset) - 1;
        }
        
        if (opcode === 0xC7) {
            return 5 + this.getModRMLength(buffer, offset) - 1;
        }
        
        if (opcode === 0xFF) {
            return 1 + this.getModRMLength(buffer, offset);
        }
        
        return 1;
    }
    
    private isTerminating(opcode: string): boolean {
        return ['ret', 'jmp', 'hlt', 'int', 'syscall'].includes(opcode);
    }
    
    private readU8(buffer: Uint8Array, offset: number): number {
        return offset < buffer.length ? buffer[offset] : 0;
    }
    
    private readS8(buffer: Uint8Array, offset: number): number {
        const val = this.readU8(buffer, offset);
        return val > 127 ? val - 256 : val;
    }
    
    private readU16(buffer: Uint8Array, offset: number): number {
        if (offset + 1 >= buffer.length) return 0;
        return buffer[offset] | (buffer[offset + 1] << 8);
    }
    
    private readU32(buffer: Uint8Array, offset: number): number {
        if (offset + 3 >= buffer.length) return 0;
        return buffer[offset] | (buffer[offset + 1] << 8) | 
               (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24);
    }
    
    private readS32(buffer: Uint8Array, offset: number): number {
        const val = this.readU32(buffer, offset);
        return val > 0x7FFFFFFF ? val - 0x100000000 : val;
    }
}
