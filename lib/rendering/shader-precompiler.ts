/**
 * Shader Precompiler + Cache (OPFS-backed)
 * Boot-time shader preparation to eliminate runtime stutter.
 */

type ShaderKey = string;

export interface CachedShader {
  key: ShaderKey;
  wgsl: string;
  updatedAt: number;
}

class ShaderPrecompiler {
  private cache: Map<ShaderKey, CachedShader> = new Map();
  private maxEntries = 2000;
  private opfsDirName = 'bellum-shader-cache';
  private cacheFileName = 'cache.json';
  private persistTimer: number | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await this.loadFromOPFS();
  }

  getCachedWGSL(key: ShaderKey): string | null {
    const entry = this.cache.get(key);
    return entry ? entry.wgsl : null;
  }

  recordWGSL(key: ShaderKey, wgsl: string): void {
    this.cache.set(key, { key, wgsl, updatedAt: Date.now() });
    this.evictIfNeeded();
    this.schedulePersist();
  }

  async precompileWGSL(device: GPUDevice, entries: Array<{ key: ShaderKey; wgsl: string }>): Promise<void> {
    for (const entry of entries) {
      try {
        device.createShaderModule({ code: entry.wgsl });
        this.recordWGSL(entry.key, entry.wgsl);
      } catch (error) {
        console.warn('[ShaderPrecompiler] Failed to precompile WGSL:', error);
      }
    }
  }

  async precompileBaseline(device: GPUDevice): Promise<void> {
    const baseline = [
      {
        key: 'baseline:vertex:triangle',
        wgsl: `@vertex\nfn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {\n  var pos = array<vec2<f32>, 3>(\n    vec2<f32>(0.0, 0.5),\n    vec2<f32>(-0.5, -0.5),\n    vec2<f32>(0.5, -0.5)\n  );\n  return vec4<f32>(pos[vertexIndex], 0.0, 1.0);\n}`,
      },
      {
        key: 'baseline:fragment:solid',
        wgsl: `@fragment\nfn main() -> @location(0) vec4<f32> {\n  return vec4<f32>(0.2, 0.6, 1.0, 1.0);\n}`,
      },
    ];
    await this.precompileWGSL(device, baseline);
  }

  buildKey(kind: 'hlsl' | 'glsl', stage: string, source: string): ShaderKey {
    return `${kind}:${stage}:${this.hashString(source)}`;
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxEntries) return;
    const entries = Array.from(this.cache.values()).sort((a, b) => a.updatedAt - b.updatedAt);
    const toRemove = entries.slice(0, Math.max(1, entries.length - this.maxEntries));
    for (const entry of toRemove) {
      this.cache.delete(entry.key);
    }
  }

  private schedulePersist(): void {
    if (typeof window === 'undefined') return;
    if (this.persistTimer) {
      window.clearTimeout(this.persistTimer);
    }
    this.persistTimer = window.setTimeout(() => {
      this.persistTimer = null;
      void this.persistToOPFS();
    }, 1000);
  }

  private async loadFromOPFS(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return;
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle(this.opfsDirName, { create: true });
      const fileHandle = await dir.getFileHandle(this.cacheFileName, { create: true });
      const file = await fileHandle.getFile();
      if (file.size === 0) return;
      const text = await file.text();
      const parsed = JSON.parse(text) as CachedShader[];
      for (const entry of parsed) {
        this.cache.set(entry.key, entry);
      }
    } catch (error) {
      console.warn('[ShaderPrecompiler] Failed to load OPFS cache:', error);
    }
  }

  private async persistToOPFS(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return;
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle(this.opfsDirName, { create: true });
      const fileHandle = await dir.getFileHandle(this.cacheFileName, { create: true });
      const writable = await fileHandle.createWritable();
      const payload = JSON.stringify(Array.from(this.cache.values()));
      await writable.write(payload);
      await writable.close();
    } catch (error) {
      console.warn('[ShaderPrecompiler] Failed to persist OPFS cache:', error);
    }
  }

  private hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

export const shaderPrecompiler = new ShaderPrecompiler();
