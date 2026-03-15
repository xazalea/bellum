"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, Clock } from "lucide-react";
import { isCloudStorageAvailable, getStorageQuota } from "@/lib/storage/cloud-save-manager";
import { getPendingSyncConflicts } from "@/lib/storage/conflict-resolution";

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error' | 'conflict';

interface SyncStatusIndicatorProps {
  showDetails?: boolean;
  onOpenSettings?: () => void;
}

export function SyncStatusIndicator({ showDetails = false, onOpenSettings }: SyncStatusIndicatorProps) {
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      // Check if online
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }

      // Check cloud storage availability
      const available = await isCloudStorageAvailable();
      if (!available) {
        setStatus('error');
        setErrorMessage('Cloud storage unavailable');
        return;
      }

      // Check for pending conflicts
      const conflicts = await getPendingSyncConflicts();
      if (conflicts.size > 0) {
        setStatus('conflict');
        setPendingCount(conflicts.size);
        return;
      }

      // Check last sync time
      const lastSyncStr = localStorage.getItem('challenger_last_sync_timestamps');
      if (lastSyncStr) {
        const timestamps = JSON.parse(lastSyncStr);
        const latestSync = Math.max(...Object.values(timestamps) as number[]);
        setLastSync(latestSync);
        
        // If last sync was more than 5 minutes ago, show pending
        if (Date.now() - latestSync > 5 * 60 * 1000) {
          setStatus('pending');
          return;
        }
      }

      setStatus('synced');
      setErrorMessage(null);
    } catch (e) {
      setStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: Check,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          label: 'Synced',
          description: lastSync ? `Last sync: ${formatRelativeTime(lastSync)}` : 'All changes saved'
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-500/20',
          label: 'Syncing',
          description: 'Saving changes...'
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          label: 'Pending',
          description: 'Changes waiting to sync'
        };
      case 'offline':
        return {
          icon: CloudOff,
          color: 'text-neutral-400',
          bgColor: 'bg-neutral-500/20',
          label: 'Offline',
          description: 'Will sync when connected'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          label: 'Error',
          description: errorMessage || 'Sync failed'
        };
      case 'conflict':
        return {
          icon: AlertCircle,
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/20',
          label: 'Conflict',
          description: `${pendingCount} save(s) need resolution`
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <motion.button
      onClick={onOpenSettings}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} border border-white/10 hover:border-white/20 transition-all`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Icon className={`w-4 h-4 ${config.color} ${status === 'syncing' ? 'animate-spin' : ''}`} />
      {showDetails && (
        <div className="flex flex-col items-start">
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
          <span className="text-xs text-neutral-500">{config.description}</span>
        </div>
      )}
    </motion.button>
  );
}

/**
 * Compact sync badge for headers/toolbars
 */
export function SyncBadge() {
  const [status, setStatus] = useState<SyncStatus>('synced');

  useEffect(() => {
    const checkStatus = async () => {
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }
      
      try {
        const available = await isCloudStorageAvailable();
        setStatus(available ? 'synced' : 'error');
      } catch {
        setStatus('error');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getColor = () => {
    switch (status) {
      case 'synced': return 'bg-green-500';
      case 'syncing': return 'bg-cyan-500 animate-pulse';
      case 'pending': return 'bg-yellow-500';
      case 'offline': return 'bg-neutral-500';
      case 'error':
      case 'conflict': return 'bg-red-500';
    }
  };

  return (
    <div className={`w-2 h-2 rounded-full ${getColor()}`} title={`Sync: ${status}`} />
  );
}

/**
 * Full sync status panel for settings pages
 */
export function SyncStatusPanel() {
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [quota, setQuota] = useState<{ used: number; total: number } | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }

      const [available, quotaData] = await Promise.all([
        isCloudStorageAvailable(),
        getStorageQuota()
      ]);

      setStatus(available ? 'synced' : 'error');
      setQuota({ used: quotaData.used, total: quotaData.total });

      const lastSyncStr = localStorage.getItem('challenger_last_sync_timestamps');
      if (lastSyncStr) {
        const timestamps = JSON.parse(lastSyncStr);
        const latestSync = Math.max(...Object.values(timestamps) as number[]);
        setLastSync(latestSync);
      }
    } catch (e) {
      setStatus('error');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Sync Status</h3>
        <SyncStatusIndicator showDetails />
      </div>

      {quota && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400">Storage</span>
            <span className="text-white">{formatBytes(quota.used)} / {formatBytes(quota.total)}</span>
          </div>
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyan-500 rounded-full"
              style={{ width: `${Math.min((quota.used / quota.total) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {lastSync && (
        <p className="text-xs text-neutral-500 mt-3">
          Last synced: {formatRelativeTime(lastSync)}
        </p>
      )}
    </div>
  );
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}