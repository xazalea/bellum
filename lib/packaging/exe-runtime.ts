export function buildExeRuntimeScript(): string {
  return `
      class ExeRuntime {
        load(bytes) {
          const view = new DataView(bytes.buffer);
          const mz = String.fromCharCode(bytes[0], bytes[1]);
          if (mz !== 'MZ') {
            return { isValid: false };
          }
          const peOffset = view.getUint32(0x3c, true);
          const peSignature = view.getUint32(peOffset, true);
          const isValid = peSignature === 0x00004550;
          const machine = isValid ? view.getUint16(peOffset + 4, true) : 0;
          return {
            isValid,
            machine,
            peOffset,
          };
        }
      }
  `;
}
