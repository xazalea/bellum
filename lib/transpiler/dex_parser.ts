/**
 * Complete DEX Parser - Production-Grade Dalvik Bytecode Parser
 * Supports DEX versions 035, 037, 038, 039
 * Parses all DEX structures needed for Android app execution
 */

// ============================================================================
// DEX Structures
// ============================================================================

export interface DEXHeader {
  magic: string;
  version: string;
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

export interface ProtoId {
  shortyIdx: number;
  returnTypeIdx: number;
  parametersOff: number;
  parameters: number[];
}

export interface FieldId {
  classIdx: number;
  typeIdx: number;
  nameIdx: number;
}

export interface MethodId {
  classIdx: number;
  protoIdx: number;
  nameIdx: number;
}

export interface ClassDefItem {
  classIdx: number;
  accessFlags: number;
  superclassIdx: number;
  interfacesOff: number;
  sourceFileIdx: number;
  annotationsOff: number;
  classDataOff: number;
  staticValuesOff: number;
}

export interface EncodedField {
  fieldIdx: number;
  accessFlags: number;
}

export interface EncodedMethod {
  methodIdx: number;
  accessFlags: number;
  codeOff: number;
}

export interface ClassData {
  staticFieldsSize: number;
  instanceFieldsSize: number;
  directMethodsSize: number;
  virtualMethodsSize: number;
  staticFields: EncodedField[];
  instanceFields: EncodedField[];
  directMethods: EncodedMethod[];
  virtualMethods: EncodedMethod[];
}

export interface CodeItem {
  registersSize: number;
  insSize: number;
  outsSize: number;
  triesSize: number;
  debugInfoOff: number;
  insnsSize: number;
  insns: Uint16Array;
}

export interface Annotation {
  visibility: number;
  typeIdx: number;
  elements: Array<{ nameIdx: number; value: any }>;
}

export interface DalvikClass {
  className: string;
  superClassName: string | null;
  interfaces: string[];
  accessFlags: number;
  sourceFile: string | null;
  staticFields: Map<string, { type: string; accessFlags: number }>;
  instanceFields: Map<string, { type: string; accessFlags: number }>;
  directMethods: Map<string, DalvikMethod>;
  virtualMethods: Map<string, DalvikMethod>;
  annotations: Annotation[];
}

export interface DalvikMethod {
  name: string;
  descriptor: string;
  accessFlags: number;
  code: CodeItem | null;
}

export interface DEXFile {
  header: DEXHeader;
  strings: string[];
  types: string[];
  protos: ProtoId[];
  fields: FieldId[];
  methods: MethodId[];
  classes: Map<string, DalvikClass>;
}

// ============================================================================
// Constants
// ============================================================================

const DEX_FILE_MAGIC = 'dex\n';
const ENDIAN_CONSTANT = 0x12345678;
const REVERSE_ENDIAN_CONSTANT = 0x78563412;

// Access flags
export const ACC_PUBLIC = 0x0001;
export const ACC_PRIVATE = 0x0002;
export const ACC_PROTECTED = 0x0004;
export const ACC_STATIC = 0x0008;
export const ACC_FINAL = 0x0010;
export const ACC_SYNCHRONIZED = 0x0020;
export const ACC_VOLATILE = 0x0040;
export const ACC_BRIDGE = 0x0040;
export const ACC_TRANSIENT = 0x0080;
export const ACC_VARARGS = 0x0080;
export const ACC_NATIVE = 0x0100;
export const ACC_INTERFACE = 0x0200;
export const ACC_ABSTRACT = 0x0400;
export const ACC_STRICT = 0x0800;
export const ACC_SYNTHETIC = 0x1000;
export const ACC_ANNOTATION = 0x2000;
export const ACC_ENUM = 0x4000;
export const ACC_CONSTRUCTOR = 0x10000;

// ============================================================================
// DEX Parser Class
// ============================================================================

export class DEXParser {
  private data: Uint8Array;
  private view: DataView;
  private header: DEXHeader | null = null;
  
  // Cached tables
  private stringTable: string[] | null = null;
  private typeTable: string[] | null = null;
  private protoTable: ProtoId[] | null = null;
  private fieldTable: FieldId[] | null = null;
  private methodTable: MethodId[] | null = null;
  private classMap: Map<string, DalvikClass> = new Map();

