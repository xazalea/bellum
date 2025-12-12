/**
 * Compiler Service - Handles Source -> WASM Compilation
 * Uses Web Workers for non-blocking compilation.
 */

export class CompilerService {
    private static instance: CompilerService;

    static getInstance(): CompilerService {
        if (!CompilerService.instance) {
            CompilerService.instance = new CompilerService();
        }
        return CompilerService.instance;
    }

    async compile(source: string, language: 'cpp' | 'haskell' | 'php'): Promise<Uint8Array> {
        console.log(`CompilerService: Compiling ${language} source...`);
        // No fake compilation: compilation must be done via the cluster/server compilation API.
        // Set NEXT_PUBLIC_CLUSTER_SERVER_URL to point at your cluster backend (or run it same-origin).
        const base =
            (typeof process !== 'undefined' &&
                (process.env as unknown as { NEXT_PUBLIC_CLUSTER_SERVER_URL?: string })
                    ?.NEXT_PUBLIC_CLUSTER_SERVER_URL) || '';

        if (language === 'cpp') {
            const res = await fetch(`${base}/api/CodeCompilation/compile/cpp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: source })
            });
            if (!res.ok) {
                throw new Error(`C++ compile failed (${res.status})`);
            }
            const json = await res.json();
            if (!json?.success || typeof json.wasmBase64 !== 'string') {
                throw new Error(json?.error || 'C++ compile failed');
            }
            const bin = atob(json.wasmBase64);
            const out = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
            return out;
        }

        throw new Error(`No compiler backend configured for ${language}.`);
    }

    // Old mock parser removed (no fake compilation).
}

export const compilerService = CompilerService.getInstance();

