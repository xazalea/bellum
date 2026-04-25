/**
 * React hooks for performance optimization
 * Provides easy-to-use hooks for device capability detection,
 * adaptive quality, and lazy loading
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  deviceDetector,
  lazyLoadEngine,
  perfMonitor,
  createQualityAdaptor,
  DeviceCapabilities,
  QualityLevel,
  PerformanceMetrics,
  PerformanceCallback,
  QUALITY_PRESETS,
} from './adaptive-engine';

// ============================================
// DEVICE CAPABILITIES HOOK
// ============================================

export function useDeviceCapabilities(): DeviceCapabilities & { isLoading: boolean } {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    cores: 4,
    memoryGB: 4,
    isLowEnd: false,
    gpuTier: 'medium',
    supportsWebGL2: true,
    supportsSharedArrayBuffer: false,
    effectiveType: '4g',
    downlinkMbps: 10,
    hasIndexedDB: true,
    storageQuotaGB: 0,
    supportsIntersectionObserver: true,
    supportsMutationObserver: true,
    supportsWebWorkers: true,
    supportsOffscreenCanvas: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    deviceDetector.detect().then(caps => {
      if (mounted) {
        setCapabilities(caps);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { ...capabilities, isLoading };
}

// ============================================
// ADAPTIVE QUALITY HOOK
// ============================================

export interface UseAdaptiveQualityReturn {
  quality: QualityLevel;
  fps: number;
  isPerformanceGood: boolean;
  downgrade: () => void;
  upgrade: () => void;
  setQualityLevel: (level: 'minimal' | 'low' | 'medium' | 'high' | 'ultra') => void;
}

export function useAdaptiveQuality(): UseAdaptiveQualityReturn {
  const capabilities = useDeviceCapabilities();
  const adaptorRef = useRef<ReturnType<typeof createQualityAdaptor> | null>(null);
  const [quality, setQuality] = useState<QualityLevel>(() => 
    deviceDetector.getRecommendedQuality(capabilities)
  );
  const [fps, setFps] = useState(60);
  const [isPerformanceGood, setIsPerformanceGood] = useState(true);

  useEffect(() => {
    if (capabilities.isLoading) return;

    const initialQuality = deviceDetector.getRecommendedQuality(capabilities);
    setQuality(initialQuality);

    adaptorRef.current = createQualityAdaptor(initialQuality, {
      monitor: perfMonitor,
      autoAdjust: true,
      onQualityChange: (newQuality) => {
        setQuality(newQuality);
      },
    });

    // Subscribe to FPS updates
    const unsubscribe = perfMonitor.subscribe((metrics) => {
      setFps(metrics.fps);
      setIsPerformanceGood(metrics.fps >= 50);
    });

    return () => {
      unsubscribe();
      if (adaptorRef.current) {
        // Cleanup adaptor if needed
      }
    };
  }, [capabilities.isLoading, capabilities.cores, capabilities.memoryGB]);

  const downgrade = useCallback(() => {
    adaptorRef.current?.downgrade();
  }, []);

  const upgrade = useCallback(() => {
    adaptorRef.current?.upgrade();
  }, []);

  const setQualityLevel = useCallback((level: 'minimal' | 'low' | 'medium' | 'high' | 'ultra') => {
    adaptorRef.current?.setQuality(QUALITY_PRESETS[level]);
  }, []);

  return { quality, fps, isPerformanceGood, downgrade, upgrade, setQualityLevel };
}

// ============================================
// PERFORMANCE MONITOR HOOK
// ============================================

export function usePerformanceMonitor(callback?: PerformanceCallback) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryMB: 0,
    frameTime: 16.67,
    droppedFrames: 0,
    totalFrames: 0,
    lastUpdate: Date.now(),
  });

  useEffect(() => {
    const unsubscribe = perfMonitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);
      callback?.(newMetrics);
    });

    return unsubscribe;
  }, [callback]);

  return metrics;
}

// ============================================
// LAZY LOADING HOOK
// ============================================

export interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useLazyLoad<T extends Element>(
  options: UseLazyLoadOptions = {}
): [React.RefObject<T | null>, boolean, () => void] {
  const { threshold = 0.1, rootMargin = '200px', triggerOnce = true } = options;
  const elementRef = useRef<T | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || (triggerOnce && hasTriggered)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          setHasTriggered(true);
          
          if (triggerOnce) {
            observer.disconnect();
          }
        } else {
          setIsIntersecting(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  const reset = useCallback(() => {
    setIsIntersecting(false);
    setHasTriggered(false);
  }, []);

  return [elementRef, isIntersecting, reset];
}

// ============================================
// IMAGE LAZY LOAD HOOK
// ============================================

export function useImageLazyLoad(src?: string, options: UseLazyLoadOptions = {}) {
  const [elementRef, isVisible] = useLazyLoad<HTMLImageElement>(options);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isVisible && src && !loaded) {
      // Image will load via src assignment when visible
      setLoaded(true);
    }
  }, [isVisible, src, loaded]);

  return { elementRef, isVisible, loaded, shouldLoad: isVisible };
}

// ============================================
// THROTTLED CALLBACK HOOK
// ============================================

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0);
  const lastArgs = useRef<Parameters<T> | null>(null);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs.current = args;

    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(...args);
    } else if (!timeoutId.current) {
      timeoutId.current = setTimeout(() => {
        lastCall.current = Date.now();
        if (lastArgs.current) {
          callback(...lastArgs.current);
        }
        timeoutId.current = null;
      }, delay - (now - lastCall.current));
    }
  }, [callback, delay]) as T;
}

// ============================================
// DEBOUNCED VALUE HOOK
// ============================================

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================
// WINDOW RESIZE THROTTLED HOOK
// ============================================

export function useThrottledWindowSize(throttleMs = 100) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    // Set initial size
    handleResize();

    // Throttled handler
    let ticking = false;
    const throttledHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleResize();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('resize', throttledHandler);

    return () => {
      window.removeEventListener('resize', throttledHandler);
    };
  }, [throttleMs]);

  return size;
}

// ============================================
// MEDIA QUERY HOOK
// ============================================

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// ============================================
// PREFERS REDUCED MOTION HOOK
// ============================================

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

// ============================================
// FPS COUNTER HOOK
// ============================================

export function useFPSCounter(): { fps: number; isGood: boolean } {
  const metrics = usePerformanceMonitor();
  return {
    fps: metrics.fps,
    isGood: metrics.fps >= 50,
  };
}

// ============================================
// VISIBILITY CHANGE HOOK
// ============================================

export function useVisibilityChange(): 'visible' | 'hidden' {
  const [visibility, setVisibility] = useState<'visible' | 'hidden'>(
    typeof document !== 'undefined' ? document.visibilityState : 'visible'
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handleVisibilityChange = () => {
      setVisibility(document.visibilityState);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return visibility;
}