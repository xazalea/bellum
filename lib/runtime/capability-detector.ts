/**
 * Capability Detection Module
 * Detects device capabilities for adaptive execution tier selection
 */

export type DeviceTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

export interface DeviceCapabilities {
  // GPU
  webgpu: boolean;
  webgpuFeatures: string[];
  webgl2: boolean;
  webgl1: boolean;
  
  // Compute
  cpuCores: number;
  hasSharedArrayBuffer: boolean;
  hasWebAssemblySIMD: boolean;
  hasWebAssemblyThreads: boolean;
  
  // Memory
  deviceMemory: number; // GB, approximate
  jsHeapSizeLimit: number; // bytes
  
  // Network
  connectionType: string;
  downlinkSpeed: number; // Mbps
  rtt: number; // ms
  
  // Storage
  indexedDB: boolean;
  storageQuota: number; // bytes
  
  // Other
  isMobile: boolean;
  isTouchDevice: boolean;
  screenResolution: { width: number; height: number };
  devicePixelRatio: number;
}

export interface TierInfo {
  tier: DeviceTier;
  score: number;
  capabilities: DeviceCapabilities;
  recommendedStrategy: string;
  memoryBudget: number; // bytes
  features: {
    jit: boolean;
    webgpu: boolean;
    aggressiveCaching: boolean;
    meshOffload: boolean;
    backgroundPrefetch: boolean;
  };
}

// Tier thresholds
const TIER_THRESHOLDS = {
  tier1: { minScore: 0, maxScore: 30 },
  tier2: { minScore: 31, maxScore: 55 },
  tier3: { minScore: 56, maxScore: 100 },
  tier4: { minScore: 0, maxScore: 0 }, // Mesh tier - determined by network, not score
};

// Memory budget percentages per tier
const MEMORY_BUDGET_PERCENTAGES = {
  tier1: 0.25,
  tier2: 0.40,
  tier3: 0.60,
  tier4: 0.20, // Thin client mode
};

/**
 * Detect WebGPU support and features
 */
async function detectWebGPU(): Promise<{ supported: boolean; features: string[] }> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return { supported: false, features: [] };
  }

  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) {
      return { supported: false, features: [] };
    }

    const info = await adapter.requestAdapterInfo();
    const features: string[] = [];
    
    // Check for specific features
    const featureList = [
      'depth-clip-control',
      'depth32float-stencil8',
      'texture-compression-bc',
      'texture-compression-etc2',
      'texture-compression-astc',
      'timestamp-query',
      'indirect-first-instance',
      'shader-f16',
      'pipeline-statistics-query',
    ];

    for (const feature of featureList) {
      if (adapter.features.has(feature)) {
        features.push(feature);
      }
    }

    return { supported: true, features };
  } catch (e) {
    return { supported: false, features: [] };
  }
}

/**
 * Detect WebGL support
 */
function detectWebGL(): { webgl1: boolean; webgl2: boolean } {
  if (typeof document === 'undefined') {
    return { webgl1: false, webgl2: false };
  }

  const canvas = document.createElement('canvas');
  let webgl1 = false;
  let webgl2 = false;

  try {
    const gl1 = canvas.getContext('webgl');
    webgl1 = gl1 !== null;
  } catch (e) {
    webgl1 = false;
  }

  try {
    const gl2 = canvas.getContext('webgl2');
    webgl2 = gl2 !== null;
  } catch (e) {
    webgl2 = false;
  }

  return { webgl1, webgl2 };
}

/**
 * Detect WebAssembly features
 */
function detectWebAssemblyFeatures(): { simd: boolean; threads: boolean } {
  let simd = false;
  let threads = false;

  try {
    // Check for SIMD support
    simd = WebAssembly.validate(new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11
    ]));
  } catch (e) {
    simd = false;
  }

  // Check for thread support (requires SharedArrayBuffer)
  threads = typeof SharedArrayBuffer !== 'undefined';

  return { simd, threads };
}

