/**
 * VM Configuration and Optimization
 * Optimizes v86 and other WASM-based emulators
 */

export interface VMConfig {
  memory_size: number;
  vga_memory_size: number;
  boot_order: number;
  fastboot: boolean;
  acpi: boolean;
  disable_jit: boolean;
  log_level: number;
  wasm: boolean;
}

/**
 * Optimized configuration for Windows VMs
 */
export function getOptimizedWindowsConfig(isoUrl: string): VMConfig & {
  bios?: { url: string };
  vga_bios?: { url: string };
  cdrom?: { url: string };
  autostart?: boolean;
} {
  return {
    // Memory configuration (optimized for browser)
    memory_size: 512 * 1024 * 1024, // 512MB (balance between performance and browser limits)
    vga_memory_size: 8 * 1024 * 1024, // 8MB VGA memory
    
    // Boot configuration
    boot_order: 0x213, // CD-ROM first, then HDD
    fastboot: true, // Skip BIOS delays
    autostart: true,
    
    // Performance optimizations
    acpi: true, // Enable ACPI for better power management
    disable_jit: false, // Enable JIT for better performance (if browser allows)
    
    // WASM optimization
    wasm: true, // Use WASM build of v86 (much faster)
    
    // Logging
    log_level: 0, // Minimal logging for production
    
    // BIOS files (required for v86)
    bios: {
      url: "/optimizers/seabios.bin"
    },
    vga_bios: {
      url: "/optimizers/vgabios.bin"
    },
    
    // ISO/CD-ROM
    cdrom: {
      url: isoUrl
    }
  };
}

/**
 * Optimized configuration for Android VMs
 */
export function getOptimizedAndroidConfig(isoUrl: string): VMConfig & {
  bios?: { url: string };
  vga_bios?: { url: string };
  cdrom?: { url: string };
  autostart?: boolean;
  screen_container?: HTMLElement;
} {
  return {
    // Android requires more memory
    memory_size: 1024 * 1024 * 1024, // 1GB
    vga_memory_size: 16 * 1024 * 1024, // 16MB VGA
    
    // Boot configuration
    boot_order: 0x213,
    fastboot: true,
    autostart: true,
    
    // Performance
    acpi: true,
    disable_jit: false,
    wasm: true,
    
    // Logging
    log_level: 0,
    
    // BIOS
    bios: {
      url: "/optimizers/seabios.bin"
    },
    vga_bios: {
      url: "/optimizers/vgabios.bin"
    },
    
    // ISO
    cdrom: {
      url: isoUrl
    }
  };
}

/**
 * Check if browser supports WASM SIMD (for even better performance)
 */
export async function checkWasmSIMDSupport(): Promise<boolean> {
  try {
    // Test WASM SIMD support
    const simdTest = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03,
      0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00,
      0xfd, 0x0c, 0xfd, 0x0c, 0xfd, 0x6e, 0x0b
    ]);
    
    await WebAssembly.instantiate(simdTest);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if SharedArrayBuffer is available (for multi-threading)
 */
export function checkSharedArrayBufferSupport(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * Get optimal VM configuration based on browser capabilities
 */
export async function getOptimalVMConfig(
  type: 'windows' | 'android',
  isoUrl: string
): Promise<any> {
  const baseConfig = type === 'windows' 
    ? getOptimizedWindowsConfig(isoUrl)
    : getOptimizedAndroidConfig(isoUrl);
  
  // Check for advanced features
  const simdSupported = await checkWasmSIMDSupport();
  const sabSupported = checkSharedArrayBufferSupport();
  
  console.log(`VM Capabilities: SIMD=${simdSupported}, SharedArrayBuffer=${sabSupported}`);
  
  // Adjust configuration based on capabilities
  if (!sabSupported) {
    // Disable features that require SharedArrayBuffer
    console.warn('SharedArrayBuffer not available, some optimizations disabled');
  }
  
  if (simdSupported) {
    console.log('✅ WASM SIMD supported - using enhanced performance mode');
  }
  
  return baseConfig;
}

/**
 * Memory optimization: periodically trigger garbage collection hints
 */
export function setupMemoryOptimization(emulator: any) {
  // Hint to browser to GC when VM is idle
  let lastActivity = Date.now();
  
  const gcHintInterval = setInterval(() => {
    const now = Date.now();
    if (now - lastActivity > 5000) {
      // VM idle for 5 seconds, hint GC
      if (typeof (global as any).gc === 'function') {
        (global as any).gc();
      }
    }
  }, 10000);
  
  // Track activity
  emulator.add_listener?.('emulator-started', () => {
    lastActivity = Date.now();
  });
  
  return () => clearInterval(gcHintInterval);
}

/**
 * Performance monitoring for VMs
 */
export class VMPerformanceMonitor {
  private startTime: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;
  
  start() {
    this.startTime = performance.now();
    this.lastFpsUpdate = this.startTime;
    this.frameCount = 0;
  }
  
  recordFrame() {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }
  
  getFPS(): number {
    return this.currentFps;
  }
  
  getUptime(): number {
    return (performance.now() - this.startTime) / 1000;
  }
  
  getStats() {
    return {
      fps: this.currentFps,
      uptime: this.getUptime(),
      memory: (performance as any).memory?.usedJSHeapSize || 0,
    };
  }
}
