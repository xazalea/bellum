/**
 * DEX Parser - Complete DEX file format parser
 * Extracts classes, methods, fields, and code from Android DEX files
 */

// DEX file magic numbers
const DEX_MAGIC = [0x64, 0x65, 0x78, 0x0a]; // "dex\n"
const DEX_MAGIC_035 = [0x30, 0x33, 0x35, 0x00]; // "035\0"
const DEX_MAGIC_037 = [0x30, 0x33, 0x37, 0x00]; // "037\0" (Android N)
const DEX_MAGIC_038 = [0x30, 0x33, 0x38, 0x00]; // "038\0" (Android O)
const DEX_MAGIC_039 = [0x30, 0x33, 0x39, 0x00]; // "039\0" (Android P+)

// DEX header structure
export interface DEXHeader {
  magic: string;
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

// String ID item
export interface StringIDItem {
  stringDataOff: number;
  value: string;
}

// Type ID item
export interface TypeIDItem {
  descriptorIdx: number;
  descriptor: string;
}

// Proto ID item (method prototype)
export interface ProtoIDItem {
  shortyIdx: number;
  returnTypeIdx: number;
  parametersOff: number;
  shorty: string;
  returnType: string;
  parameters: string[];
}

// Field ID item
export interface FieldIDItem {
  classIdx: number;
  typeIdx: number;
  nameIdx: number;
  className: string;
  type: string;
  name: string;
}

// Method ID item
export interface MethodIDItem {
  classIdx: number;
  protoIdx: number;
  nameIdx: number;
  className: string;
  proto: ProtoIDItem;
  name: string;
}

// Class definition
export interface ClassDefItem {
  classIdx: number;
  accessFlags: number;
  superclassIdx: number;
  interfacesOff: number;
  sourceFileIdx: number;
  annotationsOff: number;
  classDataOff: number;
  staticValuesOff: number;
  className: string;
  superClassName: string;
  interfaces: string[];
  sourceFile: string;
  classData: ClassDataItem | null;
  staticValues: any[] | null;
}

// Class data (methods and fields)
export interface ClassDataItem {
  staticFieldsSize: number;
  instanceFieldsSize: number;
  directMethodsSize: number;
  virtualMethodsSize: number;
  staticFields: FieldItem[];
  instanceFields: FieldItem[];
  directMethods: MethodItem[];
  virtualMethods: MethodItem[];
}

// Field item
export interface FieldItem {
  fieldIdxDiff: number;
  accessFlags: number;
  fieldIdx: number;
  name: string;
  type: string;
}

// Method item
export interface MethodItem {
  methodIdxDiff: number;
  accessFlags: number;
  codeOff: number;
  methodIdx: number;
  name: string;
  proto: ProtoIDItem;
  code: CodeItem | null;
}

// Code item (actual bytecode)
export interface CodeItem {
  registersSize: number;
  insSize: number;
  outsSize: number;
  triesSize: number;
  debugInfoOff: number;
  insnsSize: number;
  insns: Uint8Array;
  tries: TryItem[];
  handlers: CatchHandler[];
}

// Try-catch item
export interface TryItem {
  startAddr: number;
  insnCount: number;
  handlerOff: number;
}

// Catch handler
export interface CatchHandler {
  catchAllAddr: number;
  handlers: { typeIdx: number; addr: number }[];
}

// Access flags
export const AccessFlags = {
  PUBLIC: 0x0001,
  PRIVATE: 0x0002,
  PROTECTED: 0x0004,
  STATIC: 0x0008,
  FINAL: 0x0010,
  SYNCHRONIZED: 0x0020,
  VOLATILE: 0x0040,
  TRANSIENT: 0x0040,
  NATIVE: 0x0100,
  INTERFACE: 0x0200,
  ABSTRACT: 0x0400,
  STRICTFP: 0x0800,
  SYNTHETIC: 0x1000,
  ANNOTATION: 0x2000,
  ENUM: 0x4000,
} as const;

// Type descriptor mapping
const PRIMITIVE_TYPES: Record<string, string> = {
  'V': 'void',
  'Z': 'boolean',
  'B': 'byte',
  'S': 'short',
  'C': 'char',
  'I': 'int',
  'J': 'long',
  'F': 'float',
  'D': 'double',
};

/**
 * Complete DEX file parser
 */
export class DEXParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private header: DEXHeader | null = null;
  private strings: StringIDItem[] = [];
  private types: TypeIDItem[] = [];
  private protos: ProtoIDItem[] = [];
  private fields: FieldIDItem[] = [];
  private methods: MethodIDItem[] = [];
  private classes: Map<string, ClassDefItem> = new Map();
  private classList: ClassDefItem[] = [];
  
