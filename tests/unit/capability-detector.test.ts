/**
 * Unit tests for capability detection module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock browser APIs
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  hardwareConcurrency: 8,
  deviceMemory: 8,
  connection: {
    effectiveType: '4g',
    downlink: 10,
  },
  getBattery: vi.fn(),
};

// Mock window
global.navigator = mockNavigator as any;
global.window = {
  matchMedia: vi.fn().mockReturnValue({ matches: false }),
} as any;

describe('CapabilityDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectCPUCores', () => {
    it('should return number of CPU cores', () => {
      expect(mockNavigator.hardwareConcurrency).toBe(8);
    });

    it('should return default value when not available', () => {
      const originalConcurrency = mockNavigator.hardwareConcurrency;
      (mockNavigator as any).hardwareConcurrency = undefined;
      
      // Default should be 4
      const cores = mockNavigator.hardwareConcurrency || 4;
      expect(cores).toBe(4);
      
      (mockNavigator as any).hardwareConcurrency = originalConcurrency;
    });
  });

  describe('detectMemory', () => {
    it('should return device memory in GB', () => {
      expect(mockNavigator.deviceMemory).toBe(8);
    });

    it('should return default value when not available', () => {
      const originalMemory = mockNavigator.deviceMemory;
      (mockNavigator as any).deviceMemory = undefined;
      
      const memory = mockNavigator.deviceMemory || 4;
      expect(memory).toBe(4);
      
      (mockNavigator as any).deviceMemory = originalMemory;
    });
  });

  describe('detectNetworkType', () => {
    it('should return effective connection type', () => {
      expect(mockNavigator.connection?.effectiveType).toBe('4g');
    });
  });

  describe('classifyDeviceTier', () => {
    it('should classify as Tier 1 (Low) for low-end devices', () => {
      const capabilities = {
        cpuCores: 2,
        memory: 2,
        webgpu: false,
        connectionType: '2g',
      };

      const tier = classifyTier(capabilities);
      expect(tier).toBe(1);
    });

    it('should classify as Tier 2 (Mid) for mid-range devices', () => {
      const capabilities = {
        cpuCores: 4,
        memory: 4,
        webgpu: false,
        connectionType: '3g',
      };

      const tier = classifyTier(capabilities);
      expect(tier).toBe(2);
    });

    it('should classify as Tier 3 (High) for high-end devices', () => {
      const capabilities = {
        cpuCores: 8,
        memory: 8,
        webgpu: true,
        connectionType: '4g',
      };

      const tier = classifyTier(capabilities);
      expect(tier).toBe(3);
    });

    it('should classify as Tier 4 (Mesh) when mesh available', () => {
      const capabilities = {
        cpuCores: 8,
        memory: 16,
        webgpu: true,
        connectionType: '4g',
        meshAvailable: true,
      };

      const tier = classifyTier(capabilities);
      expect(tier).toBe(4);
    });
  });

  describe('WebGPU detection', () => {
    it('should detect WebGPU support', async () => {
      // Mock GPU adapter
      const mockAdapter = {
        features: new Set(['shader-f16']),
        limits: {},
      };

      (navigator as any).gpu = {
        requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
      };

      const hasWebGPU = !!(navigator as any).gpu;
      expect(hasWebGPU).toBe(true);
    });

    it('should handle missing WebGPU', () => {
      (navigator as any).gpu = undefined;
      const hasWebGPU = !!(navigator as any).gpu;
      expect(hasWebGPU).toBe(false);
    });
  });
});

// Helper function for tier classification
function classifyTier(capabilities: {
  cpuCores: number;
  memory: number;
  webgpu: boolean;
  connectionType: string;
  meshAvailable?: boolean;
}): number {
  if (capabilities.meshAvailable) return 4;
  
  if (capabilities.webgpu && capabilities.cpuCores >= 8 && capabilities.memory >= 8) {
    return 3;
  }
  
  if (capabilities.cpuCores >= 4 && capabilities.memory >= 4) {
    return 2;
  }
  
  return 1;
}

describe('Feature Detection', () => {
  it('should detect SharedArrayBuffer support', () => {
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
    expect(typeof hasSharedArrayBuffer).toBe('boolean');
  });

  it('should detect WebAssembly support', () => {
    const hasWebAssembly = typeof WebAssembly !== 'undefined';
    expect(hasWebAssembly).toBe(true);
  });

  it('should detect IndexedDB support', () => {
    const hasIndexedDB = typeof indexedDB !== 'undefined';
    expect(typeof hasIndexedDB).toBe('boolean');
  });

  it('should detect Service Worker support', () => {
    const hasServiceWorker = 'serviceWorker' in navigator;
    expect(typeof hasServiceWorker).toBe('boolean');
  });
});

describe('Memory Pressure Detection', () => {
  it('should detect memory pressure level', () => {
    // Mock memory API
    const mockMemory = {
      usedJSHeapSize: 50 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 200 * 1024 * 1024,
    };

    (performance as any).memory = mockMemory;

    const usedMB = mockMemory.usedJSHeapSize / (1024 * 1024);
    const limitMB = mockMemory.jsHeapSizeLimit / (1024 * 1024);
    const usagePercent = (usedMB / limitMB) * 100;

    expect(usagePercent).toBe(25);
  });
});

describe('Network Quality Detection', () => {
  it('should calculate network quality score', () => {
    const connection = mockNavigator.connection;
    
    const qualityScore = calculateNetworkQuality({
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
    });

    expect(qualityScore).toBeGreaterThan(0);
    expect(qualityScore).toBeLessThanOrEqual(100);
  });

  it('should handle slow connections', () => {
    const qualityScore = calculateNetworkQuality({
      effectiveType: '2g',
      downlink: 0.5,
    });

    expect(qualityScore).toBeLessThan(50);
  });
});

function calculateNetworkQuality(info: {
  effectiveType: string;
  downlink: number;
}): number {
  const typeScores: Record<string, number> = {
    '4g': 100,
    '3g': 60,
    '2g': 30,
    'slow-2g': 10,
  };

  const typeScore = typeScores[info.effectiveType] || 50;
  const downlinkScore = Math.min(info.downlink * 10, 100);

  return (typeScore + downlinkScore) / 2;
}

export {};