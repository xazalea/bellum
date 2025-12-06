/**
 * NativeBridge: Interface for C++ and Rust Integration
 * Allows execution of optimized native code inside the engine via WebAssembly.
 */

export class NativeBridge {
    private instance: WebAssembly.Instance | null = null;
    private memory: WebAssembly.Memory | null = null;

    // Environment imports for the C++/Rust module
    private env = {
        console_log: (ptr: number, len: number) => {
            // Read string from memory
            if (this.memory) {
                const bytes = new Uint8Array(this.memory.buffer, ptr, len);
                const msg = new TextDecoder().decode(bytes);
                console.log(`[Native] ${msg}`);
            }
        },
        gpu_dispatch: (x: number, y: number, z: number) => {
            console.log(`[Native] Dispatching GPU Compute: ${x}x${y}x${z}`);
            // Hook into Hyperion/Megakernel dispatch
        }
    };

    /**
     * Loads a WASM binary (compiled from C++ or Rust)
     */
    public async loadModule(wasmBuffer: ArrayBuffer) {
        try {
            const wasmModule = await WebAssembly.instantiate(wasmBuffer, {
                env: this.env
            });
            this.instance = wasmModule.instance;
            this.memory = wasmModule.instance.exports.memory as WebAssembly.Memory;
            console.log("NativeBridge: Module loaded successfully.");

            // Check for initialization function
            if (this.instance.exports.init) {
                (this.instance.exports.init as Function)();
            }
        } catch (e) {
            console.error("NativeBridge Error:", e);
        }
    }

    /**
     * Calls an exported function from the native module
     */
    public call(functionName: string, ...args: any[]): any {
        if (!this.instance || !this.instance.exports[functionName]) {
            console.warn(`NativeBridge: Function '${functionName}' not found.`);
            return null;
        }
        return (this.instance.exports[functionName] as Function)(...args);
    }
}

export const nativeBridge = new NativeBridge();
