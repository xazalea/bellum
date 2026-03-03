import { CPU, Registers, MemoryManager } from './interfaces';

// Flags
const CF = 1 << 0;  // Carry
const ZF = 1 << 6;  // Zero
const SF = 1 << 7;  // Sign
const OF = 1 << 11; // Overflow

export class SimpleInterpreter implements CPU {
    private regs: Registers;
    private memory: MemoryManager;
    private running: boolean = false;
    public onInterrupt: (interrupt: number) => void = () => {};

    constructor(memory: MemoryManager) {
        this.memory = memory;
        this.regs = {
            eax: 0, ebx: 0, ecx: 0, edx: 0,
            esi: 0, edi: 0, esp: 0, ebp: 0,
            eip: 0, flags: 0
        };
    }

    reset() {
        this.regs = {
            eax: 0, ebx: 0, ecx: 0, edx: 0,
            esi: 0, edi: 0, esp: 0, ebp: 0,
            eip: 0, flags: 0
        };
        this.running = false;
    }

    getRegisters(): Registers {
        return { ...this.regs };
    }

    setRegisters(regs: Registers) {
        this.regs = { ...regs };
    }

    step() {
        if (!this.running) return;

        const opcode = this.memory.readU8(this.regs.eip);
        this.regs.eip++;

        try {
            this.executeOpcode(opcode);
        } catch (e: any) {
            console.error(`x86: Error at 0x${(this.regs.eip-1).toString(16)}:`, e);
            this.running = false;
        }
    }

    private executeOpcode(opcode: number) {
        switch (opcode) {
            // ===== NOP =====
            case 0x90: break;

            // ===== MOV immediate to register =====
            case 0xB0: // MOV AL, imm8
                this.regs.eax = (this.regs.eax & 0xFFFFFF00) | this.memory.readU8(this.regs.eip++);
                break;
            case 0xB1: // MOV CL, imm8
                this.regs.ecx = (this.regs.ecx & 0xFFFFFF00) | this.memory.readU8(this.regs.eip++);
                break;
            case 0xB2: // MOV DL, imm8
                this.regs.edx = (this.regs.edx & 0xFFFFFF00) | this.memory.readU8(this.regs.eip++);
                break;
            case 0xB3: // MOV BL, imm8
                this.regs.ebx = (this.regs.ebx & 0xFFFFFF00) | this.memory.readU8(this.regs.eip++);
                break;
            case 0xB8: // MOV EAX, imm32
                this.regs.eax = this.memory.readU32(this.regs.eip);
                this.regs.eip += 4;
                break;
            case 0xB9: // MOV ECX, imm32
                this.regs.ecx = this.memory.readU32(this.regs.eip);
                this.regs.eip += 4;
                break;
            case 0xBA: // MOV EDX, imm32
                this.regs.edx = this.memory.readU32(this.regs.eip);
                this.regs.eip += 4;
                break;
            case 0xBB: // MOV EBX, imm32
                this.regs.ebx = this.memory.readU32(this.regs.eip);
                this.regs.eip += 4;
                break;
            case 0xBC: // MOV ESP, imm32
                this.regs.esp = this.memory.readU32(this.regs.eip);
                this.regs.eip += 4;
                break;
            case 0xBD: // MOV EBP, imm32
                this.regs.ebp = this.memory.readU32(this.regs.eip);
                this.regs.eip += 4;
                break;
            case 0xBE: // MOV ESI, imm32
                this.regs.esi = this.memory.readU32(this.regs.eip);
                this.regs.eip += 4;
                break;
            case 0xBF: // MOV EDI, imm32
                this.regs.edi = this.memory.readU32(this.regs.eip);
                this.regs.eip += 4;
                break;

            // ===== MOV reg, reg =====
            case 0x89: // MOV r/m32, r32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) { // Register-to-register
                        this.setReg32(rm, this.getReg32(reg));
                    } else {
                        console.warn('MOV with memory addressing not fully implemented');
                    }
                }
                break;

