/**
 * DEX Parser - Parses Dalvik Bytecode from classes.dex
 *
 * Supports: header, string IDs, type IDs, proto IDs, field IDs,
 * method IDs, class defs, class_data_item, and code_item extraction.
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

export interface DEXMethodId {
  classIdx: number;   // index into type_ids
  protoIdx: number;   // index into proto_ids
  nameIdx: number;    // index into string_ids
}

export interface DEXTypeId {
  descriptorIdx: number; // index into string_ids
}

export interface DEXFieldId {
  classIdx: number;   // index into type_ids
  typeIdx: number;    // index into type_ids
  nameIdx: number;    // index into string_ids
}

export interface DEXProtoId {
  shortyIdx: number;      // index into string_ids
  returnTypeIdx: number;  // index into type_ids
  parametersOff: number;  // offset to type_list
}

/** A decoded code_item containing actual Dalvik bytecode. */
export interface DEXCodeItem {
  registersSize: number;
  insSize: number;
  outsSize: number;
  triesSize: number;
  debugInfoOff: number;
  insnsSize: number;        // number of 16-bit code units
  insns: Uint8Array;        // raw bytecode (insnsSize * 2 bytes)
}

/** A decoded method from class_data_item with its bytecode. */
export interface DEXMethod {
  methodIdx: number;        // index into method_ids
  accessFlags: number;
  codeItem: DEXCodeItem | null;
  className: string;       // resolved class name
  methodName: string;       // resolved method name
  methodDescriptor: string; // resolved prototype descriptor
}

export class DEXParser {
  private data: Uint8Array;
  private header: DEXHeader | null = null;
  private view: DataView;

  // Cached parsed tables (avoid O(n²) reallocation on repeated access)
  private cachedMethodIds: DEXMethodId[] | null = null;
  private cachedProtoIds: DEXProtoId[] | null = null;
  private cachedTypeIds: DEXTypeId[] | null = null;
  private cachedFieldIds: DEXFieldId[] | null = null;

  constructor(dexData: ArrayBuffer) {
    this.data = new Uint8Array(dexData);
    this.view = new DataView(this.data.buffer);
  }

