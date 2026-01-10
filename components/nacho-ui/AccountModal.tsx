'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { Button } from './Button';
import { authService } from '@/lib/firebase/auth-service';
import { User } from '@/lib/firebase/auth-service';
import { X, User as UserIcon, Copy, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type AccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
};

export function AccountModal({ isOpen, onClose, user }: AccountModalProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsernameInput('');
      setRegisterError(null);
      setUsernameValid(null);
    }
  }, [isOpen]);

  // Real-time username validation
  useEffect(() => {
    if (!usernameInput.trim() || usernameInput.length < 3) {
      setUsernameValid(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        // Basic validation
        if (!/^[a-z0-9_]+$/i.test(usernameInput)) {
          setUsernameValid(false);
          setRegisterError('Username can only contain letters, numbers, and underscores');
        } else {
          setUsernameValid(true);
          setRegisterError(null);
        }
      } catch (e) {
        setUsernameValid(null);
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [usernameInput]);

  const handleRegister = async () => {
    if (!usernameInput.trim()) return;
    setIsRegistering(true);
    setRegisterError(null);
    try {
      await authService.claimUsername(usernameInput);
      // User state will update via parent listener
    } catch (e: any) {
      setRegisterError(e.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const copyUid = async () => {
    if (user?.uid) {
      await navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div 
          className="absolute inset-0" 
          onClick={onClose} 
          aria-label="Close modal"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-lg bg-nacho-card border border-nacho-border rounded-nacho shadow-2xl p-6 z-10"
        >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Account</h2>
            <div className="mt-1 text-sm font-semibold text-nacho-subtext">
              {user?.username ? (
                <>Signed in as <span className="text-white">{user.username}</span></>
              ) : (
                "You don't have an account."
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-nacho-card-hover border border-nacho-border flex items-center justify-center text-nacho-subtext hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {!user?.username ? (
          <div className="space-y-4">
            <p className="text-sm text-nacho-subtext leading-relaxed">
              Register a username to link it to your device fingerprint. This allows you to sync your library and preferences.
            </p>
            
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Choose a username"
                  className={cn(
                    "w-full bg-nacho-bg border rounded-xl px-4 py-3 pr-12 text-white placeholder:text-nacho-subtext/50 focus:outline-none focus:border-nacho-primary focus:ring-1 focus:ring-nacho-primary transition-all",
                    usernameValid === true && "border-green-500/50",
                    usernameValid === false && "border-red-500/50",
                    !usernameValid && "border-nacho-border"
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checking && <Loader2 className="h-5 w-5 animate-spin text-nacho-subtext" />}
                  {!checking && usernameValid === true && <Check className="h-5 w-5 text-green-400" />}
                  {!checking && usernameValid === false && <X className="h-5 w-5 text-red-400" />}
                </div>
              </div>
              {registerError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-semibold text-red-400 pl-1"
                >
                  {registerError}
                </motion.p>
              )}
            </div>

            <Button 
              onClick={handleRegister} 
              disabled={isRegistering || !usernameInput.trim()}
              className="w-full justify-center"
            >
              {isRegistering ? 'Registering...' : 'Create Account'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-nacho-border bg-nacho-bg/50 p-4">
              <div className="text-[10px] font-bold tracking-wider text-nacho-subtext/60 mb-2">USER ID</div>
              <div className="flex items-center justify-between gap-3">
                <code className="font-mono text-sm text-white/90 truncate select-all">
                  {user?.uid ?? '…'}
                </code>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={copyUid}
                  className={cn("shrink-0 gap-1.5", copied && "text-green-400 border-green-400/30")}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Link href="/library" onClick={onClose}>
                <Button variant="secondary">My Library</Button>
              </Link>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