/**
 * Detect network capabilities
 */
function detectNetworkCapabilities(): { type: string; downlink: number; rtt: number } {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return { type: 'unknown', downlink: 10, rtt: 50 };
  }

  const connection = (navigator as any).connection;
  return {
    type: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 10,
    rtt: connection.rtt || 50,
  };
}

/**
 * Detect storage capabilities
 */
async function detectStorageCapabilities(): Promise<{ indexedDB: boolean; quota: number }> {
  if (typeof indexedDB === 'undefined') {
    return { indexedDB: false, quota: 0 };
  }

  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return { indexedDB: true, quota: estimate.quota || 0 };
    }
  } catch (e) {
    // Ignore errors
  }

  return { indexedDB: true, quota: 50 * 1024 * 1024 * 1024 }; // Assume 50GB if can't detect
}

/**
 * Detect if device is mobile
 */
function detectMobile(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
}

/**
 * Detect touch capability
 */
function detectTouch(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'ontouchstart' in window || 
    (navigator && navigator.maxTouchPoints > 0);
}

/**
 * Calculate device tier score based on capabilities
 */
function calculateTierScore(capabilities: DeviceCapabilities): number {
  let score = 0;

  // GPU capabilities (max 35 points)
  if (capabilities.webgpu) {
    score += 20;
    score += Math.min(capabilities.webgpuFeatures.length * 2, 15);
  } else if (capabilities.webgl2) {
    score += 10;
  } else if (capabilities.webgl1) {
    score += 5;
  }

  // CPU capabilities (max 20 points)
  score += Math.min(capabilities.cpuCores * 3, 15);
  if (capabilities.hasWebAssemblySIMD) score += 5;

  // Memory (max 25 points)
  if (capabilities.deviceMemory >= 16) score += 25;
  else if (capabilities.deviceMemory >= 8) score += 20;
  else if (capabilities.deviceMemory >= 4) score += 15;
  else if (capabilities.deviceMemory >= 2) score += 10;
  else score += 5;

  // Network (max 10 points)
  if (capabilities.downlinkSpeed >= 50) score += 10;
  else if (capabilities.downlinkSpeed >= 20) score += 7;
  else if (capabilities.downlinkSpeed >= 10) score += 5;
  else if (capabilities.downlinkSpeed >= 5) score += 3;

  // Storage (max 10 points)
  if (capabilities.indexedDB) score += 5;
  if (capabilities.storageQuota >= 100 * 1024 * 1024 * 1024) score += 5;
  else if (capabilities.storageQuota >= 50 * 1024 * 1024 * 1024) score += 3;

  return Math.min(score, 100);
}

/**
 * Determine device tier from score and capabilities
 */
function determineTier(score: number, capabilities: DeviceCapabilities): DeviceTier {
  // Check for mesh offload capability (Tier 4)
  // Requires good network and available peers, but can work on low-end devices
  if (capabilities.downlinkSpeed >= 10 && capabilities.rtt <= 100) {
    // Could potentially use mesh - but only assign if device is low-end
    if (score <= 30) {
      return 'tier4';
    }
  }

  // Standard tier assignment based on score
  if (score >= TIER_THRESHOLDS.tier3.minScore) {
    return 'tier3';
  } else if (score >= TIER_THRESHOLDS.tier2.minScore) {
    return 'tier2';
  } else {
    return 'tier1';
  }
}

/**
 * Get recommended strategy for tier
 */
function getRecommendedStrategy(tier: DeviceTier): string {
  switch (tier) {
    case 'tier1':
      return 'interpreter-only';
    case 'tier2':
      return 'selective-jit';
    case 'tier3':
      return 'full-jit-webgpu';
    case 'tier4':
      return 'mesh-offload';
    default:
      return 'interpreter-only';
  }
}

/**
 * Get feature flags for tier
 */
