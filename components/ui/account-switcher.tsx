"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Check, X, User, LogIn } from "lucide-react";
import { useAuth, useSavedAccounts } from "@/lib/auth/auth-context";

interface AccountSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountSwitcher({ isOpen, onClose }: AccountSwitcherProps) {
  const { user, signIn, setShowUsernameModal } = useAuth();
  const savedAccounts = useSavedAccounts();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const handleSwitchAccount = async (username: string) => {
    setSwitchingTo(username);
    try {
      const result = await signIn(username);
      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to switch account:", error);
    } finally {
      setSwitchingTo(null);
    }
  };

  const handleAddAccount = () => {
    onClose();
    setShowUsernameModal(true);
  };

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

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
            className="relative w-full max-w-md mx-4 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Switch Account</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Account List */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {savedAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-400">No other accounts found</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Add an account to switch between them
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedAccounts.map((account) => (
                    <button
                      key={account.fingerprint}
                      onClick={() => handleSwitchAccount(account.username)}
                      disabled={switchingTo !== null || account.username === user?.username}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        account.username === user?.username
                          ? 'bg-cyan-500/10 border border-cyan-500/30'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      } disabled:opacity-50`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">{account.username}</p>
                        <p className="text-xs text-neutral-400">
                          Last login: {new Date(account.lastLogin).toLocaleDateString()}
                        </p>
                      </div>
                      {account.username === user?.username ? (
                        <div className="flex items-center gap-1 text-cyan-400">
                          <Check className="w-4 h-4" />
                          <span className="text-xs">Active</span>
                        </div>
                      ) : switchingTo === account.username ? (
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4 text-neutral-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add Account Button */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleAddAccount}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 hover:from-cyan-500/30 hover:to-purple-500/30 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Account
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}