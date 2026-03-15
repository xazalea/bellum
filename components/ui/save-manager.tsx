"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Trash2, Download, Upload, Clock, HardDrive, Gamepad2, RefreshCw, AlertCircle, Check, X } from "lucide-react";
import { 
  listGameSaves, 
  deleteGameSave, 
  downloadGameSave, 
  GameSaveMetadata,
  getStorageQuota 
} from "@/lib/storage/cloud-save-manager";
import { detectConflict, autoResolveConflict, ConflictInfo } from "@/lib/storage/conflict-resolution";

interface SaveManagerProps {
  isOpen: boolean;
  onClose: () => void;
  gameId?: string;
}

export function SaveManager({ isOpen, onClose, gameId }: SaveManagerProps) {
  const [saves, setSaves] = useState<GameSaveMetadata[]>([]);
  const [quota, setQuota] = useState<{ used: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Map<string, ConflictInfo>>(new Map());
  const [selectedSave, setSelectedSave] = useState<GameSaveMetadata | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSaves();
    }
  }, [isOpen, gameId]);

  const loadSaves = async () => {
    setLoading(true);
    try {
      const [savesData, quotaData] = await Promise.all([
        listGameSaves(gameId),
        getStorageQuota()
      ]);
      setSaves(savesData);
      setQuota({ used: quotaData.used, total: quotaData.total });
    } catch (e) {
      console.error("Failed to load saves:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (save: GameSaveMetadata) => {
    setDownloadingId(save.saveId);
    try {
      const blob = await downloadGameSave(save.saveId);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${save.gameName}_${save.saveName}.sav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download save:", e);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (saveId: string) => {
    if (!confirm("Are you sure you want to delete this save? This cannot be undone.")) return;
    
    setDeletingId(saveId);
    try {
      await deleteGameSave(saveId);
      await loadSaves();
    } catch (e) {
      console.error("Failed to delete save:", e);
    } finally {
      setDeletingId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const usagePercent = quota ? (quota.used / quota.total) * 100 : 0;

  // Group saves by game
  const savesByGame = saves.reduce((acc, save) => {
    if (!acc[save.gameId]) {
      acc[save.gameId] = [];
    }
    acc[save.gameId].push(save);
    return acc;
  }, {} as Record<string, GameSaveMetadata[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl mx-4 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Save Manager</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadSaves}
                  disabled={loading}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-neutral-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>

            {/* Quota Bar */}
            {quota && (
              <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-neutral-400">Storage Used</span>
                  <span className="text-xs text-neutral-400">
                    {formatBytes(quota.used)} / {formatBytes(quota.total)}
                  </span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : saves.length === 0 ? (
                <div className="text-center py-12">
                  <Save className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-400">No saves found</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Play some games to create saves
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(savesByGame).map(([gId, gameSaves]) => (
                    <div key={gId}>
                      <div className="flex items-center gap-2 mb-3">
                        <Gamepad2 className="w-4 h-4 text-cyan-400" />
                        <h3 className="font-medium text-white">{gameSaves[0].gameName}</h3>
                        <span className="text-xs text-neutral-500">({gameSaves.length} saves)</span>
                      </div>
                      
                      <div className="space-y-2">
                        {gameSaves.map((save) => (
                          <motion.div
                            key={save.saveId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{save.saveName}</p>
                              <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(save.updatedAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <HardDrive className="w-3 h-3" />
                                  {formatBytes(save.size)}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  save.platform === 'android' 
                                    ? 'bg-green-500/20 text-green-400'
                                    : save.platform === 'windows'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-purple-500/20 text-purple-400'
                                }`}>
                                  {save.platform}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                save.storageBackend === 'telegram' 
                                  ? 'bg-blue-500/20 text-blue-400' 
                                  : 'bg-purple-500/20 text-purple-400'
                              }`}>
                                {save.storageBackend}
                              </span>
                              
                              <button
                                onClick={() => handleDownload(save)}
                                disabled={downloadingId === save.saveId}
                                className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors disabled:opacity-50"
                                title="Download save"
                              >
                                {downloadingId === save.saveId ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleDelete(save.saveId)}
                                disabled={deletingId === save.saveId}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                                title="Delete save"
                              >
                                {deletingId === save.saveId ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{saves.length} save(s) total</span>
                <span>Auto-saves are kept for 30 days</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}