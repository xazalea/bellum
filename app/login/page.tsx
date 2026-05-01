'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useAnimeScope, animate, spring, ease, dur } from '@/lib/hooks/use-anime';
import { Gamepad2, User, AlertCircle, Check, Fingerprint } from 'lucide-react';

export default function LoginPage() {
  const { signUp, signIn, isLoading, user, isAuthenticated, error: authError } = useAuth();
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { root, run } = useAnimeScope();
  const animatedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    run(s => {
      s.add(self => {
        if (cardRef.current) {
          animate(cardRef.current, {
            scale: [0.96, 1], opacity: [0, 1],
            ease: spring({ bounce: 0.15, stiffness: 240, damping: 20 }),
            duration: dur.slow,
          });
        }
        if (titleRef.current) {
          animate(titleRef.current, {
            translateY: [6, 0], opacity: [0, 1],
            ease: ease.out, duration: dur.base, delay: 120,
          });
        }
        if (subtitleRef.current) {
          animate(subtitleRef.current, {
            translateY: [4, 0], opacity: [0, 1],
            ease: ease.out, duration: dur.base, delay: 200,
          });
        }
        if (inputWrapRef.current) {
          animate(inputWrapRef.current, {
            translateY: [4, 0], opacity: [0, 1],
            ease: ease.out, duration: dur.base, delay: 280,
          });
        }
        if (btnRef.current) {
          animate(btnRef.current, {
            scale: [0.92, 1], opacity: [0, 1],
            ease: spring({ bounce: 0.2, stiffness: 260, damping: 14 }),
            duration: dur.base, delay: 360,
          });
        }
      });
    });
    setTimeout(() => inputRef.current?.focus(), 500);
  }, [run]);

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
      const result = isSignUp ? await signUp(username.trim()) : await signIn(username.trim());
      if (result.success) {
        setSuccess(true);
        if (btnRef.current) animate(btnRef.current, { scale: [1, 1.02, 1], ease: spring({ bounce: 0.3 }), duration: dur.base });
        setTimeout(() => router.push('/dashboard'), 1000);
      } else {
        setLocalError(result.error || 'Something went wrong');
        if (inputWrapRef.current) animate(inputWrapRef.current, { translateX: [0, -4, 4, -2, 2, 0], ease: ease.out, duration: 250 });
      }
    } catch {
      setLocalError('Connection error');
    } finally {
      setSubmitting(false);
    }
  }, [username, isSignUp, signUp, signIn, router]);

  return (
    <div ref={root} className="min-h-screen flex items-center justify-center p-4">
      <div ref={cardRef} style={{ opacity: 0 }} className="w-full max-w-sm glass-card rounded-lg p-5">
        {/* Logo */}
        <div className="flex items-center justify-center mb-3">
          <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Gamepad2 size={16} className="text-primary/70" />
          </div>
        </div>

        <h2 ref={titleRef} style={{ opacity: 0 }} className="text-sm font-bold text-center text-foreground tracking-tight">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        <p ref={subtitleRef} style={{ opacity: 0 }} className="text-[10px] text-muted-foreground/40 text-center mt-1 mb-4">
          {isSignUp ? 'Pick a username. Your device is your key.' : 'Sign in from a trusted device.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div ref={inputWrapRef} style={{ opacity: 0 }}>
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

          {(localError || authError) && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle size={12} className="text-destructive" />
              <p className="text-[10px] text-destructive">{localError || authError}</p>
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
            type="submit"
            disabled={submitting || !username.trim() || isLoading}
            style={{ opacity: 0 }}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 disabled:opacity-35 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {submitting || isLoading ? (
              <><span className="w-3.5 h-3.5 border-2 border-primary-foreground/25 border-t-primary-foreground rounded-full animate-spin" />{isSignUp ? 'Creating...' : 'Signing in...'}</>
            ) : success ? (
              <><Check size={14} />Ready</>
            ) : (
              <>{isSignUp ? 'Create Account' : 'Sign In'}</>
            )}
          </button>
        </form>

        <div className="mt-2.5 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setLocalError(null); }}
            className="text-[9px] text-muted-foreground/30 hover:text-foreground/50 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border/40 mx-auto w-fit">
          <Fingerprint size={10} className="text-primary/30" />
          <span className="text-[8px] text-muted-foreground/25 font-medium">Passwordless · Fingerprint Secured</span>
        </div>
      </div>
    </div>
  );
}
