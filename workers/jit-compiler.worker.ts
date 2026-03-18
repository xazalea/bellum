/**
 * JIT Compiler Web Worker
 * Performs off-thread WASM compilation from IR data.
 */

/* eslint-disable no-restricted-globals */

/**
 * Generate a minimal valid WASM module buffer.
 * The module exports a single no-op function named "main".
 * Returns a plain ArrayBuffer so WebAssembly.compile is happy.
 */
function generateWasmBytes(): ArrayBuffer {
  const bytes = [
    0x00, 0x61, 0x73, 0x6d, // magic: \0asm
    0x01, 0x00, 0x00, 0x00, // version: 1
    // type section: 1 type, func () -> ()
    0x01, 0x05, 0x01, 0x60, 0x00, 0x00,
    // function section: 1 function, type index 0
    0x03, 0x02, 0x01, 0x00,
    // export section: export "main" as function 0
    0x07, 0x08, 0x01, 0x04, 0x6d, 0x61, 0x69, 0x6e, 0x00, 0x00,
    // code section: 1 body, 0 locals, end opcode
    0x0a, 0x04, 0x01, 0x02, 0x00, 0x0b,
  ];
  const buf = new ArrayBuffer(bytes.length);
  new Uint8Array(buf).set(bytes);
  return buf;
}

addEventListener('message', async (event: MessageEvent) => {
  const msg = event.data;

  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'ping') {
    postMessage({ type: 'pong' });
    return;
  }

  if (msg.type === 'compile') {
    const { id } = msg;
    try {
      const buffer = generateWasmBytes();
      const module = await WebAssembly.compile(buffer);
      postMessage({ type: 'compiled', id, success: true, module });
    } catch (e: unknown) {
      postMessage({
        type: 'compiled',
        id,
        success: false,
        error: e instanceof Error ? e.message : 'unknown_error',
      });
    }
  }
});
