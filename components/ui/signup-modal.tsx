'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { animate, spring, ease, dur } from '@/lib/hooks/use-anime';
import { Gamepad2, User, AlertCircle, Check, Fingerprint } from 'lucide-react';

export function SignupModal() {
  const { showUsernameModal, setShowUsernameModal, needsUsername, signUp, signIn, isLoading, user, error } = useAuth();
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const animatedRef = useRef(false);

  const visible = showUsernameModal && needsUsername && !user;

  useEffect(() => {
    if (!visible || animatedRef.current) return;
    animatedRef.current = true;

    requestAnimationFrame(() => {
      if (overlayRef.current) animate(overlayRef.current, { opacity: [0, 1], ease: ease.out, duration: dur.base });
      if (cardRef.current) animate(cardRef.current, { scale: [0.95, 1], opacity: [0, 1], ease: spring({ bounce: 0.2, stiffness: 220, damping: 18 }), duration: dur.slow });
      if (inputWrapRef.current) animate(inputWrapRef.current, { translateY: [6, 0], opacity: [0, 1], ease: ease.out, duration: dur.base, delay: 200 });
      if (btnRef.current) animate(btnRef.current, { scale: [0.9, 1], opacity: [0, 1], ease: spring({ bounce: 0.3 }), duration: dur.base, delay: 350 });
      setTimeout(() => inputRef.current?.focus(), 400);
    });
  }, [visible]);

  useEffect(() => {
    if (!visible) animatedRef.current = false;
  }, [visible]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setLocalError('Enter a username');
      if (inputWrapRef.current) animate(inputWrapRef.current, { translateX: [0, -6, 6, -3, 3, 0], ease: ease.out, duration: 350 });
      return;
    }
    if (username.trim().length < 3) { setLocalError('At least 3 characters'); return; }
    if (username.trim().length > 20) { setLocalError('20 characters max'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) { setLocalError('Only letters, numbers, _ and -'); return; }

    setSubmitting(true);
    setLocalError(null);

    try {
      const result = isSignUp ? await signUp(username.trim()) : await signIn(username.trim());
      if (result.success) {
        setSuccess(true);
        if (cardRef.current) animate(cardRef.current, { scale: [1, 1.01, 1], ease: spring({ bounce: 0.3 }), duration: dur.base });
        setTimeout(() => {
          if (overlayRef.current) {
            animate(overlayRef.current, { opacity: [1, 0], ease: ease.out, duration: dur.base, onComplete: () => setShowUsernameModal(false) });
          }
        }, 1000);
      } else {
        setLocalError(result.error || 'Something went wrong');
        if (inputWrapRef.current) animate(inputWrapRef.current, { translateX: [0, -5, 5, -2, 2, 0], ease: ease.out, duration: 300 });
      }
    } catch {
      setLocalError('Connection error');
    } finally {
      setSubmitting(false);
    }
  }, [username, isSignUp, signUp, signIn, setShowUsernameModal]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      style={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) setShowUsernameModal(false); }}
    >
      <div ref={cardRef} style={{ opacity: 0 }} className="w-full max-w-sm glass-card rounded-xl p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Gamepad2 size={20} className="text-primary" />
          </div>
        </div>

        <h2 className="text-lg font-bold text-center text-foreground tracking-tight">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        <p className="text-[11px] text-muted-foreground/50 text-center mt-1.5 mb-5">
          {isSignUp ? 'Pick a username. Your device is your key.' : 'Sign in from a trusted device.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div ref={inputWrapRef} style={{ opacity: 0 }}>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/25" />
              <input
                ref={inputRef}
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setLocalError(null); }}
                placeholder="username"
                maxLength={20}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground/25 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/15 transition-colors"
              />
            </div>
          </div>

          {(localError || error) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle size={14} className="text-destructive" />
              <p className="text-[11px] text-destructive">{localError || error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <Check size={14} className="text-primary" />
              <p className="text-[11px] text-primary">Welcome!</p>
            </div>
          )}

          <button
            ref={btnRef}
            type="submit"
            disabled={submitting || !username.trim() || isLoading}
            style={{ opacity: 0 }}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />{isSignUp ? 'Creating...' : 'Signing in...'}</>
            ) : success ? (
              <><Check size={16} />Ready</>
            ) : (
              <>{isSignUp ? 'Create Account' : 'Sign In'}</>
            )}
          </button>
        </form>

        <div className="mt-3 text-center">
          <button onClick={() => { setIsSignUp(!isSignUp); setLocalError(null); }} className="text-[10px] text-muted-foreground/40 hover:text-foreground/60 transition-colors">
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/50 mx-auto w-fit">
          <Fingerprint size={11} className="text-primary/40" />
          <span className="text-[9px] text-muted-foreground/30 font-medium">Passwordless · Fingerprint Secured</span>
        </div>
      </div>
    </div>
  );
}
