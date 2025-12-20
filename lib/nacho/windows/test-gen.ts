export class PETestGenerator {
    static generateHelloWorld(): ArrayBuffer {
        // Minimal constants
        const PE_OFFSET = 0x80;
        const SECTIONS_OFFSET = PE_OFFSET + 24 + 96; // FileHeader(20) + OptionalHeader(96) (assuming PE32)
        const CODE_OFFSET = 0x1000;
        const DATA_OFFSET = 0x2000;
        const IMAGE_BASE = 0x00400000;
        
        const buffer = new Uint8Array(4096);
        const view = new DataView(buffer.buffer);

        // 1. DOS Header
        view.setUint16(0, 0x5A4D, true); // MZ
        view.setUint32(60, PE_OFFSET, true); // e_lfanew

        // 2. PE Header
        view.setUint32(PE_OFFSET, 0x4550, true); // PE\0\0
        view.setUint16(PE_OFFSET + 4, 0x014c, true); // Machine (x86)
        view.setUint16(PE_OFFSET + 6, 2, true); // NumberOfSections (Code + Data)
        view.setUint16(PE_OFFSET + 20, 96, true); // SizeOfOptionalHeader

        // 3. Optional Header (PE32)
        const optOffset = PE_OFFSET + 24;
        view.setUint16(optOffset, 0x10b, true); // Magic (PE32)
        view.setUint32(optOffset + 16, CODE_OFFSET, true); // AddressOfEntryPoint
        view.setUint32(optOffset + 28, IMAGE_BASE, true); // ImageBase

        // 4. Section Headers
        // .text (Code)
        let secOffset = SECTIONS_OFFSET;
        this.writeString(view, secOffset, ".text");
        view.setUint32(secOffset + 8, 0x1000, true); // VirtualSize
        view.setUint32(secOffset + 12, CODE_OFFSET, true); // VirtualAddress
        view.setUint32(secOffset + 16, 0x1000, true); // SizeOfRawData
        view.setUint32(secOffset + 20, CODE_OFFSET, true); // PointerToRawData (Using same as VA for simplicity in this flat buffer)

        // .data
        secOffset += 40;
        this.writeString(view, secOffset, ".data");
        view.setUint32(secOffset + 8, 0x1000, true); // VirtualSize
        view.setUint32(secOffset + 12, DATA_OFFSET, true); // VirtualAddress
        view.setUint32(secOffset + 16, 0x1000, true); // SizeOfRawData
        view.setUint32(secOffset + 20, DATA_OFFSET, true); // PointerToRawData

        // 5. Content
        
        // Data Section (Hello World string)
        const stringAddr = IMAGE_BASE + DATA_OFFSET;
        const msg = "Hello Nacho!";
        for(let i=0; i<msg.length; i++) {
            buffer[DATA_OFFSET + i] = msg.charCodeAt(i);
        }

        // Code Section
        let pc = CODE_OFFSET;
        
        // MOV EAX, 4 (Write)
        buffer[pc++] = 0xB8; view.setUint32(pc, 4, true); pc += 4;
        
        // MOV EBX, 1 (Stdout)
        buffer[pc++] = 0xBB; view.setUint32(pc, 1, true); pc += 4;
        
        // MOV ECX, stringAddr
        buffer[pc++] = 0xB9; view.setUint32(pc, stringAddr, true); pc += 4;
        
        // MOV EDX, 12 (Len)
        buffer[pc++] = 0xBA; view.setUint32(pc, msg.length, true); pc += 4;
        
        // INT 0x80
        buffer[pc++] = 0xCD; buffer[pc++] = 0x80;
        
        // MOV EAX, 1 (Exit)
        buffer[pc++] = 0xB8; view.setUint32(pc, 1, true); pc += 4;
        
        // MOV EBX, 0
        buffer[pc++] = 0xBB; view.setUint32(pc, 0, true); pc += 4;
        
        // INT 0x80
        buffer[pc++] = 0xCD; buffer[pc++] = 0x80;

        return buffer.buffer;
    }

    private static writeString(view: DataView, offset: number, str: string) {
        for (let i = 0; i < str.length && i < 8; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }
}