  constructor(dexData: ArrayBuffer) {
    this.data = new Uint8Array(dexData);
    this.view = new DataView(dexData);
  }

  /**
   * Parse complete DEX file
   */
  parse(): DEXFile {
    const header = this.parseHeader();
    const strings = this.parseStringTable();
    const types = this.parseTypeTable();
    const protos = this.parseProtoTable();
    const fields = this.parseFieldTable();
    const methods = this.parseMethodTable();
    const classes = this.parseAllClasses();

    return {
      header,
      strings,
      types,
      protos,
      fields,
      methods,
      classes,
    };
  }

  /**
   * Parse DEX header
   */
  parseHeader(): DEXHeader {
    if (this.header) {
      return this.header;
    }

    // Read magic and version
    const magicBytes = this.data.slice(0, 4);
    const magic = String.fromCharCode(...magicBytes);
    
    if (magic !== DEX_FILE_MAGIC) {
      throw new Error(`Invalid DEX magic: ${magic}`);
    }

    const versionBytes = this.data.slice(4, 7);
    const version = String.fromCharCode(...versionBytes);

    this.header = {
      magic,
      version,
      checksum: this.view.getUint32(8, true),
      signature: this.data.slice(12, 32),
      fileSize: this.view.getUint32(32, true),
      headerSize: this.view.getUint32(36, true),
      endianTag: this.view.getUint32(40, true),
      linkSize: this.view.getUint32(44, true),
      linkOff: this.view.getUint32(48, true),
      mapOff: this.view.getUint32(52, true),
      stringIdsSize: this.view.getUint32(56, true),
      stringIdsOff: this.view.getUint32(60, true),
      typeIdsSize: this.view.getUint32(64, true),
      typeIdsOff: this.view.getUint32(68, true),
      protoIdsSize: this.view.getUint32(72, true),
      protoIdsOff: this.view.getUint32(76, true),
      fieldIdsSize: this.view.getUint32(80, true),
      fieldIdsOff: this.view.getUint32(84, true),
      methodIdsSize: this.view.getUint32(88, true),
      methodIdsOff: this.view.getUint32(92, true),
      classDefsSize: this.view.getUint32(96, true),
      classDefsOff: this.view.getUint32(100, true),
      dataSize: this.view.getUint32(104, true),
      dataOff: this.view.getUint32(108, true),
    };

    // Validate endian tag
    if (this.header.endianTag !== ENDIAN_CONSTANT && this.header.endianTag !== REVERSE_ENDIAN_CONSTANT) {
      throw new Error(`Invalid endian tag: 0x${this.header.endianTag.toString(16)}`);
    }

    return this.header;
  }

  /**
   * Parse string table
   */
  parseStringTable(): string[] {
    if (this.stringTable) {
      return this.stringTable;
    }

    const header = this.parseHeader();
    this.stringTable = [];

    for (let i = 0; i < header.stringIdsSize; i++) {
      const offset = header.stringIdsOff + i * 4;
      const stringDataOff = this.view.getUint32(offset, true);
      
      // Read MUTF-8 string
      const { value: size, bytesRead } = this.readULeb128(stringDataOff);
      const stringData = this.data.slice(stringDataOff + bytesRead, stringDataOff + bytesRead + size);
      
      // Decode MUTF-8 (simplified - treating as UTF-8)
      const decoder = new TextDecoder('utf-8');
      this.stringTable.push(decoder.decode(stringData));
    }

    return this.stringTable;
  }

  /**
   * Parse type table
   */
  parseTypeTable(): string[] {
    if (this.typeTable) {
      return this.typeTable;
    }

    const header = this.parseHeader();
    const strings = this.parseStringTable();
    this.typeTable = [];

    for (let i = 0; i < header.typeIdsSize; i++) {
      const offset = header.typeIdsOff + i * 4;
      const descriptorIdx = this.view.getUint32(offset, true);
      this.typeTable.push(strings[descriptorIdx]);
    }

    return this.typeTable;
  }

