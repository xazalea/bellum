import { UltraCompressor } from './ultra-compressor';
import { buildSelfExtractingHtml, EmbeddedAssetMap } from './html-template';

export interface SingleFileInput {
  v86Js: ArrayBuffer;
  v86Wasm: ArrayBuffer;
  bios: ArrayBuffer;
  vgaBios: ArrayBuffer;
  osImage: ArrayBuffer;
  appBinary: ArrayBuffer;
}

export class SingleFileBundler {
  private compressor = new UltraCompressor();

  async compileFromBuffers(input: SingleFileInput): Promise<string> {
    const compressed = await this.compressor.compress({
      v86Js: input.v86Js,
      v86Wasm: input.v86Wasm,
      bios: input.bios,
      vgaBios: input.vgaBios,
      osImage: input.osImage,
      appBinary: input.appBinary,
    });

    const assets: EmbeddedAssetMap = {
      v86Js: {
        data: this.compressor.encodeBase64(compressed.v86Js.payload),
        algorithm: compressed.v86Js.algorithm,
      },
      v86Wasm: {
        data: this.compressor.encodeBase64(compressed.v86Wasm.payload),
        algorithm: compressed.v86Wasm.algorithm,
      },
      bios: {
        data: this.compressor.encodeBase64(compressed.bios.payload),
        algorithm: compressed.bios.algorithm,
      },
      vgaBios: {
        data: this.compressor.encodeBase64(compressed.vgaBios.payload),
        algorithm: compressed.vgaBios.algorithm,
      },
      osImage: {
        data: this.compressor.encodeBase64(compressed.osImage.payload),
        algorithm: compressed.osImage.algorithm,
      },
      appBinary: {
        data: this.compressor.encodeBase64(compressed.appBinary.payload),
        algorithm: compressed.appBinary.algorithm,
      },
    };

    return buildSelfExtractingHtml(assets);
  }

  async compileFromUrls(input: {
    v86JsUrl: string;
    v86WasmUrl: string;
    biosUrl: string;
    vgaBiosUrl: string;
    osImageUrl: string;
    appBinaryUrl: string;
  }): Promise<string> {
    const [v86Js, v86Wasm, bios, vgaBios, osImage, appBinary] = await Promise.all([
      fetch(input.v86JsUrl).then((r) => r.arrayBuffer()),
      fetch(input.v86WasmUrl).then((r) => r.arrayBuffer()),
      fetch(input.biosUrl).then((r) => r.arrayBuffer()),
      fetch(input.vgaBiosUrl).then((r) => r.arrayBuffer()),
      fetch(input.osImageUrl).then((r) => r.arrayBuffer()),
      fetch(input.appBinaryUrl).then((r) => r.arrayBuffer()),
    ]);

    return this.compileFromBuffers({ v86Js, v86Wasm, bios, vgaBios, osImage, appBinary });
  }
}
