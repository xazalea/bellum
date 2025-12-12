'use client';

import React, { useState } from 'react';
import { X, User, LogIn, ShieldAlert } from 'lucide-react';
import { signInUsername, signUpUsername, isCurrentDeviceTrusted, type NachoAuthResult } from '@/lib/auth/nacho-auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Extract<NachoAuthResult, { status: 'challenge' }> | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setChallenge(null);
    setLoading(true);

    try {
      let res: NachoAuthResult;
      if (mode === 'signin') {
        res = await signInUsername(username);
      } else {
        res = await signUpUsername(username);
      }

      if (res.status === 'ok') {
        onAuthSuccess();
        onClose();
      } else {
        setChallenge(res);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckApproved = async () => {
    setError(null);
    setLoading(true);
    try {
      const ok = await isCurrentDeviceTrusted(username);
      if (!ok) {
        setError('Still pending. Approve the code from a trusted device, then check again.');
        return;
      }
      onAuthSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Check failed');
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
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-400">
            {mode === 'signin' 
              ? 'Sign in with your username (device fingerprint verified)' 
              : 'Pick a unique username (no passwords)'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <User size={16} className="inline mr-2" />
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
              placeholder="e.g. rohan_01"
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="text-xs text-white/40 mt-2">
              3–20 chars: a-z, 0-9, underscore.
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bellum-btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                <LogIn size={18} className="inline mr-2" />
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        {challenge && (
          <div className="mt-6 bellum-card p-4 border-2 border-yellow-400/25 bg-yellow-500/10">
            <div className="flex items-center gap-2 font-semibold text-yellow-100">
              <ShieldAlert size={18} />
              New device approval required
            </div>
            <div className="text-sm text-yellow-100/80 mt-2">
              On a trusted device already logged in as <span className="font-mono">{challenge.username}</span>, open Settings and approve this code:
            </div>
            <div className="mt-3 text-center text-3xl font-mono font-bold tracking-widest text-white">
              {challenge.code}
            </div>
            <div className="text-xs text-white/50 mt-2">
              Expires in ~5 minutes.
            </div>
            <button
              type="button"
              onClick={handleCheckApproved}
              disabled={loading}
              className="mt-4 w-full bellum-btn bellum-btn-secondary disabled:opacity-50"
            >
              I approved it — check again
            </button>
          </div>
        )}

        {/* Toggle Mode */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-white/70 hover:text-white transition-colors text-sm"
          >
            {mode === 'signin' 
              ? "Don't have an account? Sign up" 
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
