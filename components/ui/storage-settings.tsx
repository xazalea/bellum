"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, HardDrive, Settings, Check, AlertCircle, Loader2, Trash2, Download, Upload } from "lucide-react";
import { 
  getStorageQuota, 
  listGameSaves, 
  deleteGameSave, 
  isCloudStorageAvailable,
  getBestBackend 
} from "@/lib/storage/cloud-save-manager";
import { 
  initTelegramStorage, 
  isTelegramConfigured,
  getTelegramConfig 
} from "@/lib/storage/telegram-storage";

interface StorageSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StorageSettings({ isOpen, onClose }: StorageSettingsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'saves'>('general');
  const [quota, setQuota] = useState<{ used: number; total: number; available: number; backend: 'discord' | 'telegram' } | null>(null);
  const [saves, setSaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotaData, savesData] = await Promise.all([
        getStorageQuota(),
        listGameSaves()
      ]);
      setQuota(quotaData);
      setSaves(savesData);
      
      // Load Telegram config if exists
      const tgConfig = getTelegramConfig();
      if (tgConfig) {
        setTelegramBotToken(tgConfig.botToken);
        setTelegramChatId(tgConfig.chatId);
      }
    } catch (e) {
      console.error("Failed to load storage data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTelegramConfig = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!telegramBotToken.trim() || !telegramChatId.trim()) {
        throw new Error("Please enter both bot token and chat ID");
      }
      
      initTelegramStorage({
        botToken: telegramBotToken.trim(),
        chatId: telegramChatId.trim()
      });
      
      setSuccess("Telegram storage configured successfully!");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSave = async (saveId: string) => {
    if (!confirm("Are you sure you want to delete this save?")) return;
    
    try {
      await deleteGameSave(saveId);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete save");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usagePercent = quota ? (quota.used / quota.total) * 100 : 0;

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
            className="relative w-full max-w-2xl mx-4 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Cloud Storage Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'general'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Configuration
              </button>
              <button
                onClick={() => setActiveTab('saves')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'saves'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <HardDrive className="w-4 h-4 inline mr-2" />
                Game Saves ({saves.length})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : (
                <>
                  {/* General Tab */}
                  {activeTab === 'general' && (
                    <div className="space-y-6">
                      {/* Storage Quota */}
                      {quota && (
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <h3 className="text-sm font-medium text-white mb-3">Storage Quota</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-400">Used</span>
                              <span className="text-white">{formatBytes(quota.used)} / {formatBytes(quota.total)}</span>
                            </div>
                            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-cyan-500'
                                }`}
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-neutral-500">
                              <span>Backend: {quota.backend}</span>
                              <span>{usagePercent.toFixed(1)}% used</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Telegram Configuration */}
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-white">Telegram Storage</h3>
                          {isTelegramConfigured() && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Configured
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-neutral-400 mb-4">
                          Configure a Telegram bot to use as alternative cloud storage. 
                          Create a bot via @BotFather and get your chat ID by messaging @userinfobot.
                        </p>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1">Bot Token</label>
                            <input
                              type="password"
                              value={telegramBotToken}
                              onChange={(e) => setTelegramBotToken(e.target.value)}
                              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                              className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1">Chat ID</label>
                            <input
                              type="text"
                              value={telegramChatId}
                              onChange={(e) => setTelegramChatId(e.target.value)}
                              placeholder="-1001234567890"
                              className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          
                          <button
                            onClick={handleSaveTelegramConfig}
                            disabled={saving}
                            className="w-full py-2 px-4 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {saving ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Save Configuration
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Status Messages */}
                      {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      )}
                      {success && (
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <Check className="w-4 h-4 text-green-400" />
                          <p className="text-sm text-green-400">{success}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Saves Tab */}
                  {activeTab === 'saves' && (
                    <div className="space-y-3">
                      {saves.length === 0 ? (
                        <div className="text-center py-12">
                          <HardDrive className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                          <p className="text-neutral-400">No game saves found</p>
                          <p className="text-xs text-neutral-500 mt-1">
                            Saves will appear here when you play games
                          </p>
                        </div>
                      ) : (
                        saves.map((save) => (
                          <div
                            key={save.saveId}
                            className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{save.saveName}</p>
                              <p className="text-xs text-neutral-400">
                                {save.gameName} • {formatBytes(save.size)} • {new Date(save.updatedAt).toLocaleDateString()}
                              </p>
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
                                onClick={() => handleDeleteSave(save.saveId)}
                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}