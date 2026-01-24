/**
 * Standalone Emulator Export
 * Creates a single HTML file with embedded emulator and game binary
 * WARNING: This produces LARGE files (10-50MB+) as it includes the entire runtime
 */

import { buildWebgpuStandaloneRuntime } from './webgpu-standalone';
import { buildApkRuntimeScript } from './apk-runtime';
import { buildExeRuntimeScript } from './exe-runtime';
export interface StandaloneEmulatorBuildInput {
  title: string;
  binary: ArrayBuffer;
  type: 'apk' | 'exe';
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function buildStandaloneEmulatorFile(input: StandaloneEmulatorBuildInput): Promise<string> {
  const title = escapeHtmlAttr(input.title || 'Emulated App');
  const binaryBase64 = toBase64(new Uint8Array(input.binary));
  const binarySizeMB = (input.binary.byteLength / 1024 / 1024).toFixed(1);
  const isAndroid = input.type === 'apk';
  const emulatorName = isAndroid ? 'Android Runtime' : 'Windows Runtime';
  const icon = isAndroid ? '🤖' : '⊞';
  const runtimeScript = buildWebgpuStandaloneRuntime();
  const apkRuntimeScript = buildApkRuntimeScript();
  const exeRuntimeScript = buildExeRuntimeScript();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="Standalone ${input.type.toUpperCase()} emulator exported from Nacho" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${icon}</text></svg>" />
    <style>
      :root{color-scheme:dark}
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{height:100%;background:#0b0b10;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,sans-serif;overflow:hidden}
      body{display:flex;flex-direction:column}
      .topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(11,15,26,.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(168,180,208,.12);box-shadow:0 4px 12px rgba(0,0,0,.3);flex-shrink:0}
      .title{font-weight:700;font-size:14px;color:#E2E8F0;display:flex;align-items:center;gap:8px}
      .logo{font-size:18px}
      .meta{font-size:11px;color:#94A3B8;display:flex;gap:8px}
      .pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:20px;border:1px solid rgba(168,180,208,.15);background:rgba(20,26,38,.6);font-size:11px}
      .btn{border:1px solid rgba(168,180,208,.15);background:rgba(168,180,208,.08);color:#E2E8F0;padding:8px 14px;border-radius:12px;font-weight:600;font-size:12px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
      .btn:hover{background:rgba(168,180,208,.15);transform:translateY(-1px)}
      .btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
      #canvas{flex:1;width:100%;height:100%;object-fit:contain;background:#000}
      .loading{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0b0b10;z-index:100;flex-direction:column;gap:20px}
      .spinner{width:50px;height:50px;border:4px solid rgba(168,180,208,.2);border-top-color:#A8B4D0;border-radius:50%;animation:spin 1s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
      .progress{width:300px;max-width:80vw;height:4px;background:rgba(168,180,208,.2);border-radius:2px;overflow:hidden}
      .progress-bar{height:100%;background:#A8B4D0;transition:width .3s;border-radius:2px}
      .status-text{color:#94A3B8;font-size:14px;text-align:center;font-weight:500}
      .warning{max-width:500px;margin:20px;padding:16px;background:rgba(255,193,7,.1);border:1px solid rgba(255,193,7,.3);border-radius:12px;color:#FFC107;font-size:13px;text-align:center}
    </style>
  </head>
  <body>
    <div class="loading" id="loading">
      <div class="spinner"></div>
      <div class="status-text" id="statusText">Initializing ${emulatorName}...</div>
      <div class="progress">
        <div class="progress-bar" id="progressBar" style="width:0%"></div>
      </div>
      <div class="warning">
        ⚠️ This is experimental emulation. Full compatibility is not guaranteed.<br>
        Binary size: ${binarySizeMB}MB | First load may take time
      </div>
    </div>
    <div class="topbar">
      <div class="title">
        <span class="logo">${icon}</span>
        <span>${title}</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="meta">
          <span class="pill">type: <code>${input.type}</code></span>
          <span class="pill">emulated</span>
        </div>
        <button class="btn" id="restartBtn" type="button">⟳ Restart</button>
        <button class="btn" id="fullscreenBtn" type="button">⛶ Fullscreen</button>
      </div>
    </div>
    <canvas id="canvas" width="1920" height="1080"></canvas>
    
    <script>
      // Embedded binary
      const BINARY_BASE64 = "${binaryBase64}";
      const BINARY_TYPE = "${input.type}";
      
      // Decode base64 to bytes
      function b64ToBytes(b64) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
      }
      
      // Update loading status
      function setStatus(text, progress) {
        document.getElementById('statusText').textContent = text;
        if (progress !== undefined) {
          document.getElementById('progressBar').style.width = progress + '%';
        }
      }
      
      ${runtimeScript}
      ${apkRuntimeScript}
      ${exeRuntimeScript}

      class StandaloneRuntime {
        constructor(canvas) {
          this.canvas = canvas;
          this.runtime = new WebGPURuntime(canvas);
          this.ctx = canvas.getContext('2d');
          this.apkRuntime = new ApkRuntime();
          this.exeRuntime = new ExeRuntime();
        }

        async loadBinary(bytes, type) {
          setStatus('Validating binary...', 20);
          const header = String.fromCharCode(bytes[0], bytes[1]);
          if (type === 'apk' && header !== 'PK') {
            throw new Error('Invalid APK header');
          }
          if (type === 'exe' && header !== 'MZ') {
            throw new Error('Invalid EXE header');
          }
          if (type === 'apk') {
            const apkInfo = this.apkRuntime.load(bytes);
            setStatus(\`APK entries: \${apkInfo.entryCount}\`, 35);
          } else {
            const exeInfo = this.exeRuntime.load(bytes);
            if (!exeInfo.isValid) {
              throw new Error('Invalid PE signature');
            }
            setStatus(\`PE loaded (machine: \${exeInfo.machine.toString(16)})\`, 35);
          }
          setStatus('Booting runtime...', 50);
          const gpuReady = await this.runtime.init();
          if (!gpuReady) {
            this.drawFallback(type);
          }
          setStatus('Runtime ready', 90);
          return true;
        }

        drawFallback(type) {
          if (!this.ctx) return;
          this.ctx.fillStyle = type === 'apk' ? '#121212' : '#001a33';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.fillStyle = '#fff';
          this.ctx.font = 'bold 32px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(type === 'apk' ? 'Android Runtime' : 'Windows Runtime', this.canvas.width / 2, this.canvas.height / 2);
        }

        start() {
          this.runtime.start();
        }

        stop() {
          this.runtime.stop();
        }
      }
      
      // Global emulator instance
      let emulator = null;
      
      // Boot sequence
      async function boot() {
        try {
          setStatus('Decoding binary (${binarySizeMB}MB)...', 0);
          await new Promise(r => setTimeout(r, 500));
          
          const binaryBytes = b64ToBytes(BINARY_BASE64);
          setStatus('Binary decoded', 10);
          
          const canvas = document.getElementById('canvas');
          emulator = new StandaloneRuntime(canvas);
          
          const success = await emulator.loadBinary(binaryBytes, BINARY_TYPE);
          
          if (success) {
            emulator.start();
            document.getElementById('loading').style.display = 'none';
          } else {
            throw new Error('Failed to load binary');
          }
          
        } catch (e) {
          setStatus('Error: ' + e.message, 0);
          console.error('Boot failed:', e);
        }
      }
      
      // Restart
      document.getElementById('restartBtn').addEventListener('click', () => {
        if (emulator) emulator.stop();
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('progressBar').style.width = '0%';
        setTimeout(() => boot(), 100);
      });
      
      // Fullscreen
      document.getElementById('fullscreenBtn').addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.warn('Fullscreen failed:', err);
          });
        } else {
          document.exitFullscreen();
        }
      });
      
      // Start
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