  private littleEndian: boolean = true;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  /**
   * Parse the DEX file
   */
  parse(): DEXFile {
    // Parse header
    this.header = this.parseHeader();
    
    // Parse string IDs
    this.strings = this.parseStrings();
    
    // Parse type IDs
    this.types = this.parseTypes();
    
    // Parse proto IDs
    this.protos = this.parseProtos();
    
    // Parse field IDs
    this.fields = this.parseFields();
    
    // Parse method IDs
    this.methods = this.parseMethods();
    
    // Parse class definitions
    const classDefs = this.parseClassDefs();
    this.classList = classDefs;
    for (const cls of classDefs) {
      this.classes.set(cls.className, cls);
    }

    return {
      header: this.header,
      strings: this.strings.map(s => s.value),
      types: this.types.map(t => t.descriptor),
      methods: this.methods,
      fields: this.fields,
      classes: this.classes,
    };
  }

  /**
   * Parse DEX header
   */
  private parseHeader(): DEXHeader {
    const magic = this.readBytes(0, 8);
    const magicStr = String.fromCharCode(...magic.slice(0, 4));
    
    // Verify magic
    if (magicStr !== 'dex') {
      throw new Error('Invalid DEX file: bad magic number');
    }

    // Check version
    const version = String.fromCharCode(...magic.slice(4, 7));
    if (!['035', '037', '038', '039'].includes(version)) {
      console.warn(`[DEXParser] Unusual DEX version: ${version}`);
    }

    // Check endianness
    const endianTag = this.readU32(40);
    this.littleEndian = endianTag === 0x12345678;
    
    if (!this.littleEndian) {
      throw new Error('Big-endian DEX files not supported');
    }

    return {
      magic: String.fromCharCode(...magic),
      checksum: this.readU32(8),
      signature: this.readBytes(12, 20),
      fileSize: this.readU32(32),
      headerSize: this.readU32(36),
      endianTag,
      linkSize: this.readU32(44),
      linkOff: this.readU32(48),
      mapOff: this.readU32(52),
      stringIdsSize: this.readU32(56),
      stringIdsOff: this.readU32(60),
      typeIdsSize: this.readU32(64),
      typeIdsOff: this.readU32(68),
      protoIdsSize: this.readU32(72),
      protoIdsOff: this.readU32(76),
      fieldIdsSize: this.readU32(80),
      fieldIdsOff: this.readU32(84),
      methodIdsSize: this.readU32(88),
      methodIdsOff: this.readU32(92),
      classDefsSize: this.readU32(96),
      classDefsOff: this.readU32(100),
      dataSize: this.readU32(104),
      dataOff: this.readU32(108),
    };
  }

  /**
   * Parse string IDs
   */
  private parseStrings(): StringIDItem[] {
    if (!this.header) return [];

    const strings: StringIDItem[] = [];
    const { stringIdsSize, stringIdsOff } = this.header;

    for (let i = 0; i < stringIdsSize; i++) {
      const stringDataOff = this.readU32(stringIdsOff + i * 4);
      const value = this.readStringData(stringDataOff);
      strings.push({ stringDataOff, value });
    }

    return strings;
  }

