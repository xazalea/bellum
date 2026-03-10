'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { assetPrioritizer, LoadingProgress, AssetPriority } from '@/lib/loading/asset-prioritizer';

interface LoadingProgressIndicatorProps {
  onComplete?: () => void;
  showDetails?: boolean;
  className?: string;
}

const phaseLabels: Record<AssetPriority | 'complete', string> = {
  critical: 'Loading essential assets...',
  interactive: 'Loading core content...',
  enhancement: 'Enhancing experience...',
  complete: 'Ready!',
};

const phaseColors: Record<AssetPriority | 'complete', string> = {
  critical: 'bg-red-500',
  interactive: 'bg-yellow-500',
  enhancement: 'bg-blue-500',
  complete: 'bg-green-500',
};

export function LoadingProgressIndicator({
  onComplete,
  showDetails = false,
  className = '',
}: LoadingProgressIndicatorProps) {
  const [progress, setProgress] = useState<LoadingProgress>({
    phase: 'critical',
    loadedAssets: 0,
    totalAssets: 0,
    loadedBytes: 0,
    totalBytes: 0,
    estimatedTimeRemaining: 0,
    bytesPerSecond: 0,
  });

  useEffect(() => {
    const unsubscribe = assetPrioritizer.onProgress((newProgress) => {
      setProgress(newProgress);
      if (newProgress.phase === 'complete' && onComplete) {
        onComplete();
      }
    });

    // Get initial progress
    setProgress(assetPrioritizer.getProgress());

    return unsubscribe;
  }, [onComplete]);

  const percentComplete = progress.totalBytes > 0
    ? Math.round((progress.loadedBytes / progress.totalBytes) * 100)
    : 0;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatTime = (ms: number): string => {
    if (ms <= 0) return '';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s remaining`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s remaining`;
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Main progress bar */}
      <div className="relative w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-300 ease-out ${phaseColors[progress.phase]}`}
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      {/* Status text */}
      <div className="flex justify-between items-center mt-2 text-sm">
        <span className="text-gray-400">
          {phaseLabels[progress.phase]}
        </span>
        <span className="text-gray-500">
          {percentComplete}%
        </span>
      </div>

      {/* Detailed breakdown */}
      {showDetails && (
        <div className="mt-4 space-y-2 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Assets</span>
            <span>{progress.loadedAssets} / {progress.totalAssets}</span>
          </div>
          <div className="flex justify-between">
            <span>Data transferred</span>
            <span>{formatBytes(progress.loadedBytes)} / {formatBytes(progress.totalBytes)}</span>
          </div>
          {progress.bytesPerSecond > 0 && (
            <div className="flex justify-between">
              <span>Speed</span>
              <span>{formatBytes(progress.bytesPerSecond)}/s</span>
            </div>
          )}
          {progress.estimatedTimeRemaining > 0 && progress.phase !== 'complete' && (
            <div className="flex justify-between">
              <span>Time remaining</span>
              <span>{formatTime(progress.estimatedTimeRemaining)}</span>
            </div>
          )}
          {progress.currentAsset && (
            <div className="flex justify-between truncate">
              <span>Loading</span>
              <span className="truncate max-w-[200px]">{progress.currentAsset}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact inline version
export function LoadingProgressInline({ className = '' }: { className?: string }) {
  const [progress, setProgress] = useState<LoadingProgress>({
    phase: 'critical',
    loadedAssets: 0,
    totalAssets: 0,
    loadedBytes: 0,
    totalBytes: 0,
    estimatedTimeRemaining: 0,
    bytesPerSecond: 0,
  });

  useEffect(() => {
    const unsubscribe = assetPrioritizer.onProgress(setProgress);
    setProgress(assetPrioritizer.getProgress());
    return unsubscribe;
  }, []);

  const percentComplete = progress.totalBytes > 0
    ? Math.round((progress.loadedBytes / progress.totalBytes) * 100)
    : 0;

  if (progress.phase === 'complete') {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${phaseColors[progress.phase]}`}
          style={{ width: `${percentComplete}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{percentComplete}%</span>
    </div>
  );
}

// Circular progress variant
export function LoadingProgressCircle({
  size = 40,
  strokeWidth = 4,
  className = '',
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const [progress, setProgress] = useState<LoadingProgress>({
    phase: 'critical',
    loadedAssets: 0,
    totalAssets: 0,
    loadedBytes: 0,
    totalBytes: 0,
    estimatedTimeRemaining: 0,
    bytesPerSecond: 0,
  });

  useEffect(() => {
    const unsubscribe = assetPrioritizer.onProgress(setProgress);
    setProgress(assetPrioritizer.getProgress());
    return unsubscribe;
  }, []);

  const percentComplete = progress.totalBytes > 0
    ? (progress.loadedBytes / progress.totalBytes) * 100
    : 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentComplete / 100) * circumference;

  const colorMap: Record<AssetPriority | 'complete', string> = {
    critical: '#ef4444',
    interactive: '#eab308',
    enhancement: '#3b82f6',
    complete: '#22c55e',
  };

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1f2937"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorMap[progress.phase]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-gray-300">
          {Math.round(percentComplete)}%
        </span>
      </div>
    </div>
  );
}

export default LoadingProgressIndicator;