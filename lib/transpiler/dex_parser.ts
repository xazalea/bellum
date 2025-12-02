/**
 * DEX Parser - Parses Dalvik Bytecode from classes.dex
 */

export interface DEXHeader {
  magic: string;
  version: number;
  checksum: number;
  signature: Uint8Array;
  fileSize: number;
  headerSize: number;
  endianTag: number;
  linkSize: number;
  linkOff: number;
  mapOff: number;
  stringIdsSize: number;
  stringIdsOff: number;
  typeIdsSize: number;
  typeIdsOff: number;
  protoIdsSize: number;
  protoIdsOff: number;
  fieldIdsSize: number;
  fieldIdsOff: number;
  methodIdsSize: number;
  methodIdsOff: number;
  classDefsSize: number;
  classDefsOff: number;
  dataSize: number;
  dataOff: number;
}

export interface DEXClass {
  classIdx: number;
  accessFlags: number;
  superclassIdx: number;
  interfacesOff: number;
  sourceFileIdx: number;
  annotationsOff: number;
  classDataOff: number;
  staticValuesOff: number;
}

export class DEXParser {
  private data: Uint8Array;
  private header: DEXHeader | null = null;

  constructor(dexData: ArrayBuffer) {
    this.data = new Uint8Array(dexData);
  }

  /**
   * Parse DEX header
   */
  parseHeader(): DEXHeader {
    if (this.header) {
      return this.header;
    }

    const view = new DataView(this.data.buffer);
    
    // Read magic number (8 bytes)
    const magic = String.fromCharCode(...this.data.slice(0, 8));
    
    // Read header fields
    this.header = {
      magic,
      version: view.getUint32(8, true),
      checksum: view.getUint32(12, true),
      signature: this.data.slice(16, 32),
      fileSize: view.getUint32(32, true),
      headerSize: view.getUint32(36, true),
      endianTag: view.getUint32(40, true),
      linkSize: view.getUint32(44, true),
      linkOff: view.getUint32(48, true),
      mapOff: view.getUint32(52, true),
      stringIdsSize: view.getUint32(56, true),
      stringIdsOff: view.getUint32(60, true),
      typeIdsSize: view.getUint32(64, true),
      typeIdsOff: view.getUint32(68, true),
      protoIdsSize: view.getUint32(72, true),
      protoIdsOff: view.getUint32(76, true),
      fieldIdsSize: view.getUint32(80, true),
      fieldIdsOff: view.getUint32(84, true),
      methodIdsSize: view.getUint32(88, true),
      methodIdsOff: view.getUint32(92, true),
      classDefsSize: view.getUint32(96, true),
      classDefsOff: view.getUint32(100, true),
      dataSize: view.getUint32(104, true),
      dataOff: view.getUint32(108, true),
    };

    return this.header;
  }

  /**
   * Parse string from string table
   */
  parseString(stringIdx: number): string {
    const header = this.parseHeader();
    const view = new DataView(this.data.buffer);
    
    // Get string data offset
    const entryOffset = header.stringIdsOff + stringIdx * 4;
    if (entryOffset + 4 > this.data.length) {
      throw new Error('DEX string index out of range');
    }
    const stringDataOff = view.getUint32(entryOffset, true);
    if (stringDataOff >= this.data.length) {
      throw new Error('DEX string data offset out of range');
    }
    
    // Read UTF-8 string (null-terminated)
    let length = 0;
    while (stringDataOff + length < this.data.length && this.data[stringDataOff + length] !== 0) {
      length++;
    }
    if (stringDataOff + length > this.data.length) {
      throw new Error('DEX string extends beyond buffer');
    }
    
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(this.data.slice(stringDataOff, stringDataOff + length));
  }

  /**
   * Parse all classes
   */
  parseClasses(): DEXClass[] {
    const header = this.parseHeader();
    const classes: DEXClass[] = [];
    const view = new DataView(this.data.buffer);

    for (let i = 0; i < header.classDefsSize; i++) {
      const offset = header.classDefsOff + i * 32; // 32 bytes per class_def_item
      
      classes.push({
        classIdx: view.getUint32(offset, true),
        accessFlags: view.getUint32(offset + 4, true),
        superclassIdx: view.getUint32(offset + 8, true),
        interfacesOff: view.getUint32(offset + 12, true),
        sourceFileIdx: view.getUint32(offset + 16, true),
        annotationsOff: view.getUint32(offset + 20, true),
        classDataOff: view.getUint32(offset + 24, true),
        staticValuesOff: view.getUint32(offset + 28, true),
      });
    }

    return classes;
  }

  /**
   * Get all class names
   */
  getClassNames(): string[] {
    const classes = this.parseClasses();
    return classes.map(cls => this.parseString(cls.classIdx));
  }
}

