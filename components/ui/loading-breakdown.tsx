'use client';

import React, { useState, useEffect } from 'react';
import { assetPrioritizer, LoadingProgress, Asset, AssetPriority, AssetType } from '@/lib/loading/asset-prioritizer';

interface LoadingBreakdownProps {
  className?: string;
  onClose?: () => void;
}

const priorityColors: Record<AssetPriority | 'complete', string> = {
  critical: 'bg-red-500',
  interactive: 'bg-yellow-500',
  enhancement: 'bg-blue-500',
  complete: 'bg-green-500',
};

const priorityLabels: Record<AssetPriority, string> = {
  critical: 'Critical',
  interactive: 'Interactive',
  enhancement: 'Enhancement',
};

const typeIcons: Record<AssetType, string> = {
  manifest: '📋',
  code: '💻',
  data: '📊',
  texture: '🖼️',
  audio: '🔊',
  video: '🎬',
  model: '🎲',
};

const typeLabels: Record<AssetType, string> = {
  manifest: 'Manifest',
  code: 'Code',
  data: 'Data',
  texture: 'Texture',
  audio: 'Audio',
  video: 'Video',
  model: '3D Model',
};

export function LoadingBreakdown({ className = '', onClose }: LoadingBreakdownProps) {
  const [progress, setProgress] = useState<LoadingProgress>({
    phase: 'critical',
    loadedAssets: 0,
    totalAssets: 0,
    loadedBytes: 0,
    totalBytes: 0,
    estimatedTimeRemaining: 0,
    bytesPerSecond: 0,
  });

  const [assets, setAssets] = useState<Asset[]>([]);
  const [expandedPriority, setExpandedPriority] = useState<AssetPriority | null>('critical');

  useEffect(() => {
    const unsubscribe = assetPrioritizer.onProgress(setProgress);
    setProgress(assetPrioritizer.getProgress());
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = assetPrioritizer.onAssetLoaded(() => {
      // Refresh assets list
      const allAssets = Array.from({ length: 100 }, (_, i) => 
        assetPrioritizer.getAsset(`asset-${i}`)
      ).filter((a): a is Asset => !!a);
      setAssets(allAssets);
    });
    return unsubscribe;
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatTime = (ms: number): string => {
    if (ms <= 0) return '--';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getAssetsByPriority = (priority: AssetPriority) => {
    return assets.filter(a => a.priority === priority);
  };

  const getPriorityStats = (priority: AssetPriority) => {
    const priorityAssets = getAssetsByPriority(priority);
    const loaded = priorityAssets.filter(a => a.loaded).length;
    const total = priorityAssets.length;
    const loadedBytes = priorityAssets
      .filter(a => a.loaded)
      .reduce((sum, a) => sum + a.size, 0);
    const totalBytes = priorityAssets.reduce((sum, a) => sum + a.size, 0);
    return { loaded, total, loadedBytes, totalBytes };
  };

  const getAssetsByType = (type: AssetType) => {
    return assets.filter(a => a.type === type);
  };

  const getTypeStats = (type: AssetType) => {
    const typeAssets = getAssetsByType(type);
    const loaded = typeAssets.filter(a => a.loaded).length;
    const total = typeAssets.length;
    const loadedBytes = typeAssets
      .filter(a => a.loaded)
      .reduce((sum, a) => sum + a.size, 0);
    const totalBytes = typeAssets.reduce((sum, a) => sum + a.size, 0);
    return { loaded, total, loadedBytes, totalBytes };
  };

  const priorities: AssetPriority[] = ['critical', 'interactive', 'enhancement'];
  const types: AssetType[] = ['manifest', 'code', 'data', 'texture', 'audio', 'video', 'model'];

  return (
    <div className={`bg-gray-900 rounded-lg p-4 text-white ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Loading Details</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Overall Progress</span>
          <span className="text-white font-medium">
            {progress.loadedAssets} / {progress.totalAssets} assets
          </span>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${priorityColors[progress.phase]}`}
            style={{
              width: `${progress.totalBytes > 0
                ? (progress.loadedBytes / progress.totalBytes) * 100
                : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Data Transferred</div>
          <div className="text-lg font-semibold">
            {formatBytes(progress.loadedBytes)}
            <span className="text-gray-500 text-sm"> / {formatBytes(progress.totalBytes)}</span>
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Transfer Speed</div>
          <div className="text-lg font-semibold">
            {formatBytes(progress.bytesPerSecond)}/s
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Time Remaining</div>
          <div className="text-lg font-semibold">
            {formatTime(progress.estimatedTimeRemaining)}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Current Phase</div>
          <div className="text-lg font-semibold capitalize">{progress.phase}</div>
        </div>
      </div>

      {/* By Priority */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-400 mb-3">By Priority</h4>
        <div className="space-y-2">
          {priorities.map((priority) => {
            const stats = getPriorityStats(priority);
            const percent = stats.total > 0 ? (stats.loaded / stats.total) * 100 : 0;
            const isExpanded = expandedPriority === priority;

            return (
              <div key={priority} className="bg-gray-800 rounded">
                <button
                  onClick={() => setExpandedPriority(isExpanded ? null : priority)}
                  className="w-full p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${priorityColors[priority]}`} />
                    <span className="font-medium">{priorityLabels[priority]}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">
                      {stats.loaded}/{stats.total}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatBytes(stats.loadedBytes)}/{formatBytes(stats.totalBytes)}
                    </span>
                    <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                </button>
                
                {/* Progress bar */}
                <div className="px-3 pb-2">
                  <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${priorityColors[priority]}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && stats.total > 0 && (
                  <div className="px-3 pb-3 text-sm">
                    <div className="text-gray-400">
                      {stats.loaded === stats.total ? (
                        <span className="text-green-400">✓ Complete</span>
                      ) : (
                        <span>{stats.total - stats.loaded} remaining</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* By Type */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-3">By Asset Type</h4>
        <div className="grid grid-cols-2 gap-2">
          {types.map((type) => {
            const stats = getTypeStats(type);
            if (stats.total === 0) return null;

            const percent = (stats.loaded / stats.total) * 100;

            return (
              <div key={type} className="bg-gray-800 rounded p-2">
                <div className="flex items-center gap-2 mb-1">
                  <span>{typeIcons[type]}</span>
                  <span className="text-sm">{typeLabels[type]}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{stats.loaded}/{stats.total}</span>
                  <span>{formatBytes(stats.loadedBytes)}</span>
                </div>
                <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Activity */}
      {progress.currentAsset && (
        <div className="mt-4 p-3 bg-gray-800 rounded">
          <div className="text-xs text-gray-400 mb-1">Currently Loading</div>
          <div className="text-sm truncate">{progress.currentAsset}</div>
        </div>
      )}
    </div>
  );
}

// Compact summary version
export function LoadingBreakdownSummary({ className = '' }: { className?: string }) {
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
    return unsubscribe;
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (progress.phase === 'complete') {
    return (
      <div className={`flex items-center gap-2 text-green-400 ${className}`}>
        <span>✓</span>
        <span className="text-sm">All assets loaded</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full animate-pulse ${priorityColors[progress.phase]}`} />
        <span className="text-sm capitalize">{progress.phase}</span>
      </div>
      <div className="text-sm text-gray-400">
        {progress.loadedAssets}/{progress.totalAssets} assets
      </div>
      <div className="text-sm text-gray-400">
        {formatBytes(progress.loadedBytes)}/{formatBytes(progress.totalBytes)}
      </div>
      {progress.bytesPerSecond > 0 && (
        <div className="text-sm text-gray-500">
          {formatBytes(progress.bytesPerSecond)}/s
        </div>
      )}
    </div>
  );
}

export default LoadingBreakdown;