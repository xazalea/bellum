/**
 * Complete PE Parser - Production-Grade Windows Portable Executable Parser
 * Supports PE32 (32-bit) and PE32+ (64-bit) formats
 * Parses all PE structures needed for execution
 */

// ============================================================================
// PE Structures
// ============================================================================

export interface DOSHeader {
  e_magic: number;          // Magic number (MZ)
  e_cblp: number;          // Bytes on last page
  e_cp: number;            // Pages in file
  e_crlc: number;          // Relocations
  e_cparhdr: number;       // Size of header in paragraphs
  e_minalloc: number;      // Minimum extra paragraphs
  e_maxalloc: number;      // Maximum extra paragraphs
  e_ss: number;            // Initial (relative) SS value
  e_sp: number;            // Initial SP value
  e_csum: number;          // Checksum
  e_ip: number;            // Initial IP value
  e_cs: number;            // Initial (relative) CS value
  e_lfarlc: number;        // File address of relocation table
  e_ovno: number;          // Overlay number
  e_lfanew: number;        // File address of new exe header
}

export interface FileHeader {
  machine: number;
  numberOfSections: number;
  timeDateStamp: number;
  pointerToSymbolTable: number;
  numberOfSymbols: number;
  sizeOfOptionalHeader: number;
  characteristics: number;
}

export interface OptionalHeader32 {
  magic: number;
  majorLinkerVersion: number;
  minorLinkerVersion: number;
  sizeOfCode: number;
  sizeOfInitializedData: number;
  sizeOfUninitializedData: number;
  addressOfEntryPoint: number;
  baseOfCode: number;
  baseOfData: number;
  imageBase: number;
  sectionAlignment: number;
  fileAlignment: number;
  majorOperatingSystemVersion: number;
  minorOperatingSystemVersion: number;
  majorImageVersion: number;
  minorImageVersion: number;
  majorSubsystemVersion: number;
  minorSubsystemVersion: number;
  win32VersionValue: number;
  sizeOfImage: number;
  sizeOfHeaders: number;
  checkSum: number;
  subsystem: number;
  dllCharacteristics: number;
  sizeOfStackReserve: number;
  sizeOfStackCommit: number;
  sizeOfHeapReserve: number;
  sizeOfHeapCommit: number;
  loaderFlags: number;
  numberOfRvaAndSizes: number;
}

export interface OptionalHeader64 {
  magic: number;
  majorLinkerVersion: number;
  minorLinkerVersion: number;
  sizeOfCode: number;
  sizeOfInitializedData: number;
  sizeOfUninitializedData: number;
  addressOfEntryPoint: number;
  baseOfCode: number;
  imageBase: bigint;
  sectionAlignment: number;
  fileAlignment: number;
  majorOperatingSystemVersion: number;
  minorOperatingSystemVersion: number;
  majorImageVersion: number;
  minorImageVersion: number;
  majorSubsystemVersion: number;
  minorSubsystemVersion: number;
  win32VersionValue: number;
  sizeOfImage: number;
  sizeOfHeaders: number;
  checkSum: number;
  subsystem: number;
  dllCharacteristics: number;
  sizeOfStackReserve: bigint;
  sizeOfStackCommit: bigint;
  sizeOfHeapReserve: bigint;
  sizeOfHeapCommit: bigint;
  loaderFlags: number;
  numberOfRvaAndSizes: number;
}

export interface DataDirectory {
  virtualAddress: number;
  size: number;
}

export interface SectionHeader {
  name: string;
  virtualSize: number;
  virtualAddress: number;
  sizeOfRawData: number;
  pointerToRawData: number;
  pointerToRelocations: number;
  pointerToLinenumbers: number;
  numberOfRelocations: number;
  numberOfLinenumbers: number;
  characteristics: number;
}

export interface ImportDescriptor {
  originalFirstThunk: number;
  timeDateStamp: number;
  forwarderChain: number;
  name: number;
  firstThunk: number;
}

export interface ImportEntry {
  dll: string;
  functions: Array<{ name: string; ordinal: number; address: number }>;
}

export interface ExportEntry {
  name: string;
  ordinal: number;
  address: number;
}

