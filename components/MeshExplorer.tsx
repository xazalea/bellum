/**
 * Mesh Explorer
 * Visual map of P2P compute mesh
 */

'use client';

import React, { useState, useEffect } from 'react';
import { meshScheduler } from '../lib/fabric/mesh-scheduler';
import { fabricMesh } from '../lib/fabric/mesh';
import { remoteExecution } from '../lib/fabric/remote-execution';
import type { PeerCapabilities, ScheduledTask } from '../lib/fabric/mesh-scheduler';

interface PeerHealth {
  peerId: string;
  successRate: number;
  avgLatency: number;
  failures: number;
  lastFailure: number | null;
}

export function MeshExplorer() {
  const [peers, setPeers] = useState<PeerCapabilities[]>([]);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [showFailureTriage, setShowFailureTriage] = useState(false);
  const [peerHealth, setPeerHealth] = useState<Map<string, PeerHealth>>(new Map());
  
  useEffect(() => {
    const updateInterval = setInterval(() => {
      const peerCaps = meshScheduler.getPeerCapabilities();
      setPeers(peerCaps);
      setTasks(meshScheduler.getScheduledTasks());
      setStats(remoteExecution.getStatistics());
      
      // Calculate peer health
      const health = new Map<string, PeerHealth>();
      for (const peer of peerCaps) {
        health.set(peer.peerId, {
          peerId: peer.peerId,
          successRate: peer.successRate,
          avgLatency: peer.averageResponseTime,
          failures: peer.totalJobsFailed,
          lastFailure: peer.lastFailureTime || null,
        });
      }
      setPeerHealth(health);
    }, 1000);
    
    // Initial update
    const peerCaps = meshScheduler.getPeerCapabilities();
    setPeers(peerCaps);
    setTasks(meshScheduler.getScheduledTasks());
    setStats(remoteExecution.getStatistics());
    
    return () => clearInterval(updateInterval);
  }, []);
  
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'running': return 'text-blue-400';
      case 'failed': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };
  
  const getLoadColor = (load: number): string => {
    if (load < 0.3) return 'text-green-400';
    if (load < 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <div className="w-full h-full p-6 bg-black text-white font-mono text-sm overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-cyan-400">Mesh Explorer</h1>
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
          <div className="space-y-2">
            {Array.from(peerHealth.values())
              .filter(h => h.failures > 0 || h.successRate < 0.8)
              .map((health) => (
                <div key={health.peerId} className="bg-gray-900 p-3 rounded border border-red-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-red-400">{health.peerId.substring(0, 16)}...</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Success Rate: {(health.successRate * 100).toFixed(1)}% | 
                        Failures: {health.failures} | 
                        Avg Latency: {health.avgLatency.toFixed(1)}ms
                      </div>
                      {health.lastFailure && (
                        <div className="text-xs text-gray-500 mt-1">
                          Last Failure: {new Date(health.lastFailure).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            {Array.from(peerHealth.values()).filter(h => h.failures > 0 || h.successRate < 0.8).length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No failures detected. All peers healthy.
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Total Jobs</div>
            <div className="text-xl font-bold">{stats.totalJobs}</div>
          </div>
          
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Success Rate</div>
            <div className="text-xl font-bold text-green-400">
              {stats.totalJobs > 0 ? ((stats.successfulJobs / stats.totalJobs) * 100).toFixed(1) : 0}%
            </div>
          </div>
          
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Avg Duration</div>
            <div className="text-xl font-bold">{stats.avgDuration.toFixed(2)}ms</div>
          </div>
          
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Local Fallbacks</div>
            <div className="text-xl font-bold text-yellow-400">{stats.localFallbacks}</div>
          </div>
        </div>
      )}
      
      {/* Peers Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Connected Peers ({peers.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {peers.map((peer) => (
            <div key={peer.nodeId} className="bg-gray-900 p-4 rounded border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-cyan-400">{peer.nodeId.substring(0, 8)}...</div>
                  <div className="text-xs text-gray-400">{peer.peerId.substring(0, 16)}...</div>
                </div>
                <div className={`text-sm font-bold ${getLoadColor(peer.currentLoad)}`}>
                  {(peer.currentLoad * 100).toFixed(0)}% Load
                </div>
              </div>
              
              <div className="space-y-1 text-xs mt-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Compute Units:</span>
                  <span>{peer.computeUnits}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Memory:</span>
                  <span>{formatBytes(peer.memory)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">GPU VRAM:</span>
                  <span>{formatBytes(peer.gpuVRAM)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Bandwidth:</span>
                  <span>{formatBytes(peer.bandwidth)}/s</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Latency:</span>
                  <span>{peer.latency.toFixed(1)}ms</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Thermal:</span>
                  <span className={
                    peer.thermalState === 'critical' ? 'text-red-400' :
                    peer.thermalState === 'serious' ? 'text-orange-400' :
                    peer.thermalState === 'fair' ? 'text-yellow-400' : 'text-green-400'
                  }>
                    {peer.thermalState}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Supported Tasks:</div>
                <div className="flex flex-wrap gap-1">
                  {peer.supportedTaskTypes.slice(0, 3).map((type) => (
                    <span key={type} className="text-xs bg-gray-800 px-2 py-1 rounded">
                      {type.replace('_', ' ')}
                    </span>
                  ))}
                  {peer.supportedTaskTypes.length > 3 && (
                    <span className="text-xs text-gray-500">+{peer.supportedTaskTypes.length - 3}</span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedPeer(peer.peerId)}
                  className="mt-2 w-full text-xs bg-blue-600 hover:bg-blue-700 rounded px-2 py-1"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
          
          {peers.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-8">
              No peers connected. Waiting for mesh connections...
            </div>
          )}
        </div>
      </div>
      
      {/* Active Tasks */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Active Tasks ({tasks.length})</h2>
        <div className="space-y-2">
          {tasks.slice(0, 10).map((task) => (
            <div key={task.jobId} className="bg-gray-900 p-3 rounded border border-gray-700">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{task.jobId.substring(0, 8)}...</span>
                    <span className={`text-xs font-bold ${getStatusColor(task.status)}`}>
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-400 mt-1">
                    Type: {task.job.type} | Priority: {(task.job.priority * 100).toFixed(0)}%
                  </div>
                  
                  {task.assignedPeer && (
                    <div className="text-xs text-gray-500 mt-1">
                      Peer: {task.assignedPeer.nodeId.substring(0, 8)}... | 
                      Retries: {task.retryCount}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-400">
                  {task.status === 'running' && (
                    <div>Running...</div>
                  )}
                  {task.status === 'completed' && (
                    <div className="text-green-400">Completed</div>
                  )}
                  {task.status === 'failed' && (
                    <div className="text-red-400">Failed</div>
                  )}
                </div>
              </div>
              
              {task.error && (
                <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                  Error: {task.error}
                </div>
              )}
            </div>
          ))}
          
          {tasks.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No active tasks
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
