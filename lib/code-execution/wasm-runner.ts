export type WasmRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

type WorkerReq = {
  wasm: ArrayBuffer;
  input?: string;
  timeoutMs?: number;
};

type WorkerMsg =
  | { t: 'stdout'; s: string }
  | { t: 'stderr'; s: string }
  | { t: 'done'; exitCode: number }
  | { t: 'error'; message: string };

function createRunnerWorker(): Worker {
  const code = `
    self.onmessage = async (ev) => {
      const data = ev.data || {};
      const wasm = data.wasm;
      const timeoutMs = typeof data.timeoutMs === 'number' ? data.timeoutMs : 5000;
      let done = false;
      const post = (m) => { try { self.postMessage(m); } catch {} };

      const t = setTimeout(() => {
        if (done) return;
        done = true;
        post({ t: 'error', message: 'wasm_timeout' });
        try { self.close(); } catch {}
      }, timeoutMs);

      try {
        let stdout = '';
        let stderr = '';
        const env = {
          // Minimal stdout-like hook for toy modules.
          print: (v) => { stdout += String(v) + '\\n'; post({ t: 'stdout', s: String(v) + '\\n' }); },
          eprint: (v) => { stderr += String(v) + '\\n'; post({ t: 'stderr', s: String(v) + '\\n' }); },
        };
        const imports = { env, wasi_snapshot_preview1: { fd_write: () => 0 } };
        const inst = await WebAssembly.instantiate(wasm, imports);
        const ex = inst.instance.exports;
        let exitCode = 0;
        if (typeof ex._start === 'function') {
          ex._start();
        } else if (typeof ex.main === 'function') {
          exitCode = ex.main() | 0;
        } else {
          stderr += 'No entrypoint (expected _start or main)\\n';
          post({ t: 'stderr', s: 'No entrypoint (expected _start or main)\\n' });
          exitCode = 1;
        }
        if (!done) {
          done = true;
          clearTimeout(t);
          post({ t: 'done', exitCode });
        }
      } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        if (!done) {
          done = true;
          clearTimeout(t);
          post({ t: 'error', message: msg });
        }
      }
    };
  `;
  const blob = new Blob([code], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  return new Worker(url);
}

export async function runWasmOffMainThread(args: WorkerReq): Promise<WasmRunResult> {
  const w = createRunnerWorker();
  let stdout = '';
  let stderr = '';

  return await new Promise<WasmRunResult>((resolve) => {
    const cleanup = () => {
      try {
        w.terminate();
      } catch {
        // ignore
      }
    };

    w.onmessage = (ev: MessageEvent) => {
      const m = ev.data as WorkerMsg;
      if (!m || typeof m.t !== 'string') return;
      if (m.t === 'stdout') stdout += m.s;
      if (m.t === 'stderr') stderr += m.s;
      if (m.t === 'done') {
        cleanup();
        resolve({ stdout, stderr, exitCode: m.exitCode });
      }
      if (m.t === 'error') {
        cleanup();
        resolve({ stdout, stderr: (stderr || '') + (m.message || 'wasm_failed'), exitCode: 1 });
      }
    };

    // Ensure ArrayBuffer-backed payload for postMessage.
    const copy = new Uint8Array(args.wasm.byteLength);
    copy.set(new Uint8Array(args.wasm));
    w.postMessage({ wasm: copy.buffer, input: args.input, timeoutMs: args.timeoutMs }, [copy.buffer]);
  });
}







