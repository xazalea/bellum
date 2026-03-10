'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  cacheCoordinator, 
  CacheStats, 
  CacheEntry,
  cacheDelete 
} from '@/lib/cache/cache-coordinator';

interface CacheManagerProps {
  className?: string;
}

export function CacheManager({ className = '' }: CacheManagerProps) {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const refreshStats = useCallback(async () => {
    setLoading(true);
    try {
      const currentStats = cacheCoordinator.getStats();
      const l2Entries = await cacheCoordinator.getL2Entries();
      setStats(currentStats);
      setEntries(l2Entries);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    
    // Subscribe to cache events
    const unsubscribe = cacheCoordinator.subscribe((event) => {
      if (event === 'set' || event === 'delete' || event === 'clear') {
        refreshStats();
      }
    });

    return unsubscribe;
  }, [refreshStats]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all cached data?')) return;
    
    setClearing(true);
    try {
      await cacheCoordinator.clear();
      setSelectedKeys(new Set());
      await refreshStats();
    } finally {
      setClearing(false);
    }
  };

  const handleClearSelected = async () => {
    if (selectedKeys.size === 0) return;
    
    setClearing(true);
    try {
      for (const key of selectedKeys) {
        await cacheDelete(key);
      }
      setSelectedKeys(new Set());
      await refreshStats();
    } finally {
      setClearing(false);
    }
  };

  const handleClearExpired = async () => {
    setClearing(true);
    try {
      const count = await cacheCoordinator.invalidateExpired();
      alert(`Cleared ${count} expired entries`);
      await refreshStats();
    } finally {
      setClearing(false);
    }
  };

  const toggleKey = (key: string) => {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedKeys(newSelected);
  };

  const toggleAll = () => {
    if (selectedKeys.size === filteredEntries.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredEntries.map(e => e.key)));
    }
  };

  const filteredEntries = entries.filter(entry => 
    entry.key.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-800 rounded w-1/4" />
          <div className="h-20 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 text-white ${className}`}>
      <h2 className="text-xl font-semibold mb-6">Cache Management</h2>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">L1 Memory Cache</div>
          <div className="text-lg font-semibold">{formatBytes(stats?.l1Size || 0)}</div>
          <div className="text-xs text-gray-500">{stats?.l1Count || 0} items</div>
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500" 
              style={{ width: `${(stats?.l1HitRate || 0) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">Hit rate: {formatPercent(stats?.l1HitRate || 0)}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">L2 IndexedDB</div>
          <div className="text-lg font-semibold">{formatBytes(stats?.l2Size || 0)}</div>
          <div className="text-xs text-gray-500">{entries.length} items</div>
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500" 
              style={{ width: `${(stats?.l2HitRate || 0) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">Hit rate: {formatPercent(stats?.l2HitRate || 0)}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Total Hits</div>
          <div className="text-lg font-semibold">{stats?.totalHits || 0}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Total Misses</div>
          <div className="text-lg font-semibold">{stats?.totalMisses || 0}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleClearExpired}
          disabled={clearing}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
        >
          Clear Expired
        </button>
        <button
          onClick={handleClearSelected}
          disabled={clearing || selectedKeys.size === 0}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
        >
          Clear Selected ({selectedKeys.size})
        </button>
        <button
          onClick={handleClearAll}
          disabled={clearing}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
        >
          Clear All Cache
        </button>
        <button
          onClick={refreshStats}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter cache entries..."
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Entries Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedKeys.size === filteredEntries.length && filteredEntries.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-gray-300">Key</th>
                <th className="px-4 py-3 text-left text-gray-300">Size</th>
                <th className="px-4 py-3 text-left text-gray-300">Created</th>
                <th className="px-4 py-3 text-left text-gray-300">Accessed</th>
                <th className="px-4 py-3 text-left text-gray-300">Hits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No cache entries found
                  </td>
                </tr>
              ) : (
                filteredEntries.slice(0, 100).map((entry) => (
                  <tr key={entry.key} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(entry.key)}
                        onChange={() => toggleKey(entry.key)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-[200px]" title={entry.key}>
                      {entry.key}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatBytes(entry.size)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {formatDate(entry.lastAccessedAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {entry.accessCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredEntries.length > 100 && (
          <div className="px-4 py-3 bg-gray-700 text-xs text-gray-400">
            Showing 100 of {filteredEntries.length} entries
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for settings
export function CacheManagerCompact({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    setStats(cacheCoordinator.getStats());
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleClearCache = async () => {
    if (confirm('Clear all cached data?')) {
      await cacheCoordinator.clear();
      setStats(cacheCoordinator.getStats());
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-medium">Cache</div>
          <div className="text-xs text-gray-400">
            {formatBytes((stats?.l1Size || 0) + (stats?.l2Size || 0))} used
          </div>
        </div>
        <button
          onClick={handleClearCache}
          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs transition-colors"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
}

export default CacheManager;