export interface ExportDirectory {
  characteristics: number;
  timeDateStamp: number;
  majorVersion: number;
  minorVersion: number;
  name: string;
  base: number;
  numberOfFunctions: number;
  numberOfNames: number;
  addressOfFunctions: number;
  addressOfNames: number;
  addressOfNameOrdinals: number;
  exports: ExportEntry[];
}

export interface BaseRelocation {
  virtualAddress: number;
  sizeOfBlock: number;
  relocations: Array<{ offset: number; type: number }>;
}

export interface ResourceDirectory {
  characteristics: number;
  timeDateStamp: number;
  majorVersion: number;
  minorVersion: number;
  numberOfNamedEntries: number;
  numberOfIdEntries: number;
  entries: ResourceDirectoryEntry[];
}

export interface ResourceDirectoryEntry {
  name: string | number;
  isDirectory: boolean;
  offset: number;
  data?: Uint8Array;
  subdirectory?: ResourceDirectory;
}

export interface PEFile {
  dosHeader: DOSHeader;
  fileHeader: FileHeader;
  optionalHeader: OptionalHeader32 | OptionalHeader64;
  dataDirectories: DataDirectory[];
  sections: SectionHeader[];
  imports: ImportEntry[];
  exports: ExportDirectory | null;
  relocations: BaseRelocation[];
  resources: ResourceDirectory | null;
  is64Bit: boolean;
}

export interface LoadedPE {
  baseAddress: number;
  entryPoint: number;
  memory: Uint8Array;
  sections: Map<string, { start: number; size: number; data: Uint8Array }>;
  imports: Map<string, Map<string, number>>; // DLL -> Function -> Address
}

// ============================================================================
// Constants
// ============================================================================

const IMAGE_DOS_SIGNATURE = 0x5A4D;          // MZ
const IMAGE_NT_SIGNATURE = 0x00004550;       // PE\0\0
const IMAGE_NT_OPTIONAL_HDR32_MAGIC = 0x10B;
const IMAGE_NT_OPTIONAL_HDR64_MAGIC = 0x20B;

// Data Directory Indices
const IMAGE_DIRECTORY_ENTRY_EXPORT = 0;
const IMAGE_DIRECTORY_ENTRY_IMPORT = 1;
const IMAGE_DIRECTORY_ENTRY_RESOURCE = 2;
const IMAGE_DIRECTORY_ENTRY_EXCEPTION = 3;
const IMAGE_DIRECTORY_ENTRY_SECURITY = 4;
const IMAGE_DIRECTORY_ENTRY_BASERELOC = 5;
const IMAGE_DIRECTORY_ENTRY_DEBUG = 6;
const IMAGE_DIRECTORY_ENTRY_ARCHITECTURE = 7;
const IMAGE_DIRECTORY_ENTRY_GLOBALPTR = 8;
const IMAGE_DIRECTORY_ENTRY_TLS = 9;
const IMAGE_DIRECTORY_ENTRY_LOAD_CONFIG = 10;
const IMAGE_DIRECTORY_ENTRY_BOUND_IMPORT = 11;
const IMAGE_DIRECTORY_ENTRY_IAT = 12;
const IMAGE_DIRECTORY_ENTRY_DELAY_IMPORT = 13;
const IMAGE_DIRECTORY_ENTRY_COM_DESCRIPTOR = 14;

// ============================================================================
// PE Parser Class
// ============================================================================

export class PEParser {
  private data: Uint8Array;
  private view: DataView;

  constructor(buffer: ArrayBuffer) {
    this.data = new Uint8Array(buffer);
    this.view = new DataView(buffer);
  }

