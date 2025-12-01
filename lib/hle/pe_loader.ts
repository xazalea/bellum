/**
 * PE Loader - Loads parsed PE sections into Memory
 */

import { PEParser, SectionHeader } from '../transpiler/pe_parser';

export class PELoader {
  private memory: WebAssembly.Memory;

  constructor(memory: WebAssembly.Memory) {
    this.memory = memory;
  }

  load(buffer: ArrayBuffer): void {
    const parser = new PEParser(buffer);
    const { peHeader, optionalHeader, sections } = parser.parse();

    console.log(`Loading PE: Base=${optionalHeader.imageBase.toString(16)} Entry=${optionalHeader.addressOfEntryPoint.toString(16)}`);

    // Map sections to memory
    // In a real implementation, we need to handle VirtualAddress relocation if ImageBase differs.
    // For WASM, we likely map the Guest RAM starting at offset 0 or a fixed offset.

    const memView = new Uint8Array(this.memory.buffer);
    const srcView = new Uint8Array(buffer);

    sections.forEach((section: SectionHeader) => {
      if (section.sizeOfRawData > 0) {
        // Calculate destination address (VirtualAddress)
        // Note: In a real emulator, we might offset this by a base address
        const destAddr = section.virtualAddress;
        
        console.log(`Mapping Section ${section.name} to 0x${destAddr.toString(16)} (Size: ${section.sizeOfRawData})`);

        // Copy data
        for (let i = 0; i < section.sizeOfRawData; i++) {
          if (destAddr + i < memView.length) {
            memView[destAddr + i] = srcView[section.pointerToRawData + i];
          }
        }
      }
    });
  }
}

