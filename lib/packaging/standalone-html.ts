import { generateFullProxyRuntime, scanForExternalURLs, downloadAndEncodeResource } from './proxy-runtime';

export type StandaloneHtmlBuildInput = {
  /**
   * A user-visible name for the exported file and the runtime title.
   */
  title: string;
  /**
   * The HTML payload to run inside the standalone file.
   */
  html: string;
  /**
   * Enable proxy runtime for external resources
   */
  enableProxy?: boolean;
  /**
   * Inline external resources as data URLs
   */
  inlineResources?: boolean;
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
  let html = input.html;
  
  // Optionally inline external resources
  if (input.inlineResources) {
    console.log('[Export] Scanning for external resources...');
    const urls = scanForExternalURLs(html);
    console.log(`[Export] Found ${urls.length} external URLs`);
    
    for (const url of urls.slice(0, 20)) { // Limit to 20 resources
      console.log(`[Export] Downloading: ${url}`);
      const dataUrl = await downloadAndEncodeResource(url);
      if (dataUrl) {
        html = html.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), dataUrl);
        console.log(`[Export] Inlined: ${url}`);
      }
    }
  }
  
  const { encoding, payload } = await gzipUtf8IfPossible(html);
  const title = escapeHtmlAttr(input.title || 'Standalone');
  const proxyRuntime = input.enableProxy !== false ? generateFullProxyRuntime() : '';

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
    <meta name="description" content="Standalone HTML5 game exported from Nacho" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎮</text></svg>" />
    <style>
      :root{color-scheme:dark}
      *{box-sizing:border-box}
      html,body{margin:0;height:100%;background:#0b0b10;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,sans-serif;overflow:hidden}
      .topbar{position:fixed;top:0;left:0;right:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:rgba(11,15,26,.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(168,180,208,.12);box-shadow:0 4px 12px rgba(0,0,0,.3)}
      .title{font-weight:700;font-size:14px;color:#E2E8F0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:8px}
      .logo{font-size:18px}
      .meta{font-size:11px;color:#94A3B8;display:flex;gap:8px;flex-wrap:wrap}
      .btn{border:1px solid rgba(168,180,208,.15);background:rgba(168,180,208,.08);color:#E2E8F0;padding:8px 14px;border-radius:12px;font-weight:600;font-size:12px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
      .btn:hover{background:rgba(168,180,208,.15);border-color:rgba(168,180,208,.25);transform:translateY(-1px)}
      .btn:active{transform:translateY(0)}
      .btn.primary{background:#A8B4D0;color:#0B0F1A;border:none}
      .btn.primary:hover{background:#B8C4E0}
      #frame{position:fixed;inset:56px 0 0 0;width:100%;height:calc(100% - 56px);border:0;background:#000}
      .pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:20px;border:1px solid rgba(168,180,208,.15);background:rgba(20,26,38,.6);font-size:11px;font-weight:500}
      code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;color:#A8B4D0}
      .loading{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0b0b10;z-index:100;transition:opacity .3s}
      .loading.hidden{opacity:0;pointer-events:none}
      .spinner{width:40px;height:40px;border:3px solid rgba(168,180,208,.2);border-top-color:#A8B4D0;border-radius:50%;animation:spin 1s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
      @media(max-width:640px){.meta{display:none}.topbar{padding:8px 10px}.btn{padding:6px 10px;font-size:11px}}
    </style>
  </head>
  <body>
    <div class="loading" id="loading">
      <div class="spinner"></div>
    </div>
    <div class="topbar">
      <div class="title">
        <span class="logo">🎮</span>
        <span>${title}</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <div class="meta">
          <span class="pill">mode: <code>standalone</code></span>
          <span class="pill">encoding: <code>${encoding}</code></span>
          <span class="pill">powered by <code>nacho</code></span>
        </div>
        <button class="btn" id="reloadBtn" type="button" title="Reload the game">⟳ Reload</button>
        <button class="btn" id="fullscreenBtn" type="button" title="Toggle fullscreen">⛶ Fullscreen</button>
      </div>
    </div>
    <iframe id="frame" sandbox="allow-scripts allow-forms allow-pointer-lock allow-popups allow-modals allow-same-origin" referrerpolicy="no-referrer"></iframe>
    
    ${proxyRuntime}
    
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
        const loading = document.getElementById('loading');
        try {
          const html = await decodeHtml();
          frame.srcdoc = html;
          
          // Hide loading after a short delay
          setTimeout(() => {
            loading.classList.add('hidden');
          }, 500);
        } catch (e) {
          loading.classList.add('hidden');
          const msg = (e && e.message) ? e.message : String(e);
          frame.srcdoc = '<!doctype html><html><body style=\"background:#0b0b10;color:#E2E8F0;font-family:system-ui;padding:40px;text-align:center\">' +
            '<div style=\"max-width:600px;margin:0 auto\">' +
            '<h1 style=\"color:#E2E8F0;font-size:32px;margin-bottom:16px\">⚠️ Boot Failed</h1>' +
            '<div style=\"background:rgba(168,180,208,.1);border:1px solid rgba(168,180,208,.2);border-radius:16px;padding:20px;margin:20px 0\">' +
            '<code style=\"color:#A8B4D0;font-size:14px\">' + msg.replace(/</g,'&lt;') + '</code>' +
            '</div>' +
            '<p style=\"color:#94A3B8;line-height:1.6\">If you opened this via <code>file://</code>, some browsers restrict certain APIs. Try using a local web server instead.</p>' +
            '<button onclick=\"location.reload()\" style=\"background:#A8B4D0;color:#0B0F1A;border:none;padding:12px 24px;border-radius:12px;font-weight:600;cursor:pointer;margin-top:20px\">⟳ Try Again</button>' +
            '</div></body></html>';
        }
      }

      document.getElementById('reloadBtn').addEventListener('click', () => {
        const loading = document.getElementById('loading');
        loading.classList.remove('hidden');
        setTimeout(() => boot(), 100);
      });
      
      document.getElementById('fullscreenBtn').addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.warn('Fullscreen failed:', err);
          });
        } else {
          document.exitFullscreen();
        }
      });
      
      // Keyboard shortcut for fullscreen (F11 alternative)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          document.getElementById('fullscreenBtn').click();
        }
      });
      
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