  /**
   * Parse complete PE file
   */
  parse(): PEFile {
    const dosHeader = this.parseDOSHeader();
    const fileHeader = this.parseFileHeader(dosHeader.e_lfanew);
    const optionalHeader = this.parseOptionalHeader(dosHeader.e_lfanew, fileHeader);
    const is64Bit = optionalHeader.magic === IMAGE_NT_OPTIONAL_HDR64_MAGIC;
    
    const dataDirectories = this.parseDataDirectories(dosHeader.e_lfanew, fileHeader, optionalHeader);
    const sections = this.parseSectionHeaders(dosHeader.e_lfanew, fileHeader);
    
    const imports = this.parseImportTable(dataDirectories, sections);
    const exports = this.parseExportTable(dataDirectories, sections);
    const relocations = this.parseRelocations(dataDirectories, sections);
    const resources = this.parseResourceDirectory(dataDirectories, sections);

    return {
      dosHeader,
      fileHeader,
      optionalHeader,
      dataDirectories,
      sections,
      imports,
      exports,
      relocations,
      resources,
      is64Bit,
    };
  }

  /**
   * Parse DOS header
   */
  parseDOSHeader(): DOSHeader {
    const e_magic = this.view.getUint16(0, true);
    if (e_magic !== IMAGE_DOS_SIGNATURE) {
      throw new Error(`Invalid DOS signature: 0x${e_magic.toString(16)}`);
    }

    return {
      e_magic,
      e_cblp: this.view.getUint16(2, true),
      e_cp: this.view.getUint16(4, true),
      e_crlc: this.view.getUint16(6, true),
      e_cparhdr: this.view.getUint16(8, true),
      e_minalloc: this.view.getUint16(10, true),
      e_maxalloc: this.view.getUint16(12, true),
      e_ss: this.view.getUint16(14, true),
      e_sp: this.view.getUint16(16, true),
      e_csum: this.view.getUint16(18, true),
      e_ip: this.view.getUint16(20, true),
      e_cs: this.view.getUint16(22, true),
      e_lfarlc: this.view.getUint16(24, true),
      e_ovno: this.view.getUint16(26, true),
      e_lfanew: this.view.getUint32(60, true),
    };
  }

  /**
   * Parse File Header (COFF header)
   */
  parseFileHeader(peOffset: number): FileHeader {
    const signature = this.view.getUint32(peOffset, true);
    if (signature !== IMAGE_NT_SIGNATURE) {
      throw new Error(`Invalid PE signature: 0x${signature.toString(16)}`);
    }

    const offset = peOffset + 4;
    return {
      machine: this.view.getUint16(offset, true),
      numberOfSections: this.view.getUint16(offset + 2, true),
      timeDateStamp: this.view.getUint32(offset + 4, true),
      pointerToSymbolTable: this.view.getUint32(offset + 8, true),
      numberOfSymbols: this.view.getUint32(offset + 12, true),
      sizeOfOptionalHeader: this.view.getUint16(offset + 16, true),
      characteristics: this.view.getUint16(offset + 18, true),
    };
  }

  /**
   * Parse Optional Header (PE32 or PE32+)
   */
  parseOptionalHeader(peOffset: number, fileHeader: FileHeader): OptionalHeader32 | OptionalHeader64 {
    const offset = peOffset + 4 + 20; // PE signature + File Header
    const magic = this.view.getUint16(offset, true);

    if (magic === IMAGE_NT_OPTIONAL_HDR32_MAGIC) {
      return this.parseOptionalHeader32(offset);
    } else if (magic === IMAGE_NT_OPTIONAL_HDR64_MAGIC) {
      return this.parseOptionalHeader64(offset);
    } else {
      throw new Error(`Unknown optional header magic: 0x${magic.toString(16)}`);
    }
  }

