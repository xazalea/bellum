export function buildApkRuntimeScript(): string {
  return `
      class ApkRuntime {
        constructor() {
          this.entries = [];
        }

        load(bytes) {
          this.entries = this.parseZipEntries(bytes);
          return {
            entryCount: this.entries.length,
            hasManifest: this.entries.some(e => e.endsWith('AndroidManifest.xml')),
          };
        }

        parseZipEntries(bytes) {
          const data = new DataView(bytes.buffer);
          const eocdSignature = 0x06054b50;
          let eocdOffset = -1;
          for (let i = bytes.length - 22; i >= 0; i--) {
            if (data.getUint32(i, true) === eocdSignature) {
              eocdOffset = i;
              break;
            }
          }
          if (eocdOffset === -1) return [];
          const cdSize = data.getUint32(eocdOffset + 12, true);
          const cdOffset = data.getUint32(eocdOffset + 16, true);
          const entries = [];
          let offset = cdOffset;
          const cdSignature = 0x02014b50;
          while (offset < cdOffset + cdSize) {
            if (data.getUint32(offset, true) !== cdSignature) break;
            const nameLen = data.getUint16(offset + 28, true);
            const extraLen = data.getUint16(offset + 30, true);
            const commentLen = data.getUint16(offset + 32, true);
            const nameStart = offset + 46;
            const nameBytes = bytes.slice(nameStart, nameStart + nameLen);
            const name = new TextDecoder('utf-8').decode(nameBytes);
            entries.push(name);
            offset = nameStart + nameLen + extraLen + commentLen;
          }
          return entries;
        }
      }
  `;
}