function getTierFeatures(tier: DeviceTier): TierInfo['features'] {
  switch (tier) {
    case 'tier1':
      return {
        jit: false,
        webgpu: false,
        aggressiveCaching: false,
        meshOffload: true, // Can offload to mesh
        backgroundPrefetch: false,
      };
    case 'tier2':
      return {
        jit: true,
        webgpu: false,
        aggressiveCaching: true,
        meshOffload: true,
        backgroundPrefetch: true,
      };
    case 'tier3':
      return {
        jit: true,
        webgpu: true,
        aggressiveCaching: true,
        meshOffload: false, // Don't need to offload
        backgroundPrefetch: true,
      };
    case 'tier4':
      return {
        jit: false,
        webgpu: false,
        aggressiveCaching: false,
        meshOffload: true,
        backgroundPrefetch: false,
      };
    default:
      return {
        jit: false,
        webgpu: false,
        aggressiveCaching: false,
        meshOffload: false,
        backgroundPrefetch: false,
      };
  }
}

/**
 * Main capability detection function
 */
export async function detectCapabilities(): Promise<DeviceCapabilities> {
  const webgpu = await detectWebGPU();
  const webgl = detectWebGL();
  const wasmFeatures = detectWebAssemblyFeatures();
  const network = detectNetworkCapabilities();
  const storage = await detectStorageCapabilities();

  // Get device memory (Chrome/Edge only)
  const deviceMemory = (navigator as any).deviceMemory || 4;

  // Get JS heap size limit
  const jsHeapSizeLimit = (performance as any).memory?.jsHeapSizeLimit || 2 * 1024 * 1024 * 1024;

  // Get CPU cores
  const cpuCores = navigator.hardwareConcurrency || 2;

  // Screen info
  const screenResolution = typeof screen !== 'undefined' 
    ? { width: screen.width, height: screen.height }
    : { width: 1920, height: 1080 };
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  return {
    webgpu: webgpu.supported,
    webgpuFeatures: webgpu.features,
    webgl2: webgl.webgl2,
    webgl1: webgl.webgl1,
    
    cpuCores,
    hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    hasWebAssemblySIMD: wasmFeatures.simd,
    hasWebAssemblyThreads: wasmFeatures.threads,
    
    deviceMemory,
    jsHeapSizeLimit,
    
    connectionType: network.type,
    downlinkSpeed: network.downlink,
    rtt: network.rtt,
    
    indexedDB: storage.indexedDB,
    storageQuota: storage.quota,
    
    isMobile: detectMobile(),
    isTouchDevice: detectTouch(),
    screenResolution,
    devicePixelRatio,
  };
}

/**
 * Get complete tier information
 */
export async function getTierInfo(): Promise<TierInfo> {
  const capabilities = await detectCapabilities();
  const score = calculateTierScore(capabilities);
  const tier = determineTier(score, capabilities);
  const memoryBudget = capabilities.jsHeapSizeLimit * MEMORY_BUDGET_PERCENTAGES[tier];

  return {
    tier,
    score,
    capabilities,
    recommendedStrategy: getRecommendedStrategy(tier),
    memoryBudget,
    features: getTierFeatures(tier),
  };
}

/**
 * Quick capability check (cached)
 */
let cachedTierInfo: TierInfo | null = null;

export async function getTierInfoCached(): Promise<TierInfo> {
  if (cachedTierInfo) {
    return cachedTierInfo;
  }
  cachedTierInfo = await getTierInfo();
  return cachedTierInfo;
}

/**
 * Clear cached tier info (for re-detection)
 */
export function clearTierCache(): void {
  cachedTierInfo = null;
}

/**
 * Check if a specific feature is available
 */
export async function isFeatureAvailable(feature: keyof TierInfo['features']): Promise<boolean> {
  const tierInfo = await getTierInfoCached();
  return tierInfo.features[feature];
}