  private parseOptionalHeader32(offset: number): OptionalHeader32 {
    return {
      magic: this.view.getUint16(offset, true),
      majorLinkerVersion: this.view.getUint8(offset + 2),
      minorLinkerVersion: this.view.getUint8(offset + 3),
      sizeOfCode: this.view.getUint32(offset + 4, true),
      sizeOfInitializedData: this.view.getUint32(offset + 8, true),
      sizeOfUninitializedData: this.view.getUint32(offset + 12, true),
      addressOfEntryPoint: this.view.getUint32(offset + 16, true),
      baseOfCode: this.view.getUint32(offset + 20, true),
      baseOfData: this.view.getUint32(offset + 24, true),
      imageBase: this.view.getUint32(offset + 28, true),
      sectionAlignment: this.view.getUint32(offset + 32, true),
      fileAlignment: this.view.getUint32(offset + 36, true),
      majorOperatingSystemVersion: this.view.getUint16(offset + 40, true),
      minorOperatingSystemVersion: this.view.getUint16(offset + 42, true),
      majorImageVersion: this.view.getUint16(offset + 44, true),
      minorImageVersion: this.view.getUint16(offset + 46, true),
      majorSubsystemVersion: this.view.getUint16(offset + 48, true),
      minorSubsystemVersion: this.view.getUint16(offset + 50, true),
      win32VersionValue: this.view.getUint32(offset + 52, true),
      sizeOfImage: this.view.getUint32(offset + 56, true),
      sizeOfHeaders: this.view.getUint32(offset + 60, true),
      checkSum: this.view.getUint32(offset + 64, true),
      subsystem: this.view.getUint16(offset + 68, true),
      dllCharacteristics: this.view.getUint16(offset + 70, true),
      sizeOfStackReserve: this.view.getUint32(offset + 72, true),
      sizeOfStackCommit: this.view.getUint32(offset + 76, true),
      sizeOfHeapReserve: this.view.getUint32(offset + 80, true),
      sizeOfHeapCommit: this.view.getUint32(offset + 84, true),
      loaderFlags: this.view.getUint32(offset + 88, true),
      numberOfRvaAndSizes: this.view.getUint32(offset + 92, true),
    };
  }

  private parseOptionalHeader64(offset: number): OptionalHeader64 {
    return {
      magic: this.view.getUint16(offset, true),
      majorLinkerVersion: this.view.getUint8(offset + 2),
      minorLinkerVersion: this.view.getUint8(offset + 3),
      sizeOfCode: this.view.getUint32(offset + 4, true),
      sizeOfInitializedData: this.view.getUint32(offset + 8, true),
      sizeOfUninitializedData: this.view.getUint32(offset + 12, true),
      addressOfEntryPoint: this.view.getUint32(offset + 16, true),
      baseOfCode: this.view.getUint32(offset + 20, true),
      imageBase: this.view.getBigUint64(offset + 24, true),
      sectionAlignment: this.view.getUint32(offset + 32, true),
      fileAlignment: this.view.getUint32(offset + 36, true),
      majorOperatingSystemVersion: this.view.getUint16(offset + 40, true),
      minorOperatingSystemVersion: this.view.getUint16(offset + 42, true),
      majorImageVersion: this.view.getUint16(offset + 44, true),
      minorImageVersion: this.view.getUint16(offset + 46, true),
      majorSubsystemVersion: this.view.getUint16(offset + 48, true),
      minorSubsystemVersion: this.view.getUint16(offset + 50, true),
      win32VersionValue: this.view.getUint32(offset + 52, true),
      sizeOfImage: this.view.getUint32(offset + 56, true),
      sizeOfHeaders: this.view.getUint32(offset + 60, true),
      checkSum: this.view.getUint32(offset + 64, true),
      subsystem: this.view.getUint16(offset + 68, true),
      dllCharacteristics: this.view.getUint16(offset + 70, true),
      sizeOfStackReserve: this.view.getBigUint64(offset + 72, true),
      sizeOfStackCommit: this.view.getBigUint64(offset + 80, true),
      sizeOfHeapReserve: this.view.getBigUint64(offset + 88, true),
      sizeOfHeapCommit: this.view.getBigUint64(offset + 96, true),
      loaderFlags: this.view.getUint32(offset + 104, true),
      numberOfRvaAndSizes: this.view.getUint32(offset + 108, true),
    };
  }

  /**
   * Parse Data Directories
   */
  parseDataDirectories(peOffset: number, fileHeader: FileHeader, optionalHeader: OptionalHeader32 | OptionalHeader64): DataDirectory[] {
    const is64Bit = optionalHeader.magic === IMAGE_NT_OPTIONAL_HDR64_MAGIC;
    const offset = peOffset + 4 + 20 + fileHeader.sizeOfOptionalHeader - (optionalHeader.numberOfRvaAndSizes * 8);
    
    const directories: DataDirectory[] = [];
    for (let i = 0; i < optionalHeader.numberOfRvaAndSizes; i++) {
      const dirOffset = offset + i * 8;
      directories.push({
        virtualAddress: this.view.getUint32(dirOffset, true),
        size: this.view.getUint32(dirOffset + 4, true),
      });
    }
    
    return directories;
  }

