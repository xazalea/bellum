export interface EmbeddedAssetMap {
  [key: string]: {
    data: string;
    algorithm: string;
  };
}

export function buildSelfExtractingHtml(assets: EmbeddedAssetMap): string {
  const assetJson = JSON.stringify(assets);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bellum MicroVM Export</title>
  <style>
    html, body { margin: 0; width: 100%; height: 100%; background: #000; }
    #screen { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  <canvas id="screen"></canvas>
  <script>
    const ASSETS = ${assetJson};
    async function decodeBase64(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }
    async function injectV86() {
      if (!ASSETS.v86Js) return;
      const jsBuffer = await decodeBase64(ASSETS.v86Js.data);
      const jsText = new TextDecoder('utf-8').decode(jsBuffer);
      const script = document.createElement('script');
      script.textContent = jsText;
      document.head.appendChild(script);
    }
    async function boot() {
      await injectV86();
      const v86Wasm = await decodeBase64(ASSETS.v86Wasm.data);
      const bios = await decodeBase64(ASSETS.bios.data);
      const vgaBios = await decodeBase64(ASSETS.vgaBios.data);
      const osImage = await decodeBase64(ASSETS.osImage.data);
      const appBinary = await decodeBase64(ASSETS.appBinary.data);
      const v86Module = await WebAssembly.compile(v86Wasm);
      const canvas = document.getElementById('screen');
      const vm = new window.V86Starter({
        wasm_module: v86Module,
        bios: { buffer: bios },
        vga_bios: { buffer: vgaBios },
        hda: { buffer: osImage },
        autostart: true,
        screen_container: canvas.parentElement
      });
      vm.fs9p && vm.fs9p.write && vm.fs9p.write('/app.bin', appBinary);
      vm.serial0_send && vm.serial0_send('cd / && ./app.bin\\n');
    }
    boot();
  </script>
</body>
</html>`;
}
