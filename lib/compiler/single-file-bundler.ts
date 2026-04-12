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
      appBinary: input.appBinary,
    });

    const assets: EmbeddedAssetMap = {
      appBinary: {
        data: this.compressor.encodeBase64(compressed.appBinary.payload),
        algorithm: compressed.appBinary.algorithm,
        originalSize: compressed.appBinary.originalSize,
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
    const appBinary = await fetch(input.appBinaryUrl).then((r) => r.arrayBuffer());

    return this.compileFromBuffers({
      v86Js: new ArrayBuffer(0),
      v86Wasm: new ArrayBuffer(0),
      bios: new ArrayBuffer(0),
      vgaBios: new ArrayBuffer(0),
      osImage: new ArrayBuffer(0),
      appBinary,
    });
  }
}