  /**
   * Parse proto table (method prototypes)
   */
  parseProtoTable(): ProtoId[] {
    if (this.protoTable) {
      return this.protoTable;
    }

    const header = this.parseHeader();
    this.protoTable = [];

    for (let i = 0; i < header.protoIdsSize; i++) {
      const offset = header.protoIdsOff + i * 12;
      
      const shortyIdx = this.view.getUint32(offset, true);
      const returnTypeIdx = this.view.getUint32(offset + 4, true);
      const parametersOff = this.view.getUint32(offset + 8, true);

      const parameters: number[] = [];
      if (parametersOff !== 0) {
        const size = this.view.getUint32(parametersOff, true);
        for (let j = 0; j < size; j++) {
          parameters.push(this.view.getUint16(parametersOff + 4 + j * 2, true));
        }
      }

      this.protoTable.push({
        shortyIdx,
        returnTypeIdx,
        parametersOff,
        parameters,
      });
    }

    return this.protoTable;
  }

  /**
   * Parse field table
   */
  parseFieldTable(): FieldId[] {
    if (this.fieldTable) {
      return this.fieldTable;
    }

    const header = this.parseHeader();
    this.fieldTable = [];

    for (let i = 0; i < header.fieldIdsSize; i++) {
      const offset = header.fieldIdsOff + i * 8;
      
      this.fieldTable.push({
        classIdx: this.view.getUint16(offset, true),
        typeIdx: this.view.getUint16(offset + 2, true),
        nameIdx: this.view.getUint32(offset + 4, true),
      });
    }

    return this.fieldTable;
  }

  /**
   * Parse method table
   */
  parseMethodTable(): MethodId[] {
    if (this.methodTable) {
      return this.methodTable;
    }

    const header = this.parseHeader();
    this.methodTable = [];

    for (let i = 0; i < header.methodIdsSize; i++) {
      const offset = header.methodIdsOff + i * 8;
      
      this.methodTable.push({
        classIdx: this.view.getUint16(offset, true),
        protoIdx: this.view.getUint16(offset + 2, true),
        nameIdx: this.view.getUint32(offset + 4, true),
      });
    }

    return this.methodTable;
  }

  /**
   * Parse all classes
   */
  parseAllClasses(): Map<string, DalvikClass> {
    if (this.classMap.size > 0) {
      return this.classMap;
    }

    const header = this.parseHeader();
    const strings = this.parseStringTable();
    const types = this.parseTypeTable();

    for (let i = 0; i < header.classDefsSize; i++) {
      const offset = header.classDefsOff + i * 32;
      
      const classDef: ClassDefItem = {
        classIdx: this.view.getUint32(offset, true),
        accessFlags: this.view.getUint32(offset + 4, true),
        superclassIdx: this.view.getUint32(offset + 8, true),
        interfacesOff: this.view.getUint32(offset + 12, true),
        sourceFileIdx: this.view.getUint32(offset + 16, true),
        annotationsOff: this.view.getUint32(offset + 20, true),
        classDataOff: this.view.getUint32(offset + 24, true),
        staticValuesOff: this.view.getUint32(offset + 28, true),
      };

      const dalvikClass = this.parseClass(classDef);
      this.classMap.set(dalvikClass.className, dalvikClass);
    }

    return this.classMap;
  }

