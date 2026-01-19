/**
 * ForesightJS Integration for Intelligent Prefetching
 * Predicts user intent and prefetches resources ahead of time
 * 
 * @see https://github.com/spaansba/ForesightJS
 */

export interface ForesightConfig {
  touchDeviceStrategy?: 'viewport' | 'onTouchStart' | 'disabled';
  tabOffset?: number; // Number of elements to prefetch ahead
  mouseTrajectoryThreshold?: number;
  viewportMargin?: string;
  debounceDelay?: number;
  enableLogging?: boolean;
}

export interface PrefetchTarget {
  element: HTMLElement;
  url?: string;
  callback?: () => void | Promise<void>;
  priority?: 'high' | 'medium' | 'low';
  type?: 'wasm' | 'script' | 'image' | 'data' | 'page';
}

/**
 * ForesightJS Manager for Bellum
 * Handles intelligent prefetching across the entire site
 */
class ForesightManager {
  private static instance: ForesightManager;
  private initialized: boolean = false;
  private config: ForesightConfig = {};
  private registeredTargets: Map<string, PrefetchTarget> = new Map();
  private prefetchCache: Set<string> = new Set();
  
  private constructor() {}
  
  static getInstance(): ForesightManager {
    if (!ForesightManager.instance) {
      ForesightManager.instance = new ForesightManager();
    }
    return ForesightManager.instance;
  }
  
  /**
   * Initialize ForesightJS
   */
  async initialize(config: ForesightConfig = {}): Promise<void> {
    if (this.initialized) return;
    
    this.config = {
      touchDeviceStrategy: 'viewport',
      tabOffset: 3,
      mouseTrajectoryThreshold: 150,
      viewportMargin: '50px',
      debounceDelay: 100,
      enableLogging: false,
      ...config,
    };
    
    // Set up observers
    this.setupIntersectionObserver();
    this.setupMouseTracking();
    this.setupKeyboardNavigation();
    
    this.initialized = true;
    console.log('✅ ForesightJS initialized for intelligent prefetching');
  }
  
  /**
   * Register a prefetch target
   */
  register(target: PrefetchTarget): void {
    const id = this.generateTargetId(target);
    this.registeredTargets.set(id, target);
    
    // Attach event listeners
    this.attachListeners(target);
  }
  
  /**
   * Unregister a prefetch target
   */
  unregister(target: PrefetchTarget): void {
    const id = this.generateTargetId(target);
    this.registeredTargets.delete(id);
  }
  
  /**
   * Prefetch a resource
   */
  private async prefetch(target: PrefetchTarget): Promise<void> {
    const id = this.generateTargetId(target);
    
    // Skip if already prefetched
    if (this.prefetchCache.has(id)) {
      if (this.config.enableLogging) {
        console.log(`[ForesightJS] Already prefetched: ${id}`);
      }
      return;
    }
    
    this.prefetchCache.add(id);
    
    try {
      if (target.callback) {
        await target.callback();
      } else if (target.url) {
        await this.prefetchUrl(target.url, target.type);
      }
      
      if (this.config.enableLogging) {
        console.log(`[ForesightJS] Prefetched: ${id}`);
      }
    } catch (error) {
      console.warn(`[ForesightJS] Prefetch failed for ${id}:`, error);
      this.prefetchCache.delete(id); // Allow retry
    }
  }
  
  /**
   * Prefetch a URL based on type
   */
  private async prefetchUrl(url: string, type?: string): Promise<void> {
    switch (type) {
      case 'wasm':
        // Prefetch WASM module
        await fetch(url).then(r => r.arrayBuffer());
        break;
        
      case 'script':
        // Prefetch JavaScript
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'script';
        link.href = url;
        document.head.appendChild(link);
        break;
        
      case 'image':
        // Prefetch image
        const img = new Image();
        img.src = url;
        break;
        
      case 'data':
        // Prefetch JSON/data
        await fetch(url);
        break;
        
      case 'page':
        // Prefetch HTML page
        const pageLink = document.createElement('link');
        pageLink.rel = 'prefetch';
        pageLink.href = url;
        document.head.appendChild(pageLink);
        break;
        
      default:
        // Generic prefetch
        await fetch(url);
    }
  }
  