  /**
   * Parse Section Headers
   */
  parseSectionHeaders(peOffset: number, fileHeader: FileHeader): SectionHeader[] {
    const offset = peOffset + 4 + 20 + fileHeader.sizeOfOptionalHeader;
    const sections: SectionHeader[] = [];

    for (let i = 0; i < fileHeader.numberOfSections; i++) {
      const sectionOffset = offset + i * 40;
      
      // Read section name
      let name = '';
      for (let j = 0; j < 8; j++) {
        const charCode = this.data[sectionOffset + j];
        if (charCode !== 0) name += String.fromCharCode(charCode);
      }

      sections.push({
        name: name.trim(),
        virtualSize: this.view.getUint32(sectionOffset + 8, true),
        virtualAddress: this.view.getUint32(sectionOffset + 12, true),
        sizeOfRawData: this.view.getUint32(sectionOffset + 16, true),
        pointerToRawData: this.view.getUint32(sectionOffset + 20, true),
        pointerToRelocations: this.view.getUint32(sectionOffset + 24, true),
        pointerToLinenumbers: this.view.getUint32(sectionOffset + 28, true),
        numberOfRelocations: this.view.getUint16(sectionOffset + 32, true),
        numberOfLinenumbers: this.view.getUint16(sectionOffset + 34, true),
        characteristics: this.view.getUint32(sectionOffset + 36, true),
      });
    }

    return sections;
  }

  /**
   * Parse Import Table
   */
  parseImportTable(dataDirectories: DataDirectory[], sections: SectionHeader[]): ImportEntry[] {
    const importDir = dataDirectories[IMAGE_DIRECTORY_ENTRY_IMPORT];
    if (!importDir || importDir.virtualAddress === 0) {
      return [];
    }

    const imports: ImportEntry[] = [];
    let descriptorRVA = importDir.virtualAddress;

    while (true) {
      const descriptorOffset = this.rvaToFileOffset(descriptorRVA, sections);
      if (descriptorOffset === null) break;

      const originalFirstThunk = this.view.getUint32(descriptorOffset, true);
      if (originalFirstThunk === 0) break; // End of import table

      const timeDateStamp = this.view.getUint32(descriptorOffset + 4, true);
      const forwarderChain = this.view.getUint32(descriptorOffset + 8, true);
      const nameRVA = this.view.getUint32(descriptorOffset + 12, true);
      const firstThunk = this.view.getUint32(descriptorOffset + 16, true);

      const dllName = this.readString(this.rvaToFileOffset(nameRVA, sections)!);
      
      const functions = this.parseImportFunctions(originalFirstThunk || firstThunk, sections);

      imports.push({
        dll: dllName,
        functions,
      });

      descriptorRVA += 20; // Size of import descriptor
    }

    return imports;
  }

  private parseImportFunctions(thunkRVA: number, sections: SectionHeader[]): Array<{ name: string; ordinal: number; address: number }> {
    const functions: Array<{ name: string; ordinal: number; address: number }> = [];
    let currentThunkRVA = thunkRVA;

    while (true) {
      const thunkOffset = this.rvaToFileOffset(currentThunkRVA, sections);
      if (thunkOffset === null) break;

      const thunkValue = this.view.getUint32(thunkOffset, true);
      if (thunkValue === 0) break;

      if (thunkValue & 0x80000000) {
        // Import by ordinal
        functions.push({
          name: '',
          ordinal: thunkValue & 0xFFFF,
          address: currentThunkRVA,
        });
      } else {
        // Import by name
        const nameOffset = this.rvaToFileOffset(thunkValue, sections);
        if (nameOffset !== null) {
          const hint = this.view.getUint16(nameOffset, true);
          const name = this.readString(nameOffset + 2);
          functions.push({
            name,
            ordinal: hint,
            address: currentThunkRVA,
          });
        }
      }

      currentThunkRVA += 4;
    }

    return functions;
  }

