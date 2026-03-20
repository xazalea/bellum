/**
 * APK Extractor
 * Part of Project BELLUM NEXUS
 *
 * ZIP/APK extraction running entirely in the browser using web-standard APIs
 * (DecompressionStream, TextDecoder). No Node.js built-ins required.
 */

export interface ParsedManifest {
  packageName: string;
  versionCode: number;
  versionName: string;
  mainActivity: string;
  minSdkVersion: number;
  targetSdkVersion: number;
}

export interface APKContents {
  dexBuffers: ArrayBuffer[];
  manifest: ParsedManifest;
  /** e.g. "x86/libgame.so" → ArrayBuffer */
  nativeLibs: Map<string, ArrayBuffer>;
  assets: Map<string, ArrayBuffer>;
}

interface ZipEntry {
  fileName: string;
  compressionMethod: number; // 0=stored, 8=deflate
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  crc32: number;
}

// ---------------------------------------------------------------------------
// APKExtractor
// ---------------------------------------------------------------------------

export class APKExtractor {
  // -------------------------------------------------------------------------
  // Public
  // -------------------------------------------------------------------------

  async extract(buffer: ArrayBuffer): Promise<APKContents> {
    const bytes = new Uint8Array(buffer);

    const entries = this.parseZipCentralDirectory(bytes);

    const dexBuffers: ArrayBuffer[] = [];
    const nativeLibs = new Map<string, ArrayBuffer>();
    const assets = new Map<string, ArrayBuffer>();
    let rawManifest: ArrayBuffer | null = null;

    for (const entry of entries) {
      const name = entry.fileName;

      // Skip directories
      if (name.endsWith('/')) continue;

      const data = this.extractEntry(bytes, entry);

      // DEX files: classes.dex, classes2.dex, classes3.dex, …
      if (/^classes\d*\.dex$/.test(name)) {
        dexBuffers.push(data);
        continue;
      }

      // Binary manifest
      if (name === 'AndroidManifest.xml') {
        rawManifest = data;
        continue;
      }

      // Native libraries for supported ABIs
      const libMatch = name.match(/^lib\/(x86_64|x86|armeabi-v7a)\/(.+\.so)$/);
      if (libMatch) {
        const [, abi, soName] = libMatch;
        nativeLibs.set(`${abi}/${soName}`, data);
        continue;
      }

      // Assets
      if (name.startsWith('assets/')) {
        assets.set(name.slice('assets/'.length), data);
      }
    }

    const manifest = rawManifest
      ? this.parseBinaryManifest(rawManifest)
      : this.defaultManifest();

    return { dexBuffers, manifest, nativeLibs, assets };
  }

  // -------------------------------------------------------------------------
  // ZIP parsing
  // -------------------------------------------------------------------------

  private parseZipCentralDirectory(bytes: Uint8Array): ZipEntry[] {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const len = bytes.length;

    // Find End-of-Central-Directory record by scanning backwards for PK\x05\x06
    const EOCD_SIG = 0x06054b50;
    let eocdOffset = -1;

    // Minimum EOCD size is 22 bytes; comment can be up to 65535 bytes
    const searchStart = Math.max(0, len - 22 - 65535);
    for (let i = len - 22; i >= searchStart; i--) {
      if (view.getUint32(i, true) === EOCD_SIG) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      return [];
    }

    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const cdSize   = view.getUint32(eocdOffset + 12, true);
    const totalEntries = view.getUint16(eocdOffset + 10, true);

    const entries: ZipEntry[] = [];
    const CD_SIG = 0x02014b50;
    let pos = cdOffset;

    for (let i = 0; i < totalEntries && pos < cdOffset + cdSize; i++) {
      if (view.getUint32(pos, true) !== CD_SIG) break;

      const compressionMethod  = view.getUint16(pos + 10, true);
      const crc32              = view.getUint32(pos + 16, true);
      const compressedSize     = view.getUint32(pos + 20, true);
      const uncompressedSize   = view.getUint32(pos + 24, true);
      const fileNameLen        = view.getUint16(pos + 28, true);
      const extraLen           = view.getUint16(pos + 30, true);
      const commentLen         = view.getUint16(pos + 32, true);
      const localHeaderOffset  = view.getUint32(pos + 42, true);

      const fileNameBytes = bytes.subarray(pos + 46, pos + 46 + fileNameLen);
      const fileName = new TextDecoder().decode(fileNameBytes);

      entries.push({
        fileName,
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
        crc32,
      });

      pos += 46 + fileNameLen + extraLen + commentLen;
    }

    return entries;
  }

