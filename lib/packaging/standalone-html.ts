export type StandaloneHtmlBuildInput = {
  /**
   * A user-visible name for the exported file and the runtime title.
   */
  title: string;
  /**
   * The HTML payload to run inside the standalone file.
   */
  html: string;
};

function toBase64(bytes: Uint8Array): string {
  // Browser-safe base64 (avoid Node Buffer).
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function gzipUtf8IfPossible(text: string): Promise<{ encoding: 'utf8' | 'gzip+base64'; payload: string }> {
  if (typeof CompressionStream === 'undefined') {
    return { encoding: 'utf8', payload: text };
  }
  try {
    const cs = new CompressionStream('gzip');
    const enc = new TextEncoder();
    const input = new Blob([enc.encode(text)]);
    const stream = input.stream().pipeThrough(cs);
    const outBuf = await new Response(stream).arrayBuffer();
    const b64 = toBase64(new Uint8Array(outBuf));
    return { encoding: 'gzip+base64', payload: b64 };
  } catch {
    return { encoding: 'utf8', payload: text };
  }
}

export async function buildStandaloneHtmlFile(input: StandaloneHtmlBuildInput): Promise<string> {
  const { encoding, payload } = await gzipUtf8IfPossible(input.html);
  const title = escapeHtmlAttr(input.title || 'Standalone');

  // Self-contained runner:
  // - Decodes & optionally decompresses embedded payload
  // - Runs it via iframe srcdoc (no network / no external assets)
  // Notes:
  // - Certain APIs (workers, SharedArrayBuffer) are constrained on file:// in some browsers.
  // - This exporter targets pure HTML payloads.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root{color-scheme:dark}
      html,body{margin:0;height:100%;background:#0b0b10;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,sans-serif}
      .topbar{position:fixed;top:0;left:0;right:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:rgba(0,0,0,.55);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.08)}
      .title{font-weight:700;font-size:13px;color:rgba(255,255,255,.92);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .meta{font-size:12px;color:rgba(255,255,255,.55)}
      .btn{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.9);padding:7px 10px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer}
      .btn:hover{background:rgba(255,255,255,.10)}
      #frame{position:fixed;inset:44px 0 0 0;width:100%;height:calc(100% - 44px);border:0;background:#000}
      .warn{max-width:720px}
      .pill{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06)}
      code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;color:rgba(255,255,255,.8)}
    </style>
  </head>
  <body>
    <div class="topbar">
      <div class="min">
        <div class="title">${title}</div>
        <div class="meta">
          <span class="pill">mode: <code>standalone</code></span>
          <span class="pill">encoding: <code>${encoding}</code></span>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn" id="reloadBtn" type="button">Reload</button>
      </div>
    </div>
    <iframe id="frame" sandbox="allow-scripts allow-forms allow-pointer-lock allow-popups allow-modals" referrerpolicy="no-referrer"></iframe>
    <script>
      const ENCODING = ${JSON.stringify(encoding)};
      const PAYLOAD = ${JSON.stringify(payload)};

      function b64ToBytes(b64){
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
      }

      async function decodeHtml(){
        if (ENCODING === 'utf8') return PAYLOAD;
        if (ENCODING === 'gzip+base64') {
          const bytes = b64ToBytes(PAYLOAD);
          if (typeof DecompressionStream === 'undefined') {
            throw new Error('This browser cannot decompress gzip payloads (missing DecompressionStream).');
          }
          const ds = new DecompressionStream('gzip');
          const stream = new Blob([bytes]).stream().pipeThrough(ds);
          const text = await new Response(stream).text();
          return text;
        }
        throw new Error('Unknown encoding: ' + ENCODING);
      }

      async function boot(){
        const frame = document.getElementById('frame');
        try {
          const html = await decodeHtml();
          frame.srcdoc = html;
        } catch (e) {
          const msg = (e && e.message) ? e.message : String(e);
          frame.srcdoc = '<!doctype html><html><body style=\"background:#0b0b10;color:#fff;font-family:system-ui;padding:24px\">' +
            '<h2>Failed to boot standalone file</h2>' +
            '<p style=\"color:rgba(255,255,255,.7)\">' + msg.replace(/</g,'&lt;') + '</p>' +
            '<p style=\"color:rgba(255,255,255,.6)\">Tip: if you opened this via <code>file://</code>, some browsers restrict certain APIs. Try a local static server.</p>' +
            '</body></html>';
        }
      }

      document.getElementById('reloadBtn').addEventListener('click', () => boot());
      boot();
    </script>
  </body>
</html>`;
}

export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}