            case 0x8B: // MOV r32, r/m32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) { // Register-to-register
                        this.setReg32(reg, this.getReg32(rm));
                    } else {
                        console.warn('MOV with memory addressing not fully implemented');
                    }
                }
                break;

            // ===== PUSH =====
            case 0x50: // PUSH EAX
            case 0x51: // PUSH ECX
            case 0x52: // PUSH EDX
            case 0x53: // PUSH EBX
            case 0x54: // PUSH ESP
            case 0x55: // PUSH EBP
            case 0x56: // PUSH ESI
            case 0x57: // PUSH EDI
                {
                    const regIdx = opcode - 0x50;
                    this.push32(this.getReg32(regIdx));
                }
                break;

            case 0x68: // PUSH imm32
                {
                    const val = this.memory.readU32(this.regs.eip);
                    this.regs.eip += 4;
                    this.push32(val);
                }
                break;

            case 0x6A: // PUSH imm8
                {
                    let val = this.memory.readU8(this.regs.eip++);
                    if (val > 127) val -= 256; // Sign extend
                    this.push32(val);
                }
                break;

            // ===== POP =====
            case 0x58: // POP EAX
            case 0x59: // POP ECX
            case 0x5A: // POP EDX
            case 0x5B: // POP EBX
            case 0x5C: // POP ESP
            case 0x5D: // POP EBP
            case 0x5E: // POP ESI
            case 0x5F: // POP EDI
                {
                    const regIdx = opcode - 0x58;
                    this.setReg32(regIdx, this.pop32());
                }
                break;

            // ===== ADD =====
            case 0x01: // ADD r/m32, r32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(rm) + this.getReg32(reg);
                        this.setReg32(rm, result);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x03: // ADD r32, r/m32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(reg) + this.getReg32(rm);
                        this.setReg32(reg, result);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x05: // ADD EAX, imm32
                {
                    const imm = this.memory.readU32(this.regs.eip);
                    this.regs.eip += 4;
                    this.regs.eax = this.regs.eax + imm;
                    this.updateFlags(this.regs.eax);
                }
                break;

            case 0x83: // ADD/SUB/AND/OR/XOR/CMP r/m32, imm8
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const subop = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    let imm = this.memory.readU8(this.regs.eip++);
                    if (imm > 127) imm -= 256; // Sign extend
                    
                    if (mod === 3) {
                        const val = this.getReg32(rm);
                        let result;
                        
                        switch (subop) {
                            case 0: // ADD
                                result = val + imm;
                                this.setReg32(rm, result);
                                break;
                            case 1: // OR
                                result = val | imm;
                                this.setReg32(rm, result);
                                break;
                            case 4: // AND
                                result = val & imm;
                                this.setReg32(rm, result);
                                break;
                            case 5: // SUB
                                result = val - imm;
                                this.setReg32(rm, result);
                                break;
                            case 6: // XOR
                                result = val ^ imm;
                                this.setReg32(rm, result);
                                break;
                            case 7: // CMP
                                result = val - imm;
                                break; // Don't store result
                            default:
                                result = val;
                        }
                        
                        this.updateFlags(result);
                    }
                }
                break;

            // ===== SUB =====
            case 0x29: // SUB r/m32, r32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(rm) - this.getReg32(reg);
                        this.setReg32(rm, result);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x2B: // SUB r32, r/m32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(reg) - this.getReg32(rm);
                        this.setReg32(reg, result);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x2D: // SUB EAX, imm32
                {
                    const imm = this.memory.readU32(this.regs.eip);
                    this.regs.eip += 4;
                    this.regs.eax = this.regs.eax - imm;
                    this.updateFlags(this.regs.eax);
                }
                break;

            // ===== AND =====
            case 0x21: // AND r/m32, r32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(rm) & this.getReg32(reg);
                        this.setReg32(rm, result);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x23: // AND r32, r/m32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(reg) & this.getReg32(rm);
                        this.setReg32(reg, result);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x25: // AND EAX, imm32
                {
                    const imm = this.memory.readU32(this.regs.eip);
                    this.regs.eip += 4;
                    this.regs.eax &= imm;
                    this.updateFlags(this.regs.eax);
                }
                break;

            // ===== OR =====
            case 0x09: // OR r/m32, r32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(rm) | this.getReg32(reg);
                        this.setReg32(rm, result);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x0B: // OR r32, r/m32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(reg) | this.getReg32(rm);
                        this.setReg32(reg, result);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x0D: // OR EAX, imm32
                {
                    const imm = this.memory.readU32(this.regs.eip);
                    this.regs.eip += 4;
                    this.regs.eax |= imm;
                    this.updateFlags(this.regs.eax);
                }
                break;

            // ===== XOR =====
            case 0x31: // XOR r/m32, r32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(rm) ^ this.getReg32(reg);
                        this.setReg32(rm, result);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x33: // XOR r32, r/m32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(reg) ^ this.getReg32(rm);
                        this.setReg32(reg, result);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x35: // XOR EAX, imm32
                {
                    const imm = this.memory.readU32(this.regs.eip);
                    this.regs.eip += 4;
                    this.regs.eax ^= imm;
                    this.updateFlags(this.regs.eax);
                }
                break;

            // ===== CMP =====
            case 0x39: // CMP r/m32, r32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(rm) - this.getReg32(reg);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x3B: // CMP r32, r/m32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(reg) - this.getReg32(rm);
                        this.updateFlags(result);
                    }
                }
                break;

            case 0x3D: // CMP EAX, imm32
                {
                    const imm = this.memory.readU32(this.regs.eip);
                    this.regs.eip += 4;
                    const result = this.regs.eax - imm;
                    this.updateFlags(result);
                }
                break;

            // ===== TEST =====
            case 0x85: // TEST r/m32, r32
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const mod = (modrm >> 6) & 3;
                    const reg = (modrm >> 3) & 7;
                    const rm = modrm & 7;
                    
                    if (mod === 3) {
                        const result = this.getReg32(rm) & this.getReg32(reg);
                        this.updateFlags(result);
                    }
                }
                break;

            // ===== INC/DEC =====
            case 0x40: // INC EAX
            case 0x41: // INC ECX
            case 0x42: // INC EDX
            case 0x43: // INC EBX
            case 0x44: // INC ESP
            case 0x45: // INC EBP
            case 0x46: // INC ESI
            case 0x47: // INC EDI
                {
                    const regIdx = opcode - 0x40;
                    const result = this.getReg32(regIdx) + 1;
                    this.setReg32(regIdx, result);
                    this.updateFlags(result);
                }
                break;

            case 0x48: // DEC EAX
            case 0x49: // DEC ECX
            case 0x4A: // DEC EDX
            case 0x4B: // DEC EBX
            case 0x4C: // DEC ESP
            case 0x4D: // DEC EBP
            case 0x4E: // DEC ESI
            case 0x4F: // DEC EDI
                {
                    const regIdx = opcode - 0x48;
                    const result = this.getReg32(regIdx) - 1;
                    this.setReg32(regIdx, result);
                    this.updateFlags(result);
                }
                break;

            // ===== JMP =====
            case 0xE9: // JMP rel32
                {
                    const offset = this.memory.readU32(this.regs.eip);
                    const signedOffset = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
                    this.regs.eip += 4 + signedOffset;
                }
                break;

            case 0xEB: // JMP rel8
                {
                    let offset = this.memory.readU8(this.regs.eip++);
                    if (offset > 127) offset -= 256;
                    this.regs.eip += offset;
                }
                break;

            // ===== Conditional Jumps =====
            case 0x74: // JE/JZ rel8
                {
                    let offset = this.memory.readU8(this.regs.eip++);
                    if (offset > 127) offset -= 256;
                    if (this.regs.flags & ZF) {
                        this.regs.eip += offset;
                    }
                }
                break;

            case 0x75: // JNE/JNZ rel8
                {
                    let offset = this.memory.readU8(this.regs.eip++);
                    if (offset > 127) offset -= 256;
                    if (!(this.regs.flags & ZF)) {
                        this.regs.eip += offset;
                    }
                }
                break;

            case 0x7C: // JL/JNGE rel8
                {
                    let offset = this.memory.readU8(this.regs.eip++);
                    if (offset > 127) offset -= 256;
                    if ((this.regs.flags & SF) !== 0) {
                        this.regs.eip += offset;
                    }
                }
                break;

            case 0x7D: // JGE/JNL rel8
                {
                    let offset = this.memory.readU8(this.regs.eip++);
                    if (offset > 127) offset -= 256;
                    if ((this.regs.flags & SF) === 0) {
                        this.regs.eip += offset;
                    }
                }
                break;

            case 0x7E: // JLE/JNG rel8
                {
                    let offset = this.memory.readU8(this.regs.eip++);
                    if (offset > 127) offset -= 256;
                    if ((this.regs.flags & ZF) || (this.regs.flags & SF)) {
                        this.regs.eip += offset;
                    }
                }
                break;

            case 0x7F: // JG/JNLE rel8
                {
                    let offset = this.memory.readU8(this.regs.eip++);
                    if (offset > 127) offset -= 256;
                    if (!(this.regs.flags & ZF) && !(this.regs.flags & SF)) {
                        this.regs.eip += offset;
                    }
                }
                break;

            // ===== CALL =====
            case 0xE8: // CALL rel32
                {
                    const offset = this.memory.readU32(this.regs.eip);
                    const signedOffset = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
                    this.regs.eip += 4;
                    this.push32(this.regs.eip); // Return address
                    this.regs.eip += signedOffset;
                }
                break;

            // ===== RET =====
            case 0xC3: // RET near
                this.regs.eip = this.pop32();
                break;

            case 0xC2: // RET imm16
                {
                    const imm = this.memory.readU16(this.regs.eip);
                    this.regs.eip += 2;
                    this.regs.eip = this.pop32();
                    this.regs.esp += imm; // Pop arguments
                }
                break;

            // ===== INT =====
            case 0xCD: // INT imm8
                {
                    const interrupt = this.memory.readU8(this.regs.eip++);
                    this.handleInterrupt(interrupt);
                }
                break;

            // ===== LEA =====
            case 0x8D: // LEA r32, m
                {
                    const modrm = this.memory.readU8(this.regs.eip++);
                    const reg = (modrm >> 3) & 7;
                    // Simplified: just copy for now
                    console.warn('LEA not fully implemented');
                }
                break;

            // ===== HLT =====
            case 0xF4:
                this.running = false;
                break;

            default:
                console.warn(`Unknown x86 Opcode: 0x${opcode.toString(16).toUpperCase()} at 0x${(this.regs.eip-1).toString(16).toUpperCase()}`);
                this.running = false;
                break;
        }
    }

    run(cycles: number) {
        this.running = true;
        let count = 0;
        while(this.running && count < cycles) {
            this.step();
            count++;
        }
    }

    private getReg32(idx: number): number {
        switch (idx) {
            case 0: return this.regs.eax;
            case 1: return this.regs.ecx;
            case 2: return this.regs.edx;
            case 3: return this.regs.ebx;
            case 4: return this.regs.esp;
            case 5: return this.regs.ebp;
            case 6: return this.regs.esi;
            case 7: return this.regs.edi;
            default: return 0;
        }
    }

    private setReg32(idx: number, val: number) {
        val = val | 0; // Ensure 32-bit signed
        switch (idx) {
            case 0: this.regs.eax = val; break;
            case 1: this.regs.ecx = val; break;
            case 2: this.regs.edx = val; break;
            case 3: this.regs.ebx = val; break;
            case 4: this.regs.esp = val; break;
            case 5: this.regs.ebp = val; break;
            case 6: this.regs.esi = val; break;
            case 7: this.regs.edi = val; break;
        }
    }

    private push32(val: number) {
        this.regs.esp -= 4;
        this.memory.writeU32(this.regs.esp, val);
    }

    private pop32(): number {
        const val = this.memory.readU32(this.regs.esp);
        this.regs.esp += 4;
        return val;
    }

    private updateFlags(result: number) {
        // Ensure 32-bit signed
        result = result | 0;
        
        // Zero flag
        if (result === 0) {
            this.regs.flags |= ZF;
        } else {
            this.regs.flags &= ~ZF;
        }
        
        // Sign flag
        if (result < 0) {
            this.regs.flags |= SF;
        } else {
            this.regs.flags &= ~SF;
        }
    }

    private handleInterrupt(interrupt: number) {
        this.onInterrupt(interrupt);
    }
}