  private extractEntry(bytes: Uint8Array, entry: ZipEntry): ArrayBuffer {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // Parse local file header
    const LOCAL_SIG = 0x04034b50;
    const lhOffset = entry.localHeaderOffset;

    if (view.getUint32(lhOffset, true) !== LOCAL_SIG) {
      return new ArrayBuffer(0);
    }

    const localFileNameLen = view.getUint16(lhOffset + 26, true);
    const localExtraLen    = view.getUint16(lhOffset + 28, true);
    const dataOffset       = lhOffset + 30 + localFileNameLen + localExtraLen;

    const compressed = bytes.subarray(dataOffset, dataOffset + entry.compressedSize);

    if (entry.compressionMethod === 0) {
      // Stored — direct copy
      const buf = compressed.buffer as ArrayBuffer;
      return buf.slice(
        compressed.byteOffset,
        compressed.byteOffset + compressed.byteLength,
      );
    }

    if (entry.compressionMethod === 8) {
      // This method is intentionally sync-shaped but returns a Promise chain;
      // callers must await extract() which awaits this via decompressDeflate.
      // We throw here to keep the sync path clean; extract() calls the async path.
      throw new Error('USE_ASYNC');
    }

    return new ArrayBuffer(0);
  }

  // Override extract to handle deflate asynchronously
  // (replaces the sync extractEntry call for method=8 entries)
  private async extractEntryAsync(bytes: Uint8Array, entry: ZipEntry): Promise<ArrayBuffer> {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const LOCAL_SIG = 0x04034b50;
    const lhOffset = entry.localHeaderOffset;

    if (view.getUint32(lhOffset, true) !== LOCAL_SIG) {
      return new ArrayBuffer(0);
    }

    const localFileNameLen = view.getUint16(lhOffset + 26, true);
    const localExtraLen    = view.getUint16(lhOffset + 28, true);
    const dataOffset       = lhOffset + 30 + localFileNameLen + localExtraLen;

    const compressed = bytes.subarray(dataOffset, dataOffset + entry.compressedSize);

    if (entry.compressionMethod === 0) {
      const buf = compressed.buffer as ArrayBuffer;
      return buf.slice(
        compressed.byteOffset,
        compressed.byteOffset + compressed.byteLength,
      );
    }

    if (entry.compressionMethod === 8) {
      return this.decompressDeflate(compressed);
    }

    return new ArrayBuffer(0);
  }

  // Patch extract() to use the async path for all entries
  // (declared above is a placeholder that throws; real logic lives here)

  private async decompressDeflate(compressed: Uint8Array): Promise<ArrayBuffer> {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(compressed as Uint8Array<ArrayBuffer>);
    writer.close();

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLen = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result.buffer;
  }

  // -------------------------------------------------------------------------
  // Android Binary XML (AXML) parser
  // -------------------------------------------------------------------------

  private parseBinaryManifest(data: ArrayBuffer): ParsedManifest {
    try {
      return this.parseAXML(data);
    } catch {
      return this.defaultManifest();
    }
  }

