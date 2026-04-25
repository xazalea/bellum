'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import {
  useDeviceCapabilities,
  useAdaptiveQuality,
  usePerformanceMonitor,
  useVisibilityChange,
} from '@/lib/performance/react-hooks';
import type { QualityLevel } from '@/lib/performance/adaptive-engine';

interface PerformanceContextType {
  // Device info
  isLowEnd: boolean;
  gpuTier: 'low' | 'medium' | 'high';
  cores: number;
  memoryGB: number;
  
  // Quality settings
  quality: QualityLevel;
  qualityLevel: string;
  
  // Performance metrics
  fps: number;
  memoryMB: number;
  isPerformanceGood: boolean;
  
  // Visibility
  isVisible: boolean;
  
  // Controls
  setQualityLevel: (level: 'minimal' | 'low' | 'medium' | 'high' | 'ultra') => void;
  downgrade: () => void;
  upgrade: () => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const capabilities = useDeviceCapabilities();
  const { quality, fps, isPerformanceGood, downgrade, upgrade, setQualityLevel } = useAdaptiveQuality();
  const metrics = usePerformanceMonitor();
  const visibility = useVisibilityChange();

  const value: PerformanceContextType = {
    isLowEnd: capabilities.isLowEnd,
    gpuTier: capabilities.gpuTier,
    cores: capabilities.cores,
    memoryGB: capabilities.memoryGB,
    quality,
    qualityLevel: quality.level,
    fps,
    memoryMB: metrics.memoryMB,
    isPerformanceGood,
    isVisible: visibility === 'visible',
    setQualityLevel,
    downgrade,
    upgrade,
  };

  // Apply quality settings to document root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Set CSS custom properties for quality-based styling
    root.style.setProperty('--animation-duration', quality.animations ? '350ms' : '0ms');
    root.style.setProperty('--particle-count', quality.particleCount.toString());
    root.style.setProperty('--image-quality', quality.imageQuality.toString());
    
    // Add/remove quality classes
    root.classList.remove('quality-minimal', 'quality-low', 'quality-medium', 'quality-high', 'quality-ultra');
    root.classList.add(`quality-${quality.level}`);
    
    // Low-end specific optimizations
    if (capabilities.isLowEnd) {
      root.classList.add('low-end-device');
    } else {
      root.classList.remove('low-end-device');
    }
  }, [quality, capabilities.isLowEnd]);

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance(): PerformanceContextType {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    // Return defaults if not in provider
    return {
      isLowEnd: false,
      gpuTier: 'medium',
      cores: 4,
      memoryGB: 4,
      quality: {
        level: 'medium',
        animations: true,
        shadows: true,
        blur: false,
        transitions: true,
        particleCount: 30,
        lazyLoadThreshold: 400,
        imageQuality: 0.75,
        frameRate: 60,
      },
      qualityLevel: 'medium',
      fps: 60,
      memoryMB: 0,
      isPerformanceGood: true,
      isVisible: true,
      setQualityLevel: () => {},
      downgrade: () => {},
      upgrade: () => {},
    };
  }
  return context;
}