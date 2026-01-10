/**
 * Standalone WASM Export
 * Creates a single HTML file with embedded WebAssembly module and runtime
 */

export interface StandaloneWasmBuildInput {
  title: string;
  wasmModule: ArrayBuffer;
  memoryPages?: number; // Initial WASM memory pages (default: 256 = 16MB)
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function buildStandaloneWasmFile(input: StandaloneWasmBuildInput): Promise<string> {
  const title = escapeHtmlAttr(input.title || 'WASM Game');
  const wasmBase64 = toBase64(new Uint8Array(input.wasmModule));
  const memoryPages = input.memoryPages || 256;
  const wasmSizeKB = (input.wasmModule.byteLength / 1024).toFixed(1);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="Standalone WASM game exported from Nacho" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
    <style>
      :root{color-scheme:dark}
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{height:100%;background:#0b0b10;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,sans-serif;overflow:hidden}
      body{display:flex;flex-direction:column}
      .topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(11,15,26,.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(168,180,208,.12);box-shadow:0 4px 12px rgba(0,0,0,.3);flex-shrink:0}
      .title{font-weight:700;font-size:14px;color:#E2E8F0;display:flex;align-items:center;gap:8px}
      .logo{font-size:18px}
      .btn{border:1px solid rgba(168,180,208,.15);background:rgba(168,180,208,.08);color:#E2E8F0;padding:8px 14px;border-radius:12px;font-weight:600;font-size:12px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
      .btn:hover{background:rgba(168,180,208,.15);border-color:rgba(168,180,208,.25);transform:translateY(-1px)}
      .btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
      #canvas{flex:1;width:100%;height:100%;object-fit:contain;background:#000;image-rendering:pixelated;image-rendering:crisp-edges}
      .status{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(20,26,38,.95);border:1px solid rgba(168,180,208,.2);border-radius:12px;padding:12px 20px;font-size:12px;color:#A8B4D0;backdrop-filter:blur(10px);z-index:10}
      .error{color:#ff6b6b;background:rgba(255,107,107,.1);border-color:rgba(255,107,107,.3)}
      .loading{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0b0b10;z-index:100;flex-direction:column;gap:20px}
      .spinner{width:40px;height:40px;border:3px solid rgba(168,180,208,.2);border-top-color:#A8B4D0;border-radius:50%;animation:spin 1s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
      .hidden{display:none}
    </style>
  </head>
  <body>
    <div class="loading" id="loading">
      <div class="spinner"></div>
      <div style="color:#94A3B8;font-size:14px">Loading WASM module...</div>
    </div>
    <div class="topbar">
      <div class="title">
        <span class="logo">⚡</span>
        <span>${title}</span>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" id="restartBtn" type="button">⟳ Restart</button>
        <button class="btn" id="fullscreenBtn" type="button">⛶ Fullscreen</button>
      </div>
    </div>
    <canvas id="canvas" width="800" height="600"></canvas>
    <div class="status hidden" id="status"></div>
    
    <script>
      const WASM_BASE64 = "${wasmBase64}";
      const MEMORY_PAGES = ${memoryPages};
      
      // Decode base64 to bytes
      function b64ToBytes(b64) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
      }
      
      // Show status message
      function showStatus(msg, isError = false) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = msg;
        statusEl.className = 'status' + (isError ? ' error' : '');
        statusEl.classList.remove('hidden');
        if (!isError) {
          setTimeout(() => statusEl.classList.add('hidden'), 3000);
        }
      }
      
      // WASM Runtime State
      let wasmInstance = null;
      let wasmMemory = null;
      let isRunning = false;
      
      // Canvas and context
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      
      // Syscall Bridge - Maps WASM imports to JavaScript functions
      const syscallBridge = {
        // Console output
        console_log: (ptr, len) => {
          const bytes = new Uint8Array(wasmMemory.buffer, ptr, len);
          const text = new TextDecoder().decode(bytes);
          console.log('[WASM]', text);
        },
        
        // Memory allocation (simple bump allocator)
        malloc: (size) => {
          // In a real impl, this would use a proper allocator
          // For now, just return a fixed address
          return 1024 * 1024; // 1MB offset
        },
        
        free: (ptr) => {
          // No-op for now
        },
        
        // Graphics - Draw pixel
        draw_pixel: (x, y, r, g, b, a) => {
          ctx.fillStyle = \`rgba(\${r},\${g},\${b},\${a/255})\`;
          ctx.fillRect(x, y, 1, 1);
        },
        
        // Graphics - Clear screen
        clear_screen: (r, g, b) => {
          ctx.fillStyle = \`rgb(\${r},\${g},\${b})\`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        },
        
        // Graphics - Draw rectangle
        draw_rect: (x, y, w, h, r, g, b, a) => {
          ctx.fillStyle = \`rgba(\${r},\${g},\${b},\${a/255})\`;
          ctx.fillRect(x, y, w, h);
        },
        
        // Time
        get_time_ms: () => {
          return Date.now();
        },
        
        // Random
        random: () => {
          return Math.random();
        }
      };
      
      // Boot WASM
      async function boot() {
        const loading = document.getElementById('loading');
        
        try {
          console.log('Decoding WASM module (${wasmSizeKB}KB)...');
          const wasmBytes = b64ToBytes(WASM_BASE64);
          
          console.log('Creating WASM memory...');
          wasmMemory = new WebAssembly.Memory({ initial: MEMORY_PAGES });
          
          console.log('Instantiating WASM module...');
          const result = await WebAssembly.instantiate(wasmBytes, {
            env: {
              memory: wasmMemory,
              ...syscallBridge
            },
            wasi_snapshot_preview1: {
              // WASI stubs
              proc_exit: (code) => {
                console.log('WASM exited with code', code);
                isRunning = false;
                showStatus('Game ended');
              },
              fd_write: () => 0,
              fd_read: () => 0,
              fd_close: () => 0
            }
          });
          
          wasmInstance = result.instance;
          
          loading.classList.add('hidden');
          console.log('WASM loaded successfully');
          showStatus('Ready');
          
          // Call start function if it exists
          if (wasmInstance.exports._start) {
            console.log('Calling _start...');
            wasmInstance.exports._start();
          } else if (wasmInstance.exports.main) {
            console.log('Calling main...');
            wasmInstance.exports.main();
          } else if (wasmInstance.exports.run) {
            console.log('Calling run...');
            wasmInstance.exports.run();
          }
          
          // Start game loop if available
          if (wasmInstance.exports.update) {
            isRunning = true;
            gameLoop();
          }
          
        } catch (e) {
          loading.classList.add('hidden');
          console.error('Failed to load WASM:', e);
          showStatus('Failed to load: ' + e.message, true);
          
          // Draw error on canvas
          ctx.fillStyle = '#0b0b10';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ff6b6b';
          ctx.font = '20px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('WASM Load Error', canvas.width/2, canvas.height/2 - 20);
          ctx.fillStyle = '#94A3B8';
          ctx.font = '14px monospace';
          ctx.fillText(e.message, canvas.width/2, canvas.height/2 + 10);
        }
      }
      
      // Game loop
      let lastTime = Date.now();
      function gameLoop() {
        if (!isRunning || !wasmInstance) return;
        
        const now = Date.now();
        const deltaMs = now - lastTime;
        lastTime = now;
        
        try {
          // Call update function if available
          if (wasmInstance.exports.update) {
            wasmInstance.exports.update(deltaMs);
          }
          
          // Call render function if available
          if (wasmInstance.exports.render) {
            wasmInstance.exports.render();
          }
        } catch (e) {
          console.error('Game loop error:', e);
          isRunning = false;
          showStatus('Runtime error: ' + e.message, true);
          return;
        }
        
        requestAnimationFrame(gameLoop);
      }
      
      // Restart button
      document.getElementById('restartBtn').addEventListener('click', () => {
        isRunning = false;
        wasmInstance = null;
        wasmMemory = null;
        document.getElementById('loading').classList.remove('hidden');
        setTimeout(() => boot(), 100);
      });
      
      // Fullscreen button
      document.getElementById('fullscreenBtn').addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.warn('Fullscreen failed:', err);
          });
        } else {
          document.exitFullscreen();
        }
      });
      
      // Input handling - Pass to WASM if available
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
        if (wasmInstance && wasmInstance.exports.on_click) {
          wasmInstance.exports.on_click(x, y);
        }
      });
      
      document.addEventListener('keydown', (e) => {
        if (wasmInstance && wasmInstance.exports.on_keydown) {
          wasmInstance.exports.on_keydown(e.keyCode);
        }
      });
      
      document.addEventListener('keyup', (e) => {
        if (wasmInstance && wasmInstance.exports.on_keyup) {
          wasmInstance.exports.on_keyup(e.keyCode);
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
