"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface UsernameModalProps {
  isOpen: boolean;
  onSubmit: (username: string) => Promise<{ success: boolean; error?: string }>;
  onClose?: () => void;
}

type ModalState = "input" | "loading" | "success" | "error";

export function UsernameModal({ isOpen, onSubmit, onClose }: UsernameModalProps) {
  const [username, setUsername] = useState("");
  const [state, setState] = useState<ModalState>("input");
  const [errorMessage, setErrorMessage] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const validateUsername = useCallback((value: string): boolean => {
    const trimmed = value.trim().toLowerCase();
    const isValid = /^[a-z0-9_]{3,20}$/.test(trimmed);
    setIsValid(value.length === 0 ? null : isValid);
    return isValid;
  }, []);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
    if (state === "error") {
      setState("input");
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmed = username.trim().toLowerCase();
    if (!validateUsername(trimmed)) {
      setState("error");
      setErrorMessage("Username must be 3-20 characters: letters, numbers, and underscores only.");
      return;
    }

    setState("loading");
    try {
      const result = await onSubmit(trimmed);
      if (result.success) {
        setState("success");
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      } else {
        setState("error");
        setErrorMessage(result.error || "Failed to create username. Please try again.");
      }
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && onClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose?.()}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md mx-4 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 pointer-events-none" />
            
            {/* Content */}
            <div className="relative p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                  <User className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Challenger</h2>
                <p className="text-neutral-400 text-sm">
                  Choose a username to get started. This will be your identity across all devices.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    placeholder="Enter your username"
                    disabled={state === "loading" || state === "success"}
                    autoFocus
                    className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 transition-all ${
                      isValid === false
                        ? "border-red-500/50 focus:ring-red-500/20"
                        : isValid === true
                        ? "border-green-500/50 focus:ring-green-500/20"
                        : "border-white/10 focus:ring-cyan-500/20 focus:border-cyan-500/50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  {/* Validation indicator */}
                  {isValid !== null && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isValid ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>

                {/* Helper text */}
                <p className="text-xs text-neutral-500 -mt-4">
                  3-20 characters: lowercase letters, numbers, and underscores
                </p>

                {/* Error message */}
                {state === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">{errorMessage}</p>
                  </motion.div>
                )}

                {/* Success message */}
                {state === "success" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                  >
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-400">Welcome aboard! Redirecting...</p>
                  </motion.div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={state === "loading" || state === "success" || isValid === false}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {state === "loading" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : state === "success" ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Success!
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              {/* Footer */}
              <p className="mt-6 text-center text-xs text-neutral-500">
                Your account is linked to your device fingerprint. No password needed.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}