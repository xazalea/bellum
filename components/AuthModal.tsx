'use client';

import React, { useState } from 'react';
import { X, LogIn, User } from 'lucide-react';
import { authService } from '@/lib/firebase/auth-service';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.signInWithGoogle();
      onAuthSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.signInAnonymously();
      onAuthSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Guest sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bellum-card w-full max-w-md p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Sign in
          </h2>
          <p className="text-gray-400">
            Sign in to unlock hosting, storage, and social features.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleGoogle()}
            className="w-full bellum-btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn size={18} className="inline mr-2" />
            Continue with Google
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleGuest()}
            className="w-full px-4 py-3 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition-colors text-white font-semibold disabled:opacity-50"
          >
            <User size={18} className="inline mr-2" />
            Continue as guest
          </button>
          <div className="text-xs text-white/40">
            Guest accounts are real Firebase anonymous accounts (server-verified). You can upgrade later by signing in with Google on the same device.
          </div>
        </div>
      </div>
    </div>
  );
};
