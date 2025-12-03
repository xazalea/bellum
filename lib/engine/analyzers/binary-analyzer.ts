
export enum FileType {
  UNKNOWN = 'unknown',
  PE_EXE = 'pe_exe', // Windows
  ELF = 'elf',       // Linux
  APK = 'apk',       // Android
  ISO = 'iso',       // Disk Image
  ZIP = 'zip',
  // Source Files
  CPP = 'cpp',
  HASKELL = 'hs',
  PHP = 'php',
  PYTHON = 'py'
}

export class BinaryAnalyzer {
  static async detectType(buffer: ArrayBuffer, fileName?: string): Promise<FileType> {
    const view = new DataView(buffer);
    
    // Extension-based check for source files (Binary sniffing is unreliable for text)
    if (fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'cpp': return FileType.CPP;
            case 'cc': return FileType.CPP;
            case 'hs': return FileType.HASKELL;
            case 'php': return FileType.PHP;
            case 'py': return FileType.PYTHON;
            case 'apk': return FileType.APK;
            case 'exe': return FileType.PE_EXE;
        }
    }

    if (buffer.byteLength < 4) return FileType.UNKNOWN;

    const magic2 = view.getUint16(0, false); // Big endian
    const magic4 = view.getUint32(0, false);

    // Check for "MZ" (Windows EXE)
    // M = 0x4D, Z = 0x5A (Little Endian: 0x5A4D)
    if (view.getUint16(0, true) === 0x5A4D) {
        return FileType.PE_EXE;
    }

    // Check for ELF (Linux)
    // 0x7F 'E' 'L' 'F'
    if (magic4 === 0x7F454C46) {
        return FileType.ELF;
    }

    // Check for PK (Zip/APK)
    // 0x50 0x4B 0x03 0x04
    if (magic4 === 0x504B0304) {
        // Check for classes.dex in zip directory (simplified check)
        return FileType.ZIP; 
    }
    
    // Check for DEX (Android Bytecode) directly
    // 'd' 'e' 'x' '\n' (0x64 0x65 0x78 0x0A)
    if (magic4 === 0x6465780A) {
        return FileType.APK;
    }

    return FileType.UNKNOWN;
  }
}
