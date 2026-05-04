'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { animate, spring, ease, dur, stagger } from '@/lib/hooks/use-anime';
import { safeAnimate, presets } from '@/lib/animation/engine';
import { Gamepad2, User, AlertCircle, Check, Fingerprint, Loader2 } from 'lucide-react';

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
  const fingerprintRingRef = useRef<HTMLDivElement>(null);
  const checkmarkRef = useRef<HTMLDivElement>(null);
  const animatedRef = useRef(false);
  const fpAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const [fingerprintPhase, setFingerprintPhase] = useState<'idle' | 'scanning' | 'success' | 'fallback'>('idle');

  const visible = showUsernameModal && needsUsername && !user;

  useEffect(() => {
    if (!visible || animatedRef.current) return;
    animatedRef.current = true;

    requestAnimationFrame(() => {
      if (overlayRef.current) animate(overlayRef.current, { opacity: [0, 1], ease: ease.out, duration: dur.base });
      if (cardRef.current) animate(cardRef.current, { scale: [0.96, 1], opacity: [0, 1], ease: spring({ bounce: 0.15, stiffness: 240, damping: 20 }), duration: dur.slow });
      if (inputWrapRef.current) animate(inputWrapRef.current, { translateY: [4, 0], opacity: [0, 1], ease: ease.out, duration: dur.base, delay: 150 });
      if (btnRef.current) animate(btnRef.current, { scale: [0.92, 1], opacity: [0, 1], ease: spring({ bounce: 0.25 }), duration: dur.base, delay: 280 });
      // Staggered content reveal
      const titleEl = cardRef.current?.querySelector('[data-anime="modal-title"]');
      const formEls = cardRef.current?.querySelectorAll('[data-anime="modal-form"]');
      const actionEls = cardRef.current?.querySelectorAll('[data-anime="modal-action"]');
      if (titleEl) animate(titleEl, { opacity: [0, 1], translateY: [12, 0], ease: ease.out, duration: dur.reveal });
      if (formEls?.length) animate(formEls, { opacity: [0, 1], translateY: [12, 0], ease: ease.out, duration: dur.base, delay: stagger(dur.fast * 0.5, { from: 0, ease: ease.out }) });
      if (actionEls?.length) animate(actionEls, { opacity: [0, 1], translateY: [12, 0], ease: ease.out, duration: dur.base, delay: 200 });
      setTimeout(() => inputRef.current?.focus(), 350);
    });
  }, [visible]);

  // Cleanup fingerprint animation on unmount
  useEffect(() => {
    if (!visible) {
      animatedRef.current = false;
      if (fpAnimRef.current && typeof fpAnimRef.current === 'object') {
        try { (fpAnimRef.current as any).pause?.(); } catch { /* ignore */ }
        fpAnimRef.current = null;
      }
    }
  }, [visible]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setLocalError('Enter a username');
      if (inputWrapRef.current) animate(inputWrapRef.current, { translateX: [0, -4, 4, -2, 2, 0], ease: ease.out, duration: 300 });
      return;
    }
    if (username.trim().length < 3) { setLocalError('At least 3 characters'); return; }
    if (username.trim().length > 20) { setLocalError('20 characters max'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) { setLocalError('Only letters, numbers, _ and -'); return; }

    setSubmitting(true);
    setLocalError(null);

    try {
      // Start fingerprint scanning animation
      setFingerprintPhase('scanning');
      if (fingerprintRingRef.current) {
        // Cancel any previous fingerprint animation
        if (fpAnimRef.current && typeof fpAnimRef.current === 'object') {
          try { (fpAnimRef.current as any).pause?.(); } catch { /* ignore */ }
        }
        fpAnimRef.current = safeAnimate(fingerprintRingRef.current, presets.fingerprintScan());
      }

      const result = isSignUp ? await signUp(username.trim()) : await signIn(username.trim());
      if (result.success) {
        // Fingerprint success animation
        setFingerprintPhase('success');
        if (fpAnimRef.current && typeof fpAnimRef.current === 'object') {
          try { (fpAnimRef.current as any).pause?.(); } catch { /* ignore */ }
          fpAnimRef.current = null;
        }
        if (fingerprintRingRef.current) {
          safeAnimate(fingerprintRingRef.current, presets.fingerprintSuccess());
        }
        if (checkmarkRef.current) {
          safeAnimate(checkmarkRef.current, presets.fingerprintCheckmark());
        }

        setSuccess(true);
        if (cardRef.current) animate(cardRef.current, { scale: [1, 1.005, 1], ease: spring({ bounce: 0.2 }), duration: dur.base });
        setTimeout(() => {
          if (overlayRef.current) {
            animate(overlayRef.current, { opacity: [1, 0], ease: ease.out, duration: dur.base }).then(() => {
              setShowUsernameModal(false);
            });
          }
        }, 800);
      } else {
        // Fingerprint fallback animation (shake)
        setFingerprintPhase('fallback');
        if (fpAnimRef.current && typeof fpAnimRef.current === 'object') {
          try { (fpAnimRef.current as any).pause?.(); } catch { /* ignore */ }
          fpAnimRef.current = null;
        }
        if (fingerprintRingRef.current) {
          safeAnimate(fingerprintRingRef.current, presets.fingerprintShake());
        }
        setLocalError(result.error || 'Something went wrong');
        if (inputWrapRef.current) animate(inputWrapRef.current, { translateX: [0, -4, 4, -2, 2, 0], ease: ease.out, duration: 250 });
        setTimeout(() => setFingerprintPhase('idle'), 800);
      }
    } catch {
      setFingerprintPhase('fallback');
      if (fpAnimRef.current && typeof fpAnimRef.current === 'object') {
        try { (fpAnimRef.current as any).pause?.(); } catch { /* ignore */ }
        fpAnimRef.current = null;
      }
      if (fingerprintRingRef.current) {
        safeAnimate(fingerprintRingRef.current, presets.fingerprintShake());
      }
      setLocalError('Connection error');
      setTimeout(() => setFingerprintPhase('idle'), 800);
    } finally {
      setSubmitting(false);
    }
  }, [username, isSignUp, signUp, signIn, setShowUsernameModal]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      style={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) setShowUsernameModal(false); }}
    >
      <div ref={cardRef} style={{ opacity: 0 }} className="w-full max-w-sm glass-card rounded-lg p-5">
        <div className="flex items-center justify-center mb-3">
          <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Gamepad2 size={16} className="text-primary/70" />
          </div>
        </div>

        <h2 data-anime="modal-title" className="text-sm font-bold text-center text-foreground tracking-tight" style={{ opacity: 0 }}>
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        <p data-anime="modal-form" className="text-[10px] text-muted-foreground/40 text-center mt-1 mb-4" style={{ opacity: 0 }}>
          {isSignUp ? 'Pick a username. Your device is your key.' : 'Sign in from a trusted device.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div ref={inputWrapRef} data-anime="modal-form" style={{ opacity: 0 }}>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/20" />
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
                className="w-full h-9 pl-8 pr-3 rounded-md border border-border bg-card text-foreground text-xs placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary/25 focus:ring-1 focus:ring-primary/10 transition-colors"
              />
            </div>
          </div>

          {(localError || error) && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle size={12} className="text-destructive" />
              <p className="text-[10px] text-destructive">{localError || error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
              <Check size={12} className="text-primary" />
              <p className="text-[10px] text-primary">Welcome!</p>
            </div>
          )}

          <button
            ref={btnRef}
            data-anime="modal-action"
            type="submit"
            disabled={submitting || !username.trim() || isLoading}
            style={{ opacity: 0 }}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 disabled:opacity-35 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" />{isSignUp ? 'Creating...' : 'Signing in...'}</>
            ) : success ? (
              <><Check size={14} />Ready</>
            ) : (
              <>{isSignUp ? 'Create Account' : 'Sign In'}</>
            )}
          </button>
        </form>

        <div data-anime="modal-action" className="mt-2.5 text-center" style={{ opacity: 0 }}>
          <button onClick={() => {
            const cardEl = cardRef.current;
            if (!cardEl) {
              setIsSignUp(!isSignUp);
              setLocalError(null);
              return;
            }
            // Animate card out then back in for smooth toggle
            safeAnimate(cardEl, {
              scale: [1, 0.97],
              opacity: [1, 0.6],
              duration: 150,
              ease: 'in(3)',
            });
            // Toggle after brief visual feedback
            setTimeout(() => {
              setIsSignUp(!isSignUp);
              setLocalError(null);
              // Wait for React re-render then animate back
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const refreshedCard = cardRef.current;
                  if (!refreshedCard) return;
                  safeAnimate(refreshedCard, presets.modalEnter());
                  // Re-run staggered content
                  const formEls = refreshedCard.querySelectorAll('[data-anime="modal-form"]');
                  const actionEls = refreshedCard.querySelectorAll('[data-anime="modal-action"]');
                  const titleEl = refreshedCard.querySelector('[data-anime="modal-title"]');
                  if (titleEl) safeAnimate(titleEl, { opacity: [0, 1], translateY: [8, 0], duration: 250, ease: 'out(3)' });
                  if (formEls?.length) safeAnimate(formEls, { opacity: [0, 1], translateY: [8, 0], duration: 250, delay: stagger(60, { from: 0 }), ease: 'out(3)' });
                  if (actionEls?.length) safeAnimate(actionEls, { opacity: [0, 1], translateY: [8, 0], duration: 250, delay: 120, ease: 'out(3)' });
                });
              });
            }, 160);
          }} className="text-[9px] text-muted-foreground/30 hover:text-foreground/50 transition-colors">
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {/* Fingerprint indicator with animated ring */}
        <div className="mt-3 flex items-center justify-center">
          <div className="relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/40">
            {/* Scanning ring */}
            <div className="relative">
              <div
                ref={fingerprintRingRef}
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors duration-300 ${
                  fingerprintPhase === 'scanning' ? 'border-primary/60' :
                  fingerprintPhase === 'success' ? 'border-green-500/60' :
                  fingerprintPhase === 'fallback' ? 'border-destructive/60' :
                  'border-primary/20'
                }`}
                style={{ borderWidth: '1.5px' }}
              >
                {fingerprintPhase === 'success' && (
                  <div ref={checkmarkRef} className="absolute inset-0 flex items-center justify-center">
                    <Check size={8} className="text-green-500" />
                  </div>
                )}
                {fingerprintPhase === 'fallback' && (
                  <AlertCircle size={8} className="text-destructive" />
                )}
                {fingerprintPhase === 'idle' && (
                  <Fingerprint size={8} className="text-primary/40" />
                )}
                {fingerprintPhase === 'scanning' && (
                  <Fingerprint size={8} className="text-primary/70" />
                )}
              </div>
            </div>
            <span className="text-[8px] text-muted-foreground/25 font-medium">
              {fingerprintPhase === 'scanning' ? 'Verifying device fingerprint...' :
               fingerprintPhase === 'success' ? 'Identity verified' :
               fingerprintPhase === 'fallback' ? 'Fallback to UUID' :
               'Passwordless · Fingerprint Secured'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