  /**
   * Parse single class
   */
  private parseClass(classDef: ClassDefItem): DalvikClass {
    const strings = this.parseStringTable();
    const types = this.parseTypeTable();

    const className = types[classDef.classIdx];
    const superClassName = classDef.superclassIdx === 0xFFFFFFFF ? null : types[classDef.superclassIdx];
    const sourceFile = classDef.sourceFileIdx === 0xFFFFFFFF ? null : strings[classDef.sourceFileIdx];

    // Parse interfaces
    const interfaces: string[] = [];
    if (classDef.interfacesOff !== 0) {
      const size = this.view.getUint32(classDef.interfacesOff, true);
      for (let i = 0; i < size; i++) {
        const typeIdx = this.view.getUint16(classDef.interfacesOff + 4 + i * 2, true);
        interfaces.push(types[typeIdx]);
      }
    }

    // Parse class data
    const classData = classDef.classDataOff !== 0 ? this.parseClassData(classDef.classDataOff) : null;

    const staticFields = new Map<string, { type: string; accessFlags: number }>();
    const instanceFields = new Map<string, { type: string; accessFlags: number }>();
    const directMethods = new Map<string, DalvikMethod>();
    const virtualMethods = new Map<string, DalvikMethod>();

    if (classData) {
      const fields = this.parseFieldTable();
      const methods = this.parseMethodTable();
      const protos = this.parseProtoTable();

      // Static fields
      for (const field of classData.staticFields) {
        const fieldId = fields[field.fieldIdx];
        const fieldName = strings[fieldId.nameIdx];
        const fieldType = types[fieldId.typeIdx];
        staticFields.set(fieldName, { type: fieldType, accessFlags: field.accessFlags });
      }

      // Instance fields
      for (const field of classData.instanceFields) {
        const fieldId = fields[field.fieldIdx];
        const fieldName = strings[fieldId.nameIdx];
        const fieldType = types[fieldId.typeIdx];
        instanceFields.set(fieldName, { type: fieldType, accessFlags: field.accessFlags });
      }

      // Direct methods
      for (const method of classData.directMethods) {
        const methodId = methods[method.methodIdx];
        const methodName = strings[methodId.nameIdx];
        const proto = protos[methodId.protoIdx];
        const descriptor = this.buildMethodDescriptor(proto);
        const code = method.codeOff !== 0 ? this.parseCodeItem(method.codeOff) : null;
        
        directMethods.set(methodName, {
          name: methodName,
          descriptor,
          accessFlags: method.accessFlags,
          code,
        });
      }

      // Virtual methods
      for (const method of classData.virtualMethods) {
        const methodId = methods[method.methodIdx];
        const methodName = strings[methodId.nameIdx];
        const proto = protos[methodId.protoIdx];
        const descriptor = this.buildMethodDescriptor(proto);
        const code = method.codeOff !== 0 ? this.parseCodeItem(method.codeOff) : null;
        
        virtualMethods.set(methodName, {
          name: methodName,
          descriptor,
          accessFlags: method.accessFlags,
          code,
        });
      }
    }

    return {
      className,
      superClassName,
      interfaces,
      accessFlags: classDef.accessFlags,
      sourceFile,
      staticFields,
      instanceFields,
      directMethods,
      virtualMethods,
      annotations: [],
    };
  }

