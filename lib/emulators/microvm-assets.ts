export interface MicroVMAssetPaths {
  kernelUrl: string;
  initrdUrl: string;
}

export const microVmAssetDefaults: MicroVMAssetPaths = {
  kernelUrl: '/microvm/kernel/bzimage',
  initrdUrl: '/microvm/kernel/initrd.img',
};

const preflightCache = new Map<string, Promise<boolean>>();

export function resolveMicroVmAssets(): MicroVMAssetPaths {
  if (typeof window !== 'undefined') {
    const override = (window as any).__MICROVM_ASSETS__ as Partial<MicroVMAssetPaths> | undefined;
    if (override?.kernelUrl && override?.initrdUrl) {
      return {
        kernelUrl: override.kernelUrl,
        initrdUrl: override.initrdUrl,
      };
    }
  }
  return microVmAssetDefaults;
}

export async function preflightAssets(paths: MicroVMAssetPaths, timeoutMs: number = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const [kernelRes, initrdRes] = await Promise.all([
      fetch(paths.kernelUrl, { method: 'HEAD', signal: controller.signal }),
      fetch(paths.initrdUrl, { method: 'HEAD', signal: controller.signal }),
    ]);
    return Boolean(kernelRes.ok && initrdRes.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function preflightAssetsCached(
  paths: MicroVMAssetPaths,
  timeoutMs: number = 4000
): Promise<boolean> {
  const key = `${paths.kernelUrl}|${paths.initrdUrl}|${timeoutMs}`;
  const cached = preflightCache.get(key);
  if (cached) return cached;
  const promise = preflightAssets(paths, timeoutMs);
  preflightCache.set(key, promise);
  return promise;
}
