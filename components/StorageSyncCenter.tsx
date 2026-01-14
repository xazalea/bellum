/**
 * Storage & Synchronization Center
 * Manage file sync, conflicts, and storage policies
 */

'use client';

import React, { useState, useEffect } from 'react';
import { syncEngine } from '../lib/engine/sync-engine';
import { virtualFileSystem } from '../lib/engine/virtual-fs';
import type { FileMetadata, SyncOperation, ConflictResolution, SyncPolicy } from '../lib/engine/sync-engine';

interface IntegrityFailure {
  path: string;
  expectedHash: string;
  actualHash: string;
  timestamp: number;
  type: 'hash_mismatch' | 'missing_chunk' | 'corrupted';
}

export function StorageSyncCenter() {
  const [metadata, setMetadata] = useState<FileMetadata[]>([]);
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [policy, setPolicy] = useState<SyncPolicy | null>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [integrityFailures, setIntegrityFailures] = useState<IntegrityFailure[]>([]);
  const [showFailureTriage, setShowFailureTriage] = useState(false);
  
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setMetadata(syncEngine.getAllMetadata());
      setOperations(syncEngine.getSyncOperations());
      setConflicts(syncEngine.getConflicts());
      setPolicy(syncEngine.getSyncPolicy());
      
      // Get storage stats
      const stats = virtualFileSystem.getCacheStats();
      setStorageStats(stats);
    }, 2000);
    
    // Initial update
    setMetadata(syncEngine.getAllMetadata());
    setOperations(syncEngine.getSyncOperations());
    setConflicts(syncEngine.getConflicts());
    setPolicy(syncEngine.getSyncPolicy());
    
    const stats = virtualFileSystem.getCacheStats();
    setStorageStats(stats);
    
    return () => clearInterval(updateInterval);
  }, []);
  
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  
  const getSyncStateColor = (state: string): string => {
    switch (state) {
      case 'synced': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'conflict': return 'text-red-400';
      case 'error': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };
  
  const handleResolveConflict = async (path: string, resolution: 'local' | 'remote' | 'merge') => {
    await syncEngine.resolveConflict(path, resolution);
    setConflicts(syncEngine.getConflicts());
  };
  
  const handleUpdatePolicy = (updates: Partial<SyncPolicy>) => {
    if (policy) {
      syncEngine.updateSyncPolicy(updates);
      setPolicy(syncEngine.getSyncPolicy());
    }
  };
  
  return (
    <div className="w-full h-full p-6 bg-black text-white font-mono text-sm overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-emerald-400">Storage & Sync Center</h1>
        <button
          onClick={() => setShowFailureTriage(!showFailureTriage)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
        >
          {showFailureTriage ? 'Hide' : 'Show'} Failure Triage
        </button>
      </div>
      
      {/* Failure Triage View */}
      {showFailureTriage && (
        <div className="mb-6 bg-red-900/20 border border-red-700 p-4 rounded">
          <h2 className="text-lg font-semibold mb-3 text-red-400">Failure Triage</h2>
          
          {/* Integrity Failures */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Integrity Failures ({integrityFailures.length})</h3>
            {integrityFailures.length > 0 ? (
              <div className="space-y-2">
                {integrityFailures.map((failure, i) => (
                  <div key={i} className="bg-gray-900 p-3 rounded border border-red-700">
                    <div className="font-bold text-red-400">{failure.path}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Type: {failure.type} | 
                      Expected: {failure.expectedHash.substring(0, 16)}... | 
                      Actual: {failure.actualHash.substring(0, 16)}...
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(failure.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                No integrity failures detected.
              </div>
            )}
          </div>
          
          {/* Sync Operation Failures */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Failed Sync Operations</h3>
            {operations.filter(op => op.status === 'failed').length > 0 ? (
              <div className="space-y-2">
                {operations.filter(op => op.status === 'failed').slice(0, 10).map((op) => (
                  <div key={op.id} className="bg-gray-900 p-3 rounded border border-red-700">
                    <div className="font-bold text-red-400">{op.path}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Type: {op.type} | Error: {op.error}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(op.startTime).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                No failed sync operations.
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Storage Statistics */}
      {storageStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Cache Entries</div>
            <div className="text-xl font-bold">{storageStats.entries}</div>
          </div>
          
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Cache Size</div>
            <div className="text-xl font-bold">{formatBytes(storageStats.totalSize)}</div>
          </div>
          
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Synced Files</div>
            <div className="text-xl font-bold text-green-400">
              {metadata.filter(m => m.syncState === 'synced').length}
            </div>
          </div>
          
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Conflicts</div>
            <div className="text-xl font-bold text-red-400">{conflicts.length}</div>
          </div>
          
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Integrity Failures</div>
            <div className="text-xl font-bold text-red-400">{integrityFailures.length}</div>
          </div>
        </div>
      )}
      
      {/* Sync Policy */}
      {policy && (
        <div className="bg-gray-900 p-4 rounded border border-gray-700 mb-6">
          <h2 className="text-lg font-semibold mb-3">Sync Policy</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Background Sync</label>
              <button
                onClick={() => handleUpdatePolicy({ enableBackgroundSync: !policy.enableBackgroundSync })}
                className={`text-sm font-bold ${policy.enableBackgroundSync ? 'text-green-400' : 'text-red-400'}`}
              >
                {policy.enableBackgroundSync ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Replication</label>
              <button
                onClick={() => handleUpdatePolicy({ enableReplication: !policy.enableReplication })}
                className={`text-sm font-bold ${policy.enableReplication ? 'text-green-400' : 'text-red-400'}`}
              >
                {policy.enableReplication ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Replication Factor</label>
              <input
                type="number"
                min="1"
                max="5"
                value={policy.replicationFactor}
                onChange={(e) => handleUpdatePolicy({ replicationFactor: parseInt(e.target.value) })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-20"
              />
            </div>
            
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Auto Resolve Conflicts</label>
              <button
                onClick={() => handleUpdatePolicy({ autoResolveConflicts: !policy.autoResolveConflicts })}
                className={`text-sm font-bold ${policy.autoResolveConflicts ? 'text-green-400' : 'text-red-400'}`}
              >
                {policy.autoResolveConflicts ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Chunk Size</label>
              <div className="text-sm">{formatBytes(policy.chunkSize)}</div>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Sync Interval</label>
              <div className="text-sm">{policy.syncInterval / 1000}s</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Sync Operations */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Sync Operations ({operations.length})</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {operations.slice(0, 10).map((op) => (
            <div key={op.id} className="bg-gray-900 p-3 rounded border border-gray-700">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{op.path}</span>
                    <span className={`text-xs font-bold ${getSyncStateColor(op.status)}`}>
                      {op.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-400 mt-1">
                    Type: {op.type} | Progress: {(op.progress * 100).toFixed(0)}%
                  </div>
                  
                  {op.error && (
                    <div className="text-xs text-red-400 mt-1">Error: {op.error}</div>
                  )}
                </div>
              </div>
              
              {op.status === 'in_progress' && (
                <div className="mt-2 h-1 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-green-400 transition-all"
                    style={{ width: `${op.progress * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
          
          {operations.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No sync operations
            </div>
          )}
        </div>
      </div>
      
      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Conflicts ({conflicts.length})</h2>
          <div className="space-y-3">
            {conflicts.map((conflict) => (
              <div key={conflict.path} className="bg-red-900/20 border border-red-700 p-4 rounded">
                <div className="font-bold text-red-400 mb-2">{conflict.path}</div>
                
                <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                  <div>
                    <div className="text-gray-400 mb-1">Local Version</div>
                    <div>v{conflict.localVersion} | {conflict.localHash.substring(0, 16)}...</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 mb-1">Remote Version</div>
                    <div>v{conflict.remoteVersion} | {conflict.remoteHash.substring(0, 16)}...</div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolveConflict(conflict.path, 'local')}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                  >
                    Keep Local
                  </button>
                  <button
                    onClick={() => handleResolveConflict(conflict.path, 'remote')}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
                  >
                    Use Remote
                  </button>
                  <button
                    onClick={() => handleResolveConflict(conflict.path, 'merge')}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                  >
                    Merge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* File Metadata */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Synced Files ({metadata.length})</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {metadata.slice(0, 20).map((meta) => (
            <div key={meta.path} className="bg-gray-900 p-3 rounded border border-gray-700">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">{meta.path}</span>
                    <span className={`text-xs font-bold ${getSyncStateColor(meta.syncState)}`}>
                      {meta.syncState.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-400 mt-1">
                    Size: {formatBytes(meta.size)} | Version: {meta.version} | 
                    Replicas: {meta.replicas.length}
                  </div>
                  
                  {meta.replicas.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Peers: {meta.replicas.map(r => r.substring(0, 8)).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {metadata.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No files synced yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
