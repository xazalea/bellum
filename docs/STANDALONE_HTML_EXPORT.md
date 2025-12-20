# Standalone HTML export (single-file)

Bellum can export **some apps** into a **single, playable `.html` file**.

## Supported now
- **Pure HTML apps**: apps installed with an original filename ending in **`.html`** / **`.htm`**.
  - In the Runner, use the **Download** button to export.
  - The exported file embeds the HTML payload and boots it via `iframe.srcdoc`.

## Not supported yet (by design, for now)
- **Android APKs** and **Windows EXE/MSI** “apps” cannot currently be turned into a single offline HTML file.\n  These require large emulation runtimes + additional assets (WASM, BIOS, system images) and stronger sandbox/cross-origin constraints.\n\n## Notes / limitations
- Browsers differ in what they allow on `file://`.\n  If a standalone file fails to boot, serve it from a local static server and re-try.\n+- Exported files may embed the payload using **`gzip+base64`** when `CompressionStream` is available.\n  At runtime, the file uses `DecompressionStream` to restore the HTML.\n+



