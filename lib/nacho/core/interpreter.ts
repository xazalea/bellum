import { CPU, Registers, MemoryManager } from './interfaces';

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

        // Fetch
        const opcode = this.memory.readU8(this.regs.eip);
        this.regs.eip++;

        // Decode & Execute
        switch (opcode) {
            case 0x90: // NOP
                break;
            case 0xB8: // MOV EAX, imm32
                this.regs.eax = this.memory.readU32(this.regs.eip);
                this.regs.eip += 4;
                break;
            case 0xBB: // MOV EBX, imm32
                this.regs.ebx = this.memory.readU32(this.regs.eip);
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
            case 0x01: // ADD [reg], [reg] (Simplified for PoC)
                 // Expecting ADD EAX, EBX (01 D8)
                 const modrm = this.memory.readU8(this.regs.eip);
                 if (modrm === 0xD8) { // ADD EAX, EBX
                     this.regs.eax = (this.regs.eax + this.regs.ebx) | 0;
                     this.regs.eip++;
                 } else {
                     console.warn(`Unimplemented ModR/M for ADD: ${modrm.toString(16)}`);
                     this.regs.eip++; // Skip modrm
                 }
                 break;
            case 0xCD: // INT imm8
                const interrupt = this.memory.readU8(this.regs.eip);
                this.regs.eip++;
                this.handleInterrupt(interrupt);
                break;
            case 0xC3: // RET
                this.running = false;
                break;
            case 0xF4: // HLT
                this.running = false;
                break;
            default:
                console.warn(`Unknown Opcode: 0x${opcode.toString(16).toUpperCase()} at 0x${(this.regs.eip-1).toString(16).toUpperCase()}`);
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

    private handleInterrupt(interrupt: number) {
        this.onInterrupt(interrupt);
    }
}

