'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface OfflineIndicatorProps {
  className?: string;
}

interface NetworkStatus {
  online: boolean;
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
}

export function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const [status, setStatus] = useState<NetworkStatus>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, online: true }));
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, online: false }));
    };

    // Get connection info if available
    const updateConnectionInfo = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setStatus(prev => ({
          ...prev,
          downlink: connection.downlink,
          effectiveType: connection.effectiveType,
          saveData: connection.saveData,
        }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateConnectionInfo();

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  if (status.online && !showReconnected) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex justify-center p-2 ${className}`}
    >
      <div
        className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 ${
          status.online
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}
      >
        {status.online ? (
          <>
            <span className="animate-pulse">✓</span>
            <span>Back online!</span>
          </>
        ) : (
          <>
            <span className="animate-pulse">⚠️</span>
            <span>You're offline. Some features may be limited.</span>
          </>
        )}
      </div>
    </div>
  );
}

// Compact status badge
export function OfflineStatusBadge({ className = '' }: { className?: string }) {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
        online
          ? 'bg-green-600/20 text-green-400'
          : 'bg-red-600/20 text-red-400'
      } ${className}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          online ? 'bg-green-400' : 'bg-red-400 animate-pulse'
        }`}
      />
      <span>{online ? 'Online' : 'Offline'}</span>
    </div>
  );
}

// Offline notification panel
export function OfflineNotificationPanel({ className = '' }: OfflineIndicatorProps) {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setDismissed(false);
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online || dismissed) {
    return null;
  }

  return (
    <div className={`bg-yellow-900/90 border-b border-yellow-700 p-4 ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📡</span>
          <div>
            <div className="font-medium text-yellow-100">You're offline</div>
            <div className="text-sm text-yellow-200/70">
              Some features may be limited. Your changes will sync when you're back online.
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-200 hover:text-yellow-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Feature limitation handler
export function OfflineFeatureGate({
  children,
  fallback,
  featureName,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  featureName: string;
}) {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 text-center">
      <div className="text-4xl mb-3">🔌</div>
      <div className="text-lg font-medium text-gray-300 mb-2">
        {featureName} requires internet
      </div>
      <div className="text-sm text-gray-500">
        This feature will be available when you're back online.
      </div>
    </div>
  );
}

// Storage quota manager for offline content
export function StorageQuotaDisplay({ className = '' }: { className?: string }) {
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    const checkQuota = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setQuota({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      }
    };

    checkQuota();
    const interval = setInterval(checkQuota, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!quota) {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const percentUsed = quota.quota > 0 ? (quota.usage / quota.quota) * 100 : 0;

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-400">Offline Storage</span>
        <span className="text-xs text-gray-500">
          {formatBytes(quota.usage)} / {formatBytes(quota.quota)}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            percentUsed > 90
              ? 'bg-red-500'
              : percentUsed > 70
              ? 'bg-yellow-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
      {percentUsed > 80 && (
        <div className="mt-2 text-xs text-yellow-400">
          Storage is nearly full. Some offline content may not be saved.
        </div>
      )}
    </div>
  );
}

// Sync conflict resolution UI
export function SyncConflictResolver({
  conflicts,
  onResolve,
  className = '',
}: {
  conflicts: Array<{
    id: string;
    type: string;
    local: any;
    remote: any;
    timestamp: number;
  }>;
  onResolve: (id: string, resolution: 'local' | 'remote' | 'merge') => void;
  className?: string;
}) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className={`bg-orange-900/50 border border-orange-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚠️</span>
        <span className="font-medium text-orange-100">
          {conflicts.length} sync conflict{conflicts.length > 1 ? 's' : ''} detected
        </span>
      </div>
      <div className="space-y-3">
        {conflicts.map((conflict) => (
          <div key={conflict.id} className="bg-gray-800 rounded p-3">
            <div className="text-sm text-gray-300 mb-2">
              {conflict.type} - {new Date(conflict.timestamp).toLocaleString()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onResolve(conflict.id, 'local')}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
              >
                Keep Local
              </button>
              <button
                onClick={() => onResolve(conflict.id, 'remote')}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
              >
                Keep Remote
              </button>
              <button
                onClick={() => onResolve(conflict.id, 'merge')}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
              >
                Merge
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OfflineIndicator;