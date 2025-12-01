/**
 * PE Parser - Parses Windows Portable Executable (EXE/DLL) headers
 */

export interface PEHeader {
  machine: number;
  numberOfSections: number;
  timeDateStamp: number;
  pointerToSymbolTable: number;
  numberOfSymbols: number;
  sizeOfOptionalHeader: number;
  characteristics: number;
}

export interface OptionalHeader {
  magic: number;
  addressOfEntryPoint: number;
  imageBase: number;
  sectionAlignment: number;
  fileAlignment: number;
  sizeOfImage: number;
  sizeOfHeaders: number;
  subsystem: number;
  numberOfRvaAndSizes: number;
}

export interface SectionHeader {
  name: string;
  virtualSize: number;
  virtualAddress: number;
  sizeOfRawData: number;
  pointerToRawData: number;
  characteristics: number;
}

export class PEParser {
  private data: Uint8Array;
  private view: DataView;

  constructor(buffer: ArrayBuffer) {
    this.data = new Uint8Array(buffer);
    this.view = new DataView(buffer);
  }

  parse(): { peHeader: PEHeader; optionalHeader: OptionalHeader; sections: SectionHeader[] } {
    // 1. DOS Header
    const e_magic = this.view.getUint16(0, true); // 'MZ'
    if (e_magic !== 0x5A4D) {
      throw new Error("Invalid DOS Signature");
    }
    const e_lfanew = this.view.getUint32(60, true); // Offset to PE header

    // 2. PE Header
    const peSignature = this.view.getUint32(e_lfanew, true); // 'PE\0\0'
    if (peSignature !== 0x00004550) {
      throw new Error("Invalid PE Signature");
    }

    const peHeaderOffset = e_lfanew + 4;
    const peHeader: PEHeader = {
      machine: this.view.getUint16(peHeaderOffset, true),
      numberOfSections: this.view.getUint16(peHeaderOffset + 2, true),
      timeDateStamp: this.view.getUint32(peHeaderOffset + 4, true),
      pointerToSymbolTable: this.view.getUint32(peHeaderOffset + 8, true),
      numberOfSymbols: this.view.getUint32(peHeaderOffset + 12, true),
      sizeOfOptionalHeader: this.view.getUint16(peHeaderOffset + 16, true),
      characteristics: this.view.getUint16(peHeaderOffset + 18, true),
    };

    // 3. Optional Header
    const optionalHeaderOffset = peHeaderOffset + 20;
    const magic = this.view.getUint16(optionalHeaderOffset, true);
    
    const optionalHeader: OptionalHeader = {
      magic,
      addressOfEntryPoint: this.view.getUint32(optionalHeaderOffset + 16, true),
      imageBase: this.view.getUint32(optionalHeaderOffset + 28, true),
      sectionAlignment: this.view.getUint32(optionalHeaderOffset + 32, true),
      fileAlignment: this.view.getUint32(optionalHeaderOffset + 36, true),
      sizeOfImage: this.view.getUint32(optionalHeaderOffset + 56, true),
      sizeOfHeaders: this.view.getUint32(optionalHeaderOffset + 60, true),
      subsystem: this.view.getUint16(optionalHeaderOffset + 68, true),
      numberOfRvaAndSizes: this.view.getUint32(optionalHeaderOffset + 92, true),
    };

    // 4. Section Headers
    const sectionsOffset = optionalHeaderOffset + peHeader.sizeOfOptionalHeader;
    const sections: SectionHeader[] = [];

    for (let i = 0; i < peHeader.numberOfSections; i++) {
      const offset = sectionsOffset + i * 40;
      let name = "";
      for (let j = 0; j < 8; j++) {
        const charCode = this.data[offset + j];
        if (charCode !== 0) name += String.fromCharCode(charCode);
      }

      sections.push({
        name,
        virtualSize: this.view.getUint32(offset + 8, true),
        virtualAddress: this.view.getUint32(offset + 12, true),
        sizeOfRawData: this.view.getUint32(offset + 16, true),
        pointerToRawData: this.view.getUint32(offset + 20, true),
        characteristics: this.view.getUint32(offset + 36, true),
      });
    }

    return { peHeader, optionalHeader, sections };
  }
}