  /**
   * Read MUTF-8 string data
   */
  private readStringData(offset: number): string {
    // Read ULEB128 length
    const { value: length, bytesRead } = this.readULEB128(offset);
    
    // Read string bytes
    const bytes: number[] = [];
    let pos = offset + bytesRead;
    
    for (let i = 0; i < length; i++) {
      const byte = this.view.getUint8(pos++);
      if (byte === 0) break;
      bytes.push(byte);
    }

    // Convert MUTF-8 to string
    return this.mutf8ToString(bytes);
  }

  /**
   * Convert MUTF-8 bytes to string
   */
  private mutf8ToString(bytes: number[]): string {
    const chars: string[] = [];
    let i = 0;
    
    while (i < bytes.length) {
      const byte = bytes[i++];
      
      if ((byte & 0x80) === 0) {
        // Single byte (ASCII)
        chars.push(String.fromCharCode(byte));
      } else if ((byte & 0xE0) === 0xC0) {
        // Two bytes
        const byte2 = bytes[i++];
        const codePoint = ((byte & 0x1F) << 6) | (byte2 & 0x3F);
        chars.push(String.fromCharCode(codePoint));
      } else if ((byte & 0xF0) === 0xE0) {
        // Three bytes
        const byte2 = bytes[i++];
        const byte3 = bytes[i++];
        const codePoint = ((byte & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
        chars.push(String.fromCharCode(codePoint));
      }
    }
    
    return chars.join('');
  }

  /**
   * Parse type IDs
   */
  private parseTypes(): TypeIDItem[] {
    if (!this.header) return [];

    const types: TypeIDItem[] = [];
    const { typeIdsSize, typeIdsOff } = this.header;

    for (let i = 0; i < typeIdsSize; i++) {
      const descriptorIdx = this.readU32(typeIdsOff + i * 4);
      types.push({
        descriptorIdx,
        descriptor: this.strings[descriptorIdx]?.value || '',
      });
    }

    return types;
  }

  /**
   * Parse proto IDs
   */
  private parseProtos(): ProtoIDItem[] {
    if (!this.header) return [];

    const protos: ProtoIDItem[] = [];
    const { protoIdsSize, protoIdsOff } = this.header;

    for (let i = 0; i < protoIdsSize; i++) {
      const offset = protoIdsOff + i * 12;
      const shortyIdx = this.readU32(offset);
      const returnTypeIdx = this.readU32(offset + 4);
      const parametersOff = this.readU32(offset + 8);

      const proto: ProtoIDItem = {
        shortyIdx,
        returnTypeIdx,
        parametersOff,
        shorty: this.strings[shortyIdx]?.value || '',
        returnType: this.types[returnTypeIdx]?.descriptor || '',
        parameters: [],
      };

      // Parse parameters if present
      if (parametersOff !== 0) {
        proto.parameters = this.parseTypeList(parametersOff);
      }

      protos.push(proto);
    }

    return protos;
  }

  /**
   * Parse type list
   */
  private parseTypeList(offset: number): string[] {
    const size = this.readU32(offset);
    const types: string[] = [];

    for (let i = 0; i < size; i++) {
      const typeIdx = this.readU16(offset + 4 + i * 2);
      types.push(this.types[typeIdx]?.descriptor || '');
    }

    return types;
  }

  /**
   * Parse field IDs
   */
  private parseFields(): FieldIDItem[] {
    if (!this.header) return [];

    const fields: FieldIDItem[] = [];
    const { fieldIdsSize, fieldIdsOff } = this.header;

    for (let i = 0; i < fieldIdsSize; i++) {
      const offset = fieldIdsOff + i * 8;
      const classIdx = this.readU16(offset);
      const typeIdx = this.readU16(offset + 2);
      const nameIdx = this.readU32(offset + 4);

      fields.push({
        classIdx,
        typeIdx,
        nameIdx,
        className: this.types[classIdx]?.descriptor || '',
        type: this.types[typeIdx]?.descriptor || '',
        name: this.strings[nameIdx]?.value || '',
      });
    }

    return fields;
  }

  /**
   * Parse method IDs
   */
  private parseMethods(): MethodIDItem[] {
    if (!this.header) return [];

    const methods: MethodIDItem[] = [];
    const { methodIdsSize, methodIdsOff } = this.header;

    for (let i = 0; i < methodIdsSize; i++) {
      const offset = methodIdsOff + i * 8;
      const classIdx = this.readU16(offset);
      const protoIdx = this.readU16(offset + 2);
      const nameIdx = this.readU32(offset + 4);

      methods.push({
        classIdx,
        protoIdx,
        nameIdx,
        className: this.types[classIdx]?.descriptor || '',
        proto: this.protos[protoIdx] || { shortyIdx: 0, returnTypeIdx: 0, parametersOff: 0, shorty: '', returnType: '', parameters: [] },
        name: this.strings[nameIdx]?.value || '',
      });
    }

    return methods;
  }

  /**
   * Parse class definitions
   */
  private parseClassDefs(): ClassDefItem[] {
    if (!this.header) return [];

    const classes: ClassDefItem[] = [];
    const { classDefsSize, classDefsOff } = this.header;

    for (let i = 0; i < classDefsSize; i++) {
      const offset = classDefsOff + i * 32;
      
      const classDef: ClassDefItem = {
        classIdx: this.readU32(offset),
        accessFlags: this.readU32(offset + 4),
        superclassIdx: this.readU32(offset + 8),
        interfacesOff: this.readU32(offset + 12),
        sourceFileIdx: this.readU32(offset + 16),
        annotationsOff: this.readU32(offset + 20),
        classDataOff: this.readU32(offset + 24),
        staticValuesOff: this.readU32(offset + 28),
        className: '',
        superClassName: '',
        interfaces: [],
        sourceFile: '',
        classData: null,
        staticValues: null,
      };

      // Resolve names
      classDef.className = this.types[classDef.classIdx]?.descriptor || '';
      classDef.superClassName = classDef.superclassIdx !== 0xFFFFFFFF 
        ? this.types[classDef.superclassIdx]?.descriptor || '' 
        : '';
      classDef.sourceFile = classDef.sourceFileIdx !== 0xFFFFFFFF 
        ? this.strings[classDef.sourceFileIdx]?.value || '' 
        : '';

      // Parse interfaces
      if (classDef.interfacesOff !== 0) {
        classDef.interfaces = this.parseTypeList(classDef.interfacesOff);
      }

      // Parse class data
      if (classDef.classDataOff !== 0) {
        classDef.classData = this.parseClassData(classDef.classDataOff);
      }

      // Parse static values
      if (classDef.staticValuesOff !== 0) {
        classDef.staticValues = this.parseEncodedArray(classDef.staticValuesOff);
      }

      classes.push(classDef);
    }

    return classes;
  }

  /**
   * Parse class data
   */
  private parseClassData(offset: number): ClassDataItem {
    let pos = offset;

    const staticFieldsSize = this.readULEB128(pos).value;
    pos += this.readULEB128(pos).bytesRead;

    const instanceFieldsSize = this.readULEB128(pos).value;
    pos += this.readULEB128(pos).bytesRead;

    const directMethodsSize = this.readULEB128(pos).value;
    pos += this.readULEB128(pos).bytesRead;

    const virtualMethodsSize = this.readULEB128(pos).value;
    pos += this.readULEB128(pos).bytesRead;

    // Parse static fields
    const staticFields: FieldItem[] = [];
    let fieldIdx = 0;
    for (let i = 0; i < staticFieldsSize; i++) {
      const result = this.parseFieldItem(pos, fieldIdx);
      staticFields.push(result.field);
      pos = result.newPos;
      fieldIdx = result.field.fieldIdx;
    }

    // Parse instance fields
    const instanceFields: FieldItem[] = [];
    for (let i = 0; i < instanceFieldsSize; i++) {
      const result = this.parseFieldItem(pos, fieldIdx);
      instanceFields.push(result.field);
      pos = result.newPos;
      fieldIdx = result.field.fieldIdx;
    }

    // Parse direct methods
    const directMethods: MethodItem[] = [];
    let methodIdx = 0;
    for (let i = 0; i < directMethodsSize; i++) {
      const result = this.parseMethodItem(pos, methodIdx);
      directMethods.push(result.method);
      pos = result.newPos;
      methodIdx = result.method.methodIdx;
    }

    // Parse virtual methods
    const virtualMethods: MethodItem[] = [];
    for (let i = 0; i < virtualMethodsSize; i++) {
      const result = this.parseMethodItem(pos, methodIdx);
      virtualMethods.push(result.method);
      pos = result.newPos;
      methodIdx = result.method.methodIdx;
    }

    return {
      staticFieldsSize,
      instanceFieldsSize,
      directMethodsSize,
      virtualMethodsSize,
      staticFields,
      instanceFields,
      directMethods,
      virtualMethods,
    };
  }

  /**
   * Parse field item
   */
  private parseFieldItem(offset: number, prevIdx: number): { field: FieldItem; newPos: number } {
    let pos = offset;

    const fieldIdxDiff = this.readULEB128(pos).value;
    pos += this.readULEB128(pos).bytesRead;

    const accessFlags = this.readULEB128(pos).value;
    pos += this.readULEB128(pos).bytesRead;

    const fieldIdx = prevIdx + fieldIdxDiff;
    const field = this.fields[fieldIdx];

    return {
      field: {
        fieldIdxDiff,
        accessFlags,
        fieldIdx,
        name: field?.name || '',
        type: field?.type || '',
      },
      newPos: pos,
    };
  }

  /**
   * Parse method item
   */
  private parseMethodItem(offset: number, prevIdx: number): { method: MethodItem; newPos: number } {
    let pos = offset;

    const methodIdxDiff = this.readULEB128(pos).value;
    pos += this.readULEB128(pos).bytesRead;

    const accessFlags = this.readULEB128(pos).value;
    pos += this.readULEB128(pos).bytesRead;

    const codeOff = this.readULEB128(pos).value;
    pos += this.readULEB128(pos).bytesRead;

    const methodIdx = prevIdx + methodIdxDiff;
    const method = this.methods[methodIdx];

    const result: MethodItem = {
      methodIdxDiff,
      accessFlags,
      codeOff,
      methodIdx,
      name: method?.name || '',
      proto: method?.proto || { shortyIdx: 0, returnTypeIdx: 0, parametersOff: 0, shorty: '', returnType: '', parameters: [] },
      code: null,
    };

    // Parse code if present
    if (codeOff !== 0) {
      result.code = this.parseCodeItem(codeOff);
    }

    return { method: result, newPos: pos };
  }

  /**
   * Parse code item
   */
  private parseCodeItem(offset: number): CodeItem {
    const registersSize = this.readU16(offset);
    const insSize = this.readU16(offset + 2);
    const outsSize = this.readU16(offset + 4);
    const triesSize = this.readU16(offset + 6);
    const debugInfoOff = this.readU32(offset + 8);
    const insnsSize = this.readU32(offset + 12);

    // Read instructions
    const insns = new Uint8Array(this.buffer, offset + 16, insnsSize * 2);

    // Parse tries and handlers if present
    const tries: TryItem[] = [];
    const handlers: CatchHandler[] = [];

    if (triesSize > 0) {
      let pos = offset + 16 + insnsSize * 2;
      
      // Padding for 4-byte alignment
      if (insnsSize % 2 === 1) {
        pos += 2;
      }

      // Parse tries
      for (let i = 0; i < triesSize; i++) {
        tries.push({
          startAddr: this.readU32(pos),
          insnCount: this.readU16(pos + 4),
          handlerOff: this.readU16(pos + 6),
        });
        pos += 8;
      }

      // Parse handlers (simplified)
      // Full implementation would parse encoded catch handler list
    }

    return {
      registersSize,
      insSize,
      outsSize,
      triesSize,
      debugInfoOff,
      insnsSize,
      insns,
      tries,
      handlers,
    };
  }

  /**
   * Parse encoded array
   */
  private parseEncodedArray(offset: number): any[] {
    // Simplified - would need full implementation for all value types
    const { value: size, bytesRead } = this.readULEB128(offset);
    // Would parse array values based on type
    return new Array(size).fill(null);
  }

  /**
   * Read ULEB128 value
   */
  private readULEB128(offset: number): { value: number; bytesRead: number } {
    let result = 0;
    let shift = 0;
    let bytesRead = 0;
    let byte: number;

    do {
      byte = this.view.getUint8(offset + bytesRead);
      result |= (byte & 0x7F) << shift;
      shift += 7;
      bytesRead++;
    } while ((byte & 0x80) !== 0 && bytesRead < 5);

    return { value: result, bytesRead };
  }

  /**
   * Read unsigned 16-bit
   */
  private readU16(offset: number): number {
    return this.view.getUint16(offset, this.littleEndian);
  }

  /**
   * Read unsigned 32-bit
   */
  private readU32(offset: number): number {
    return this.view.getUint32(offset, this.littleEndian);
  }

  /**
   * Read bytes
   */
  private readBytes(offset: number, length: number): Uint8Array {
    return new Uint8Array(this.buffer, offset, length);
  }

  /**
   * Get a class by name
   */
  getClass(className: string): ClassDefItem | undefined {
    return this.classes.get(className);
  }

  /**
   * Get a method by index
   */
  getMethod(methodIdx: number): MethodIDItem | undefined {
    return this.methods[methodIdx];
  }

  /**
   * Get a field by index
   */
  getField(fieldIdx: number): FieldIDItem | undefined {
    return this.fields[fieldIdx];
  }

  /**
   * Get a string by index
   */
  getString(stringIdx: number): string {
    return this.strings[stringIdx]?.value || '';
  }

  /**
   * Get all classes
   */
  getAllClasses(): ClassDefItem[] {
    return this.classList;
  }

  /**
   * Find method by name
   */
  findMethod(className: string, methodName: string): MethodItem | null {
    const cls = this.classes.get(className);
    if (!cls?.classData) return null;

    const allMethods = [
      ...cls.classData.directMethods,
      ...cls.classData.virtualMethods,
    ];

    return allMethods.find(m => m.name === methodName) || null;
  }

  /**
   * Get method bytecode
   */
  getMethodCode(className: string, methodName: string): Uint8Array | null {
    const method = this.findMethod(className, methodName);
    return method?.code?.insns || null;
  }
}

/**
 * Parsed DEX file
 */
export interface DEXFile {
  header: DEXHeader;
  strings: string[];
  types: string[];
  methods: MethodIDItem[];
  fields: FieldIDItem[];
  classes: Map<string, ClassDefItem>;
}

/**
 * Parse a DEX file
 */
export function parseDEX(buffer: ArrayBuffer): DEXFile {
  const parser = new DEXParser(buffer);
  return parser.parse();
}

/**
 * Parse multiple DEX files (multi-dex)
 */
export function parseMultiDEX(buffers: ArrayBuffer[]): DEXFile[] {
  return buffers.map(buffer => parseDEX(buffer));
}

/**
 * Resolve a method from DEX file
 */
export function resolveMethod(dex: DEXFile, methodIdx: number): MethodIDItem | null {
  return dex.methods[methodIdx] || null;
}

/**
 * Resolve a field from DEX file
 */
export function resolveField(dex: DEXFile, fieldIdx: number): FieldIDItem | null {
  return dex.fields[fieldIdx] || null;
}

/**
 * Convert type descriptor to human-readable name
 */
export function descriptorToName(descriptor: string): string {
  if (PRIMITIVE_TYPES[descriptor]) {
    return PRIMITIVE_TYPES[descriptor];
  }

  // Array type
  if (descriptor.startsWith('[')) {
    return descriptorToName(descriptor.slice(1)) + '[]';
  }

  // Class type (Lpackage/name/Class;)
  if (descriptor.startsWith('L') && descriptor.endsWith(';')) {
    return descriptor.slice(1, -1).replace(/\//g, '.');
  }

  return descriptor;
}