  /**
   * Parse class data
   */
  private parseClassData(offset: number): ClassData {
    let currentOffset = offset;

    const { value: staticFieldsSize, bytesRead: sr1 } = this.readULeb128(currentOffset);
    currentOffset += sr1;
    
    const { value: instanceFieldsSize, bytesRead: sr2 } = this.readULeb128(currentOffset);
    currentOffset += sr2;
    
    const { value: directMethodsSize, bytesRead: sr3 } = this.readULeb128(currentOffset);
    currentOffset += sr3;
    
    const { value: virtualMethodsSize, bytesRead: sr4 } = this.readULeb128(currentOffset);
    currentOffset += sr4;

    const staticFields: EncodedField[] = [];
    let fieldIdx = 0;
    for (let i = 0; i < staticFieldsSize; i++) {
      const { value: fieldIdxDiff, bytesRead: br1 } = this.readULeb128(currentOffset);
      currentOffset += br1;
      const { value: accessFlags, bytesRead: br2 } = this.readULeb128(currentOffset);
      currentOffset += br2;
      
      fieldIdx += fieldIdxDiff;
      staticFields.push({ fieldIdx, accessFlags });
    }

    const instanceFields: EncodedField[] = [];
    fieldIdx = 0;
    for (let i = 0; i < instanceFieldsSize; i++) {
      const { value: fieldIdxDiff, bytesRead: br1 } = this.readULeb128(currentOffset);
      currentOffset += br1;
      const { value: accessFlags, bytesRead: br2 } = this.readULeb128(currentOffset);
      currentOffset += br2;
      
      fieldIdx += fieldIdxDiff;
      instanceFields.push({ fieldIdx, accessFlags });
    }

    const directMethods: EncodedMethod[] = [];
    let methodIdx = 0;
    for (let i = 0; i < directMethodsSize; i++) {
      const { value: methodIdxDiff, bytesRead: br1 } = this.readULeb128(currentOffset);
      currentOffset += br1;
      const { value: accessFlags, bytesRead: br2 } = this.readULeb128(currentOffset);
      currentOffset += br2;
      const { value: codeOff, bytesRead: br3 } = this.readULeb128(currentOffset);
      currentOffset += br3;
      
      methodIdx += methodIdxDiff;
      directMethods.push({ methodIdx, accessFlags, codeOff });
    }

    const virtualMethods: EncodedMethod[] = [];
    methodIdx = 0;
    for (let i = 0; i < virtualMethodsSize; i++) {
      const { value: methodIdxDiff, bytesRead: br1 } = this.readULeb128(currentOffset);
      currentOffset += br1;
      const { value: accessFlags, bytesRead: br2 } = this.readULeb128(currentOffset);
      currentOffset += br2;
      const { value: codeOff, bytesRead: br3 } = this.readULeb128(currentOffset);
      currentOffset += br3;
      
      methodIdx += methodIdxDiff;
      virtualMethods.push({ methodIdx, accessFlags, codeOff });
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
   * Parse code item (method bytecode)
   */
  private parseCodeItem(offset: number): CodeItem {
    const registersSize = this.view.getUint16(offset, true);
    const insSize = this.view.getUint16(offset + 2, true);
    const outsSize = this.view.getUint16(offset + 4, true);
    const triesSize = this.view.getUint16(offset + 6, true);
    const debugInfoOff = this.view.getUint32(offset + 8, true);
    const insnsSize = this.view.getUint32(offset + 12, true);

    const insns = new Uint16Array(insnsSize);
    for (let i = 0; i < insnsSize; i++) {
      insns[i] = this.view.getUint16(offset + 16 + i * 2, true);
    }

    return {
      registersSize,
      insSize,
      outsSize,
      triesSize,
      debugInfoOff,
      insnsSize,
      insns,
    };
  }

  /**
   * Build method descriptor from proto
   */
  private buildMethodDescriptor(proto: ProtoId): string {
    const types = this.parseTypeTable();
    const returnType = types[proto.returnTypeIdx];
    
    let descriptor = '(';
    for (const paramIdx of proto.parameters) {
      descriptor += types[paramIdx];
    }
    descriptor += ')' + returnType;
    
    return descriptor;
  }

  /**
   * Load class by name
   */
  loadClass(className: string): DalvikClass | null {
    this.parseAllClasses();
    return this.classMap.get(className) || null;
  }

  /**
   * Resolve method
   */
  resolveMethod(classRef: string, methodName: string, descriptor: string): DalvikMethod | null {
    const dalvikClass = this.loadClass(classRef);
    if (!dalvikClass) return null;

    // Check direct methods
    const directMethod = dalvikClass.directMethods.get(methodName);
    if (directMethod && directMethod.descriptor === descriptor) {
      return directMethod;
    }

    // Check virtual methods
    const virtualMethod = dalvikClass.virtualMethods.get(methodName);
    if (virtualMethod && virtualMethod.descriptor === descriptor) {
      return virtualMethod;
    }

    // Check superclass
    if (dalvikClass.superClassName) {
      return this.resolveMethod(dalvikClass.superClassName, methodName, descriptor);
    }

    return null;
  }

  /**
   * Read unsigned LEB128
   */
  private readULeb128(offset: number): { value: number; bytesRead: number } {
    let result = 0;
    let shift = 0;
    let bytesRead = 0;

    while (true) {
      const byte = this.data[offset + bytesRead];
      bytesRead++;
      
      result |= (byte & 0x7F) << shift;
      
      if ((byte & 0x80) === 0) {
        break;
      }
      
      shift += 7;
    }

    return { value: result, bytesRead };
  }

  /**
   * Read signed LEB128
   */
  private readSLeb128(offset: number): { value: number; bytesRead: number } {
    let result = 0;
    let shift = 0;
    let bytesRead = 0;
    let byte: number;

    do {
      byte = this.data[offset + bytesRead];
      bytesRead++;
      
      result |= (byte & 0x7F) << shift;
      shift += 7;
    } while (byte & 0x80);

    if (shift < 32 && (byte & 0x40)) {
      result |= -(1 << shift);
    }

    return { value: result, bytesRead };
  }

  /**
   * Get all class names
   */
  getClassNames(): string[] {
    this.parseAllClasses();
    return Array.from(this.classMap.keys());
  }
}
