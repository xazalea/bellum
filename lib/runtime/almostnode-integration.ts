/**
 * almostnode Integration for Challenger Deep
 * 
 * Provides Node.js runtime in the browser for:
 * - Running x86/ARM binary translation on client
 * - Executing compiled Wasm modules
 * - Running game code directly in browser
 */

import { createContainer, VirtualFS, Runtime } from 'almostnode';

export interface ChallengerRuntime {
  container: ReturnType<typeof createContainer>;
  vfs: VirtualFS;
  runtime: Runtime;
}

let runtimeInstance: ChallengerRuntime | null = null;

export async function initChallengerRuntime(): Promise<ChallengerRuntime> {
  if (runtimeInstance) {
    return runtimeInstance;
  }

  const container = createContainer({
    cwd: '/challenger',
    env: {
      NODE_ENV: 'production',
      PLATFORM: 'browser',
    },
    onConsole: (method: string, args: any[]) => {
      const fn = (console as any)[method];
      if (typeof fn === 'function') {
        fn('[Challenger]', ...args);
      }
    },
  });

  const vfs = container.vfs;
  const runtime = container.runtime;

  // Initialize virtual filesystem structure
  vfs.mkdirSync('/challenger/games', { recursive: true });
  vfs.mkdirSync('/challenger/roms', { recursive: true });
  vfs.mkdirSync('/challenger/saves', { recursive: true });
  vfs.mkdirSync('/challenger/cache', { recursive: true });
  vfs.mkdirSync('/challenger/tmp', { recursive: true });

  runtimeInstance = { container, vfs, runtime };

  return runtimeInstance;
}

export async function loadGame(buffer: ArrayBuffer, name: string): Promise<void> {
  const runtime = await initChallengerRuntime();
  
  // Write game binary to virtual filesystem
  runtime.vfs.writeFileSync(`/challenger/games/${name}`, new Uint8Array(buffer));
  
  console.log(`[Challenger] Loaded game: ${name}`);
}

export async function runBinary(
  code: string,
  filename: string = '/challenger/tmp/script.js'
): Promise<{ exports: any; stdout: string }> {
  const runtime = await initChallengerRuntime();
  
  runtime.vfs.writeFileSync(filename, code);
  
  const result = runtime.runtime.runFile(filename);
  
  return {
    exports: result.exports,
    stdout: '', // Would capture stdout in real implementation
  };
}

export async function installPackage(packageName: string): Promise<void> {
  const runtime = await initChallengerRuntime();
  
  await runtime.container.npm.install(packageName);
  
  console.log(`[Challenger] Installed package: ${packageName}`);
}

export async function runShellCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const runtime = await initChallengerRuntime();
  
  const result = await runtime.container.run(command);
  
  return result;
}

export function getVirtualFS(): VirtualFS | null {
  return runtimeInstance?.vfs || null;
}

export function writeVirtualFile(path: string, content: string | Uint8Array): void {
  if (!runtimeInstance) {
    throw new Error('Runtime not initialized');
  }
  
  const data = typeof content === 'string' ? content : content;
  runtimeInstance.vfs.writeFileSync(path, data);
}

export function readVirtualFile(path: string): string | Uint8Array {
  if (!runtimeInstance) {
    throw new Error('Runtime not initialized');
  }
  
  return runtimeInstance.vfs.readFileSync(path, 'utf8');
}

export function listVirtualFiles(dir: string): string[] {
  if (!runtimeInstance) {
    throw new Error('Runtime not initialized');
  }
  
  return runtimeInstance.vfs.readdirSync(dir);
}

// Re-export types
export type { VirtualFS, Runtime };

// Default export
export default ChallengerRuntime;
