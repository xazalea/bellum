export interface Registers {
    eax: number;
    ebx: number;
    ecx: number;
    edx: number;
    esi: number;
    edi: number;
    esp: number;
    ebp: number;
    eip: number;
    flags: number;
}

export interface MemoryManager {
    readU8(addr: number): number;
    readU16(addr: number): number;
    readU32(addr: number): number;
    readU64(addr: number): bigint;
    writeU8(addr: number, value: number): void;
    writeU16(addr: number, value: number): void;
    writeU32(addr: number, value: number): void;
    writeU64(addr: number, value: bigint): void;
    load(addr: number, data: Uint8Array): void;
}

export interface CPU {
    step(): void;
    run(cycles: number): void;
    reset(): void;
    getRegisters(): Registers;
    setRegisters(regs: Registers): void;
    onInterrupt: (interrupt: number) => void;
}

