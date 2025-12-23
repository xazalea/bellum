import { getNachoIdentity } from '@/lib/auth/nacho-identity';

export type User = { uid: string; username?: string | null };
export type AuthDiagnostics = { unavailable: boolean; code?: string; message?: string };

class AuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];
  private diagnostics: AuthDiagnostics = { unavailable: false };
  private diagnosticsListeners: ((d: AuthDiagnostics) => void)[] = [];

  constructor() {
    if (typeof window === 'undefined') return;
    // Fingerprint-based identity (no Firebase Auth providers).
    void this.ensureIdentity();
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

  // Claim a human-readable username for this fingerprint.
  async claimUsername(username: string): Promise<User> {
    const usernameNorm = username.trim().toLowerCase();
    
    // Pass current fingerprint so server can authorize/link
    const id = await getNachoIdentity();
    const headers = { 
      'Content-Type': 'application/json',
      'X-Nacho-UserId': id.uid
    };

    const res = await fetch('/api/user/account', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'create', username: usernameNorm }),
    });

    const j = await res.json();
    if (!res.ok) {
      throw new Error(j.error || 'Failed to claim username');
    }

    // Update local state
    const currentId = await getNachoIdentity();
    currentId.username = usernameNorm;
    const user: User = { uid: currentId.uid, username: usernameNorm };
    this.currentUser = user;
    this.listeners.forEach((l) => l(user));
    return user;
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

  // Ensure an identity exists (silent, no UI).
  async ensureIdentity(): Promise<User> {
    const existing = this.currentUser;
    if (existing) return existing;
    try {
      const id = await getNachoIdentity();
      const user: User = { uid: id.uid, username: id.username };
      this.currentUser = user;
      this.listeners.forEach((l) => l(user));
      this.setDiagnostics({ unavailable: false });
      return user;
    } catch (e: any) {
      this.setDiagnostics({ unavailable: true, code: 'identity_failed', message: e?.message || 'Identity failed' });
      throw e;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    this.currentUser = null;
    this.listeners.forEach((l) => l(null));
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