  /**
   * Parse DEX header
   */
  parseHeader(): DEXHeader {
    if (this.header) {
      return this.header;
    }

    // Read magic number (8 bytes)
    const magic = String.fromCharCode(...this.data.slice(0, 8));

    // Read header fields
    this.header = {
      magic,
      version: this.view.getUint32(8, true),
      checksum: this.view.getUint32(12, true),
      signature: this.data.slice(16, 32),
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

    return this.header;
  }

  // -----------------------------------------------------------------------
  // Primitive readers
  // -----------------------------------------------------------------------

  /** Read a ULEB128 value starting at the given offset. Returns [value, bytesConsumed]. */
  readULEB128(offset: number): [number, number] {
    let result = 0;
    let shift = 0;
    let bytesConsumed = 0;
    let byte: number;
    do {
      if (offset + bytesConsumed >= this.data.length) break;
      byte = this.data[offset + bytesConsumed];
      result |= (byte & 0x7F) << shift;
      shift += 7;
      bytesConsumed++;
    } while ((byte & 0x80) !== 0);
    return [result, bytesConsumed];
  }

  /** Parse string from string table */
  parseString(stringIdx: number): string {
    const header = this.parseHeader();
    if (stringIdx >= header.stringIdsSize) return '';

    let stringDataOff = this.view.getUint32(header.stringIdsOff + stringIdx * 4, true);

    // Skip ULEB128 utf16 size
    const [, ulebBytes] = this.readULEB128(stringDataOff);
    stringDataOff += ulebBytes;

    // Read MUTF-8 string (null-terminated)
    let length = 0;
    while (stringDataOff + length < this.data.length && this.data[stringDataOff + length] !== 0) {
      length++;
    }

    const decoder = new TextDecoder('utf-8');
    return decoder.decode(this.data.slice(stringDataOff, stringDataOff + length));
  }

  // -----------------------------------------------------------------------
  // type_id_item table
  // -----------------------------------------------------------------------

  parseTypeIds(): DEXTypeId[] {
    if (this.cachedTypeIds) return this.cachedTypeIds;
    const header = this.parseHeader();
    const result: DEXTypeId[] = [];
    for (let i = 0; i < header.typeIdsSize; i++) {
      const off = header.typeIdsOff + i * 4;
      result.push({ descriptorIdx: this.view.getUint32(off, true) });
    }
    this.cachedTypeIds = result;
    return result;
  }

  /** Resolve a type ID to its descriptor string (e.g. "Lcom/example/MainActivity;"). */
  parseType(typeIdx: number): string {
    const header = this.parseHeader();
    if (typeIdx >= header.typeIdsSize) return '';
    const descriptorIdx = this.view.getUint32(header.typeIdsOff + typeIdx * 4, true);
    return this.parseString(descriptorIdx);
  }

  // -----------------------------------------------------------------------
  // proto_id_item table
  // -----------------------------------------------------------------------

  parseProtoIds(): DEXProtoId[] {
    if (this.cachedProtoIds) return this.cachedProtoIds;
    const header = this.parseHeader();
    const result: DEXProtoId[] = [];
    for (let i = 0; i < header.protoIdsSize; i++) {
      const off = header.protoIdsOff + i * 12;
      result.push({
        shortyIdx: this.view.getUint32(off, true),
        returnTypeIdx: this.view.getUint32(off + 4, true),
        parametersOff: this.view.getUint32(off + 8, true),
      });
    }
    this.cachedProtoIds = result;
    return result;
  }

  // -----------------------------------------------------------------------
  // field_id_item table
  // -----------------------------------------------------------------------

  parseFieldIds(): DEXFieldId[] {
    if (this.cachedFieldIds) return this.cachedFieldIds;
    const header = this.parseHeader();
    const result: DEXFieldId[] = [];
    for (let i = 0; i < header.fieldIdsSize; i++) {
      const off = header.fieldIdsOff + i * 8;
      result.push({
        classIdx: this.view.getUint16(off, true),
        typeIdx: this.view.getUint16(off + 2, true),
        nameIdx: this.view.getUint32(off + 4, true),
      });
    }
    this.cachedFieldIds = result;
    return result;
  }

  // -----------------------------------------------------------------------
  // method_id_item table
  // -----------------------------------------------------------------------

  parseMethodIds(): DEXMethodId[] {
    if (this.cachedMethodIds) return this.cachedMethodIds;
    const header = this.parseHeader();
    const result: DEXMethodId[] = [];
    for (let i = 0; i < header.methodIdsSize; i++) {
      const off = header.methodIdsOff + i * 8;
      result.push({
        classIdx: this.view.getUint16(off, true),
        protoIdx: this.view.getUint16(off + 2, true),
        nameIdx: this.view.getUint32(off + 4, true),
      });
    }
    this.cachedMethodIds = result;
    return result;
  }

  /** Resolve a method ID to its class name + method name + descriptor. */
  resolveMethod(methodIdx: number): { className: string; methodName: string; descriptor: string } {
    const methodIds = this.parseMethodIds();
    if (methodIdx >= methodIds.length) return { className: '', methodName: '', descriptor: '' };
    const mid = methodIds[methodIdx];
    const className = this.parseType(mid.classIdx);
    const methodName = this.parseString(mid.nameIdx);
    const shorty = this.parseString(this.parseProtoIds()[mid.protoIdx]?.shortyIdx ?? 0);
    return { className, methodName, descriptor: shorty };
  }

  // -----------------------------------------------------------------------
  // class_def_item table
  // -----------------------------------------------------------------------

  parseClasses(): DEXClass[] {
    const header = this.parseHeader();
    const classes: DEXClass[] = [];

    for (let i = 0; i < header.classDefsSize; i++) {
      const offset = header.classDefsOff + i * 32;
      classes.push({
        classIdx: this.view.getUint32(offset, true),
        accessFlags: this.view.getUint32(offset + 4, true),
        superclassIdx: this.view.getUint32(offset + 8, true),
        interfacesOff: this.view.getUint32(offset + 12, true),
        sourceFileIdx: this.view.getUint32(offset + 16, true),
        annotationsOff: this.view.getUint32(offset + 20, true),
        classDataOff: this.view.getUint32(offset + 24, true),
        staticValuesOff: this.view.getUint32(offset + 28, true),
      });
    }

    return classes;
  }

  getClassNames(): string[] {
    const classes = this.parseClasses();
    return classes.map(cls => this.parseType(cls.classIdx));
  }

  // -----------------------------------------------------------------------
  // code_item parsing
  // -----------------------------------------------------------------------

  /** Parse a code_item at the given offset. Returns null if offset is 0 or invalid. */
  parseCodeItem(codeOff: number): DEXCodeItem | null {
    if (codeOff === 0 || codeOff + 16 > this.data.length) return null;

    const registersSize = this.view.getUint16(codeOff, true);
    const insSize = this.view.getUint16(codeOff + 2, true);
    const outsSize = this.view.getUint16(codeOff + 4, true);
    const triesSize = this.view.getUint16(codeOff + 6, true);
    const debugInfoOff = this.view.getUint32(codeOff + 8, true);
    const insnsSize = this.view.getUint32(codeOff + 12, true);

    // insns start at codeOff + 16, each is 16 bits, so insnsSize * 2 bytes
    const insnsStart = codeOff + 16;
    const insnsBytes = insnsSize * 2;

    if (insnsStart + insnsBytes > this.data.length) return null;

    // Copy the bytecode as raw bytes
    const insns = new Uint8Array(insnsBytes);
    insns.set(this.data.slice(insnsStart, insnsStart + insnsBytes));

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

  // -----------------------------------------------------------------------
  // class_data_item parsing
  // -----------------------------------------------------------------------

  /** Parse a class_data_item at the given offset.
   *  Returns arrays of decoded field and method entries.
   */
  parseClassData(off: number): {
    staticFields: Array<{ fieldIdx: number; accessFlags: number }>;
    instanceFields: Array<{ fieldIdx: number; accessFlags: number }>;
    directMethods: Array<{ methodIdx: number; accessFlags: number; codeOff: number }>;
    virtualMethods: Array<{ methodIdx: number; accessFlags: number; codeOff: number }>;
  } | null {
    if (off === 0 || off >= this.data.length) return null;

    let pos = off;

    const readUleb = (): number => {
      const [val, consumed] = this.readULEB128(pos);
      pos += consumed;
      return val;
    };

    const staticFieldsSize = readUleb();
    const instanceFieldsSize = readUleb();
    const directMethodsSize = readUleb();
    const virtualMethodsSize = readUleb();

    const staticFields: Array<{ fieldIdx: number; accessFlags: number }> = [];
    let prevFieldIdx = 0;
    for (let i = 0; i < staticFieldsSize; i++) {
      prevFieldIdx += readUleb(); // field_idx_diff
      const accessFlags = readUleb();
      staticFields.push({ fieldIdx: prevFieldIdx, accessFlags });
    }

    const instanceFields: Array<{ fieldIdx: number; accessFlags: number }> = [];
    prevFieldIdx = 0;
    for (let i = 0; i < instanceFieldsSize; i++) {
      prevFieldIdx += readUleb();
      const accessFlags = readUleb();
      instanceFields.push({ fieldIdx: prevFieldIdx, accessFlags });
    }

    const directMethods: Array<{ methodIdx: number; accessFlags: number; codeOff: number }> = [];
    let prevMethodIdx = 0;
    for (let i = 0; i < directMethodsSize; i++) {
      prevMethodIdx += readUleb(); // method_idx_diff
      const accessFlags = readUleb();
      const codeOff = readUleb();
      directMethods.push({ methodIdx: prevMethodIdx, accessFlags, codeOff });
    }

    const virtualMethods: Array<{ methodIdx: number; accessFlags: number; codeOff: number }> = [];
    prevMethodIdx = 0;
    for (let i = 0; i < virtualMethodsSize; i++) {
      prevMethodIdx += readUleb();
      const accessFlags = readUleb();
      const codeOff = readUleb();
      virtualMethods.push({ methodIdx: prevMethodIdx, accessFlags, codeOff });
    }

    return { staticFields, instanceFields, directMethods, virtualMethods };
  }

  // -----------------------------------------------------------------------
  // High-level: extract all methods with bytecode from a class
  // -----------------------------------------------------------------------

  /** Extract all methods (with bytecode) for a given class index. */
  extractClassMethods(classDef: DEXClass): DEXMethod[] {
    const methods: DEXMethod[] = [];
    const classData = this.parseClassData(classDef.classDataOff);
    if (!classData) return methods;

    const className = this.parseType(classDef.classIdx);

    const processMethod = (entry: { methodIdx: number; accessFlags: number; codeOff: number }) => {
      const resolved = this.resolveMethod(entry.methodIdx);
      const codeItem = this.parseCodeItem(entry.codeOff);
      methods.push({
        methodIdx: entry.methodIdx,
        accessFlags: entry.accessFlags,
        codeItem,
        className: resolved.className || className,
        methodName: resolved.methodName,
        methodDescriptor: resolved.descriptor,
      });
    };

    for (const dm of classData.directMethods) processMethod(dm);
    for (const vm of classData.virtualMethods) processMethod(vm);

    return methods;
  }

  /** Find the main Activity class and its onCreate method.
   *  Looks for a class that extends Activity/AppCompatActivity and has onCreate.
   */
  findMainActivity(): DEXMethod | null {
    const classes = this.parseClasses();

    for (const cls of classes) {
      const className = this.parseType(cls.classIdx);
      const superClassName = cls.superclassIdx !== 0xFFFFFFFF ? this.parseType(cls.superclassIdx) : '';

      // Check if this class extends Activity or AppCompatActivity
      const isActivity =
        superClassName.includes('Activity') ||
        superClassName.includes('activity') ||
        className.includes('MainActivity') ||
        className.includes('mainActivity');

      if (!isActivity) continue;

      const methods = this.extractClassMethods(cls);

      // Prefer onCreate, but fall back to any method with bytecode
      const onCreate = methods.find(m =>
        m.methodName === 'onCreate' && m.codeItem !== null
      );
      if (onCreate) return onCreate;

      // Fall back: any direct method with bytecode (constructor, etc.)
      const anyMethod = methods.find(m => m.codeItem !== null);
      if (anyMethod) return anyMethod;
    }

    // No Activity found — try the first class with any bytecode
    for (const cls of classes) {
      const methods = this.extractClassMethods(cls);
      const anyMethod = methods.find(m => m.codeItem !== null);
      if (anyMethod) return anyMethod;
    }

    return null;
  }

  /** Get all methods across all classes (for building the method table). */
  getAllMethods(): DEXMethod[] {
    const classes = this.parseClasses();
    const allMethods: DEXMethod[] = [];
    for (const cls of classes) {
      const methods = this.extractClassMethods(cls);
      allMethods.push(...methods);
    }
    return allMethods;
  }
}

