import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInAnonymously as firebaseSignInAnonymously, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type AuthDiagnostics = { unavailable: boolean; code?: string; message?: string };

async function establishServerSession(user: User): Promise<void> {
  const idToken = await user.getIdToken(/* forceRefresh */ true);
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as any;
    throw new Error(j?.error || `session_failed_${res.status}`);
  }
}

class AuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];
  private diagnostics: AuthDiagnostics = { unavailable: false };
  private diagnosticsListeners: ((d: AuthDiagnostics) => void)[] = [];

  constructor() {
    if (typeof window === 'undefined') return;
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      this.listeners.forEach((l) => l(user));
      if (!user) return;
      try {
        await establishServerSession(user);
        this.setDiagnostics({ unavailable: false });
      } catch (e: any) {
        this.setDiagnostics({ unavailable: true, code: 'session_failed', message: e?.message || 'Session establishment failed' });
      }
    });
  }

  private setDiagnostics(d: AuthDiagnostics) {
    this.diagnostics = d;
    this.diagnosticsListeners.forEach((cb) => cb(d));
  }

  getDiagnostics(): AuthDiagnostics {
    return this.diagnostics;
  }

  onDiagnosticsChange(cb: (d: AuthDiagnostics) => void): () => void {
    this.diagnosticsListeners.push(cb);
    cb(this.diagnostics);
    return () => {
      const i = this.diagnosticsListeners.indexOf(cb);
      if (i >= 0) this.diagnosticsListeners.splice(i, 1);
    };
  }

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<User> {
    void email;
    void password;
    throw new Error('Email/password sign-in not implemented yet.');
  }

  // Sign up with email/password
  async signUp(email: string, password: string, displayName?: string): Promise<User> {
    void email;
    void password;
    void displayName;
    throw new Error('Email/password sign-up not implemented yet.');
  }

  // Nacho identity is username + device fingerprint (no passwords).
  // We bootstrap a server-verified session silently using an anonymous token.
  async signInAnonymously(): Promise<User> {
    const res = await firebaseSignInAnonymously(auth);
    await establishServerSession(res.user);
    return res.user;
  }

  // Ensure an identity exists (silent, no UI).
  async ensureIdentity(): Promise<User> {
    const existing = this.currentUser;
    if (existing) return existing;
    return await this.signInAnonymously();
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch {
      // ignore
    }
    await firebaseSignOut(auth);
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    if (this.currentUser !== null) callback(this.currentUser);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // (Profile/storage/library live on the server now; client should call APIs.)
}

export const authService = new AuthService();
