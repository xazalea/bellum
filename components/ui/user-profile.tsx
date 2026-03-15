"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Settings, Cloud, ChevronDown, CheckCircle, AlertCircle, Loader2, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSyncStatus, setSyncEnabled, syncIdentityToCloud } from "@/lib/storage/identity-sync";
import { AccountSwitcher } from "./account-switcher";

export function UserProfile() {
  const { user, signOut, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const syncStatus = getSyncStatus();

  if (isLoading || !user) {
    return null;
  }

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await syncIdentityToCloud({
        username: user.username,
        fingerprint: user.fingerprint,
        createdAt: user.createdAt || Date.now(),
        lastLogin: user.lastLogin || Date.now(),
      });
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleSync = async () => {
    await setSyncEnabled(!syncStatus.syncEnabled, 'discord');
  };

  return (
    <div className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-white hidden sm:block">{user.username}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-72 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{user.username}</p>
                    <p className="text-xs text-neutral-400">
                      Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cloud Sync Status */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-neutral-400" />
                    <span className="text-sm text-neutral-300">Cloud Sync</span>
                  </div>
                  {syncStatus.syncEnabled ? (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Enabled
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500">Disabled</span>
                  )}
                </div>
                
                {syncStatus.lastSynced && (
                  <p className="text-xs text-neutral-500 mb-2">
                    Last synced: {new Date(syncStatus.lastSynced).toLocaleString()}
                  </p>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={handleToggleSync}
                    className={`flex-1 py-1.5 px-3 text-xs rounded-lg transition-all ${
                      syncStatus.syncEnabled
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {syncStatus.syncEnabled ? 'On' : 'Off'}
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex-1 py-1.5 px-3 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      'Sync Now'
                    )}
                  </button>
                </div>
                
                {syncStatus.error && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    {syncStatus.error}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowAccountSwitcher(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 rounded-lg transition-all"
                >
                  <Users className="w-4 h-4" />
                  Switch Account
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 rounded-lg transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={() => {
                    signOut();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Account Switcher Modal */}
      <AccountSwitcher
        isOpen={showAccountSwitcher}
        onClose={() => setShowAccountSwitcher(false)}
      />
    </div>
  );
}