  /**
   * Parse Export Table
   */
  parseExportTable(dataDirectories: DataDirectory[], sections: SectionHeader[]): ExportDirectory | null {
    const exportDir = dataDirectories[IMAGE_DIRECTORY_ENTRY_EXPORT];
    if (!exportDir || exportDir.virtualAddress === 0) {
      return null;
    }

    const offset = this.rvaToFileOffset(exportDir.virtualAddress, sections);
    if (offset === null) return null;

    const nameRVA = this.view.getUint32(offset + 12, true);
    const name = this.readString(this.rvaToFileOffset(nameRVA, sections)!);

    const directory: ExportDirectory = {
      characteristics: this.view.getUint32(offset, true),
      timeDateStamp: this.view.getUint32(offset + 4, true),
      majorVersion: this.view.getUint16(offset + 8, true),
      minorVersion: this.view.getUint16(offset + 10, true),
      name,
      base: this.view.getUint32(offset + 16, true),
      numberOfFunctions: this.view.getUint32(offset + 20, true),
      numberOfNames: this.view.getUint32(offset + 24, true),
      addressOfFunctions: this.view.getUint32(offset + 28, true),
      addressOfNames: this.view.getUint32(offset + 32, true),
      addressOfNameOrdinals: this.view.getUint32(offset + 36, true),
      exports: [],
    };

    // Parse exports
    for (let i = 0; i < directory.numberOfNames; i++) {
      const nameRVAOffset = this.rvaToFileOffset(directory.addressOfNames + i * 4, sections);
      const ordinalOffset = this.rvaToFileOffset(directory.addressOfNameOrdinals + i * 2, sections);
      
      if (nameRVAOffset !== null && ordinalOffset !== null) {
        const funcNameRVA = this.view.getUint32(nameRVAOffset, true);
        const ordinal = this.view.getUint16(ordinalOffset, true);
        const addressOffset = this.rvaToFileOffset(directory.addressOfFunctions + ordinal * 4, sections);
        
        if (addressOffset !== null) {
          const address = this.view.getUint32(addressOffset, true);
          const funcName = this.readString(this.rvaToFileOffset(funcNameRVA, sections)!);
          
          directory.exports.push({
            name: funcName,
            ordinal: directory.base + ordinal,
            address,
          });
        }
      }
    }

    return directory;
  }

  /**
   * Parse Relocations
   */
  parseRelocations(dataDirectories: DataDirectory[], sections: SectionHeader[]): BaseRelocation[] {
    const relocDir = dataDirectories[IMAGE_DIRECTORY_ENTRY_BASERELOC];
    if (!relocDir || relocDir.virtualAddress === 0) {
      return [];
    }

    const relocations: BaseRelocation[] = [];
    let currentRVA = relocDir.virtualAddress;
    const endRVA = relocDir.virtualAddress + relocDir.size;

    while (currentRVA < endRVA) {
      const offset = this.rvaToFileOffset(currentRVA, sections);
      if (offset === null) break;

      const virtualAddress = this.view.getUint32(offset, true);
      const sizeOfBlock = this.view.getUint32(offset + 4, true);

      if (sizeOfBlock === 0) break;

      const relocs: Array<{ offset: number; type: number }> = [];
      const count = (sizeOfBlock - 8) / 2;

      for (let i = 0; i < count; i++) {
        const entry = this.view.getUint16(offset + 8 + i * 2, true);
        const type = entry >> 12;
        const relocOffset = entry & 0xFFF;

        relocs.push({ offset: relocOffset, type });
      }

      relocations.push({
        virtualAddress,
        sizeOfBlock,
        relocations: relocs,
      });

      currentRVA += sizeOfBlock;
    }

    return relocations;
  }

  /**
   * Parse Resource Directory
   */
  parseResourceDirectory(dataDirectories: DataDirectory[], sections: SectionHeader[]): ResourceDirectory | null {
    const resourceDir = dataDirectories[IMAGE_DIRECTORY_ENTRY_RESOURCE];
    if (!resourceDir || resourceDir.virtualAddress === 0) {
      return null;
    }

    const offset = this.rvaToFileOffset(resourceDir.virtualAddress, sections);
    if (offset === null) return null;

    return this.parseResourceDirectoryTable(offset, resourceDir.virtualAddress, sections);
  }

  private parseResourceDirectoryTable(offset: number, baseRVA: number, sections: SectionHeader[]): ResourceDirectory {
    return {
      characteristics: this.view.getUint32(offset, true),
      timeDateStamp: this.view.getUint32(offset + 4, true),
      majorVersion: this.view.getUint16(offset + 8, true),
      minorVersion: this.view.getUint16(offset + 10, true),
      numberOfNamedEntries: this.view.getUint16(offset + 12, true),
      numberOfIdEntries: this.view.getUint16(offset + 14, true),
      entries: [],
    };
  }

  /**
   * Load PE into memory and apply relocations
   */
  loadIntoMemory(pe: PEFile, baseAddress: number): LoadedPE {
    const imageSize = pe.optionalHeader.sizeOfImage;
    const memory = new Uint8Array(imageSize);
    
    // Copy headers
    memory.set(this.data.slice(0, pe.optionalHeader.sizeOfHeaders));

    // Copy sections
    const sections = new Map<string, { start: number; size: number; data: Uint8Array }>();
    for (const section of pe.sections) {
      const sectionData = this.data.slice(
        section.pointerToRawData,
        section.pointerToRawData + section.sizeOfRawData
      );
      memory.set(sectionData, section.virtualAddress);
      
      sections.set(section.name, {
        start: section.virtualAddress,
        size: section.virtualSize,
        data: sectionData,
      });
    }

    const loaded: LoadedPE = {
      baseAddress,
      entryPoint: baseAddress + pe.optionalHeader.addressOfEntryPoint,
      memory,
      sections,
      imports: new Map(),
    };

    // Apply relocations if needed
    const preferredBase = pe.is64Bit 
      ? Number((pe.optionalHeader as OptionalHeader64).imageBase)
      : (pe.optionalHeader as OptionalHeader32).imageBase;
      
    if (baseAddress !== preferredBase) {
      this.applyRelocations(loaded, pe, baseAddress - preferredBase);
    }

    return loaded;
  }

  /**
   * Apply base relocations
   */
  applyRelocations(loaded: LoadedPE, pe: PEFile, delta: number): void {
    for (const block of pe.relocations) {
      for (const reloc of block.relocations) {
        const address = block.virtualAddress + reloc.offset;
        
        if (reloc.type === 3) { // IMAGE_REL_BASED_HIGHLOW (32-bit)
          const value = this.view.getUint32(address, true);
          const newValue = value + delta;
          new DataView(loaded.memory.buffer).setUint32(address, newValue, true);
        } else if (reloc.type === 10) { // IMAGE_REL_BASED_DIR64 (64-bit)
          const value = Number(this.view.getBigUint64(address, true));
          const newValue = BigInt(value + delta);
          new DataView(loaded.memory.buffer).setBigUint64(address, newValue, true);
        }
      }
    }
  }

  /**
   * Resolve imports (stub - would call into Win32 subsystem)
   */
  resolveImports(loaded: LoadedPE, pe: PEFile): void {
    for (const importEntry of pe.imports) {
      const dllImports = new Map<string, number>();
      
      for (const func of importEntry.functions) {
        // In real implementation, would resolve via Win32 subsystem
        const stubAddress = loaded.baseAddress + func.address;
        dllImports.set(func.name || `Ordinal${func.ordinal}`, stubAddress);
      }
      
      loaded.imports.set(importEntry.dll, dllImports);
    }
  }

  /**
   * Convert RVA to file offset
   */
  private rvaToFileOffset(rva: number, sections: SectionHeader[]): number | null {
    for (const section of sections) {
      if (rva >= section.virtualAddress && rva < section.virtualAddress + section.virtualSize) {
        return section.pointerToRawData + (rva - section.virtualAddress);
      }
    }
    return null;
  }

  /**
   * Read null-terminated string
   */
  private readString(offset: number): string {
    let str = '';
    let i = offset;
    while (i < this.data.length) {
      const charCode = this.data[i];
      if (charCode === 0) break;
      str += String.fromCharCode(charCode);
      i++;
    }
    return str;
  }
}