  private parseAXML(data: ArrayBuffer): ParsedManifest {
    const view = new DataView(data);
    const AXML_MAGIC = 0x00080003;

    if (view.getUint32(0, true) !== AXML_MAGIC) {
      return this.defaultManifest();
    }

    // ---- String pool -------------------------------------------------------
    // Chunk header at offset 8: type=0x0001, headerSize, chunkSize
    let pos = 8;
    const chunkType = view.getUint16(pos, true);
    if (chunkType !== 0x0001) return this.defaultManifest();

    const headerSize  = view.getUint16(pos + 2, true);
    const chunkSize   = view.getUint32(pos + 4, true);
    const stringCount = view.getUint32(pos + 8, true);

    // String offsets array starts at pos + headerSize
    const offsetsBase = pos + headerSize;
    const stringsBase = offsetsBase + stringCount * 4;

    const strings: string[] = [];
    for (let i = 0; i < stringCount; i++) {
      const strOffset = view.getUint32(offsetsBase + i * 4, true);
      const absPos = stringsBase + strOffset;
      // UTF-16LE length-prefixed string (2-byte length prefix)
      const charCount = view.getUint16(absPos, true);
      let str = '';
      for (let c = 0; c < charCount; c++) {
        str += String.fromCharCode(view.getUint16(absPos + 2 + c * 2, true));
      }
      strings.push(str);
    }

    // ---- XML element chunks ------------------------------------------------
    pos += chunkSize;

    const result = this.defaultManifest();

    // Track whether we're inside the manifest element
    let inManifest = false;
    let inActivity = false;
    let currentActivityName = '';
    let hasMainAction = false;

    while (pos + 8 <= data.byteLength) {
      const type = view.getUint16(pos, true);
      const elemHeaderSize = view.getUint16(pos + 2, true);
      const elemChunkSize  = view.getUint32(pos + 4, true);

      if (elemChunkSize === 0) break;

      // START_ELEMENT = 0x0102
      if (type === 0x0102) {
        const lineNumber   = view.getUint32(pos + 8, true);
        const nsIdx        = view.getInt32(pos + 12, true);
        const nameIdx      = view.getInt32(pos + 16, true);
        const attrStart    = view.getUint16(pos + 20, true);
        const attrSize     = view.getUint16(pos + 22, true);
        const attrCount    = view.getUint16(pos + 24, true);

        const elemName = nameIdx >= 0 && nameIdx < strings.length ? strings[nameIdx] : '';
        const attrsBase = pos + attrStart;

        // Read attributes: each attr is 20 bytes
        // [nsIdx(4), nameIdx(4), rawValueIdx(4), valueType(4), value(4)]
        const attrs: Array<{ ns: string; name: string; rawValue: string; value: number }> = [];
        for (let a = 0; a < attrCount; a++) {
          const aBase = attrsBase + a * 20;
          const aNsIdx    = view.getInt32(aBase,      true);
          const aNameIdx  = view.getInt32(aBase + 4,  true);
          const aRawIdx   = view.getInt32(aBase + 8,  true);
          const aType     = view.getUint32(aBase + 12, true);
          const aValue    = view.getInt32(aBase + 16, true);

          attrs.push({
            ns:       aNsIdx >= 0 && aNsIdx < strings.length ? strings[aNsIdx] : '',
            name:     aNameIdx >= 0 && aNameIdx < strings.length ? strings[aNameIdx] : '',
            rawValue: aRawIdx >= 0 && aRawIdx < strings.length ? strings[aRawIdx] : '',
            value:    aValue,
          });
        }

        if (elemName === 'manifest') {
          inManifest = true;
          for (const attr of attrs) {
            if (attr.name === 'package')      result.packageName = attr.rawValue || result.packageName;
            if (attr.name === 'versionCode')  result.versionCode = attr.value;
            if (attr.name === 'versionName')  result.versionName = attr.rawValue || String(attr.value);
          }
        }

        if (elemName === 'uses-sdk') {
          for (const attr of attrs) {
            if (attr.name === 'minSdkVersion')    result.minSdkVersion = attr.value;
            if (attr.name === 'targetSdkVersion') result.targetSdkVersion = attr.value;
          }
        }

        if (elemName === 'activity') {
          inActivity = true;
          hasMainAction = false;
          currentActivityName = '';
          for (const attr of attrs) {
            if (attr.name === 'name') currentActivityName = attr.rawValue || currentActivityName;
          }
        }

        if (elemName === 'action') {
          for (const attr of attrs) {
            if (attr.name === 'name' && attr.rawValue === 'android.intent.action.MAIN') {
              hasMainAction = true;
            }
          }
        }
      }

      // END_ELEMENT = 0x0103
      if (type === 0x0103) {
        const nameIdx = view.getInt32(pos + 16, true);
        const elemName = nameIdx >= 0 && nameIdx < strings.length ? strings[nameIdx] : '';

        if (elemName === 'activity') {
          if (inActivity && hasMainAction && currentActivityName) {
            result.mainActivity = currentActivityName;
          }
          inActivity = false;
          hasMainAction = false;
          currentActivityName = '';
        }
      }

      pos += elemChunkSize;
    }

    return result;
  }

  private defaultManifest(): ParsedManifest {
    return {
      packageName: 'unknown',
      versionCode: 1,
      versionName: '1.0',
      mainActivity: 'MainActivity',
      minSdkVersion: 21,
      targetSdkVersion: 33,
    };
  }

  // -------------------------------------------------------------------------
  // ABI detection
  // -------------------------------------------------------------------------

  private detectABI(): string {
    // navigator may not be available in Cloudflare Workers; guard accordingly
    if (typeof navigator === 'undefined') return 'x86_64';

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('x86_64') || ua.includes('amd64') || ua.includes('win64')) return 'x86_64';
    if (ua.includes('x86') || ua.includes('i686') || ua.includes('win32')) return 'x86';
    return 'x86_64';
  }
}

// Re-implement extract() to properly handle async decompression
// We patch the prototype so decompressDeflate is always awaited.
const _originalExtract = APKExtractor.prototype.extract;
APKExtractor.prototype.extract = async function (this: APKExtractor, buffer: ArrayBuffer): Promise<APKContents> {
  const bytes = new Uint8Array(buffer);
  // Use private accessor via cast
  const self = this as any;

  const entries: ZipEntry[] = self.parseZipCentralDirectory(bytes);

  const dexBuffers: ArrayBuffer[] = [];
  const nativeLibs = new Map<string, ArrayBuffer>();
  const assets = new Map<string, ArrayBuffer>();
  let rawManifest: ArrayBuffer | null = null;

  for (const entry of entries) {
    const name = entry.fileName;
    if (name.endsWith('/')) continue;

    const data = await self.extractEntryAsync(bytes, entry);

    if (/^classes\d*\.dex$/.test(name)) {
      dexBuffers.push(data);
      continue;
    }

    if (name === 'AndroidManifest.xml') {
      rawManifest = data;
      continue;
    }

    const libMatch = name.match(/^lib\/(x86_64|x86|armeabi-v7a)\/(.+\.so)$/);
    if (libMatch) {
      const [, abi, soName] = libMatch;
      nativeLibs.set(`${abi}/${soName}`, data);
      continue;
    }

    if (name.startsWith('assets/')) {
      assets.set(name.slice('assets/'.length), data);
    }
  }

  const manifest = rawManifest
    ? self.parseBinaryManifest(rawManifest)
    : self.defaultManifest();

  return { dexBuffers, manifest, nativeLibs, assets };
};

export const apkExtractor = new APKExtractor();