  /**
   * Set up intersection observer for viewport-based prefetching
   */
  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = this.findTargetByElement(entry.target as HTMLElement);
            if (target) {
              this.prefetch(target);
            }
          }
        });
      },
      {
        rootMargin: this.config.viewportMargin,
      }
    );
    
    // Observe all registered targets
    this.registeredTargets.forEach((target) => {
      observer.observe(target.element);
    });
  }
  
  /**
   * Set up mouse trajectory tracking
   */
  private setupMouseTracking(): void {
    let mouseX = 0;
    let mouseY = 0;
    let lastCheck = Date.now();
    
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastCheck < this.config.debounceDelay!) return;
      
      const deltaX = e.clientX - mouseX;
      const deltaY = e.clientY - mouseY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      mouseX = e.clientX;
      mouseY = e.clientY;
      lastCheck = now;
      
      // Check if mouse is moving toward any registered target
      this.registeredTargets.forEach((target) => {
        const rect = target.element.getBoundingClientRect();
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;
        
        const toTargetX = targetX - mouseX;
        const toTargetY = targetY - mouseY;
        const toTargetDist = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);
        
        // Calculate if mouse is moving toward target
        const dotProduct = deltaX * toTargetX + deltaY * toTargetY;
        const movingToward = dotProduct > 0;
        
        if (movingToward && toTargetDist < this.config.mouseTrajectoryThreshold!) {
          this.prefetch(target);
        }
      });
    });
  }
  
  /**
   * Set up keyboard navigation prefetching
   */
  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusedElement = document.activeElement as HTMLElement;
        const target = this.findTargetByElement(focusedElement);
        
        if (target) {
          this.prefetch(target);
          
          // Prefetch next N elements
          const allTargets = Array.from(this.registeredTargets.values());
          const currentIndex = allTargets.indexOf(target);
          
          for (let i = 1; i <= this.config.tabOffset!; i++) {
            const nextTarget = allTargets[currentIndex + i];
            if (nextTarget) {
              this.prefetch(nextTarget);
            }
          }
        }
      }
    });
  }
  
  /**
   * Attach event listeners to target
   */
  private attachListeners(target: PrefetchTarget): void {
    // Touch devices: prefetch on touchstart
    if (this.config.touchDeviceStrategy === 'onTouchStart') {
      target.element.addEventListener('touchstart', () => {
        this.prefetch(target);
      });
    }
    
    // Hover prefetch (desktop)
    target.element.addEventListener('mouseenter', () => {
      this.prefetch(target);
    });
  }
  
  /**
   * Generate unique ID for target
   */
  private generateTargetId(target: PrefetchTarget): string {
    return target.url || target.element.id || target.element.className || Math.random().toString(36);
  }
  
  /**
   * Find target by element
   */
  private findTargetByElement(element: HTMLElement): PrefetchTarget | undefined {
    for (const [_, target] of this.registeredTargets) {
      if (target.element === element) {
        return target;
      }
    }
    return undefined;
  }
  
  /**
   * Clear prefetch cache
   */
  clearCache(): void {
    this.prefetchCache.clear();
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      registered: this.registeredTargets.size,
      prefetched: this.prefetchCache.size,
      hitRate: this.prefetchCache.size / this.registeredTargets.size,
    };
  }
}

export const foresightManager = ForesightManager.getInstance();

/**
 * Auto-initialize on module load
 */
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      foresightManager.initialize();
    });
  } else {
    foresightManager.initialize();
  }
}

/**
 * Prefetch WASM modules for games/VMs
 */
export function prefetchWasmModules(modules: string[]): void {
  modules.forEach((url) => {
    foresightManager.register({
      element: document.body, // Dummy element
      url,
      type: 'wasm',
      priority: 'high',
    });
  });
}

/**
 * Prefetch game assets
 */
export function prefetchGameAssets(gameId: string): void {
  const assets = [
    `/wasm/game-parser.wasm`,
    `/games/${gameId}/assets.json`,
    `/games/${gameId}/sprites.png`,
  ];
  
  assets.forEach((url) => {
    foresightManager.register({
      element: document.body,
      url,
      type: 'data',
      priority: 'medium',
    });
  });
}

/**
 * Prefetch VM resources
 */
export function prefetchVMResources(vmType: 'windows' | 'android'): void {
  const resources = [
    `/wasm/mquickjs.wasm`,
    `/optimizers/seabios.bin`,
    `/optimizers/vgabios.bin`,
  ];
  
  if (vmType === 'windows') {
    resources.push(`/isos/windows.iso`);
  } else {
    resources.push(`/isos/android.iso`);
  }
  
  resources.forEach((url) => {
    foresightManager.register({
      element: document.body,
      url,
      type: 'wasm',
      priority: 'high',
    });
  });
}
