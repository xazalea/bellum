import type { User } from 'firebase/auth';
import { NACHO_STORAGE_LIMIT_BYTES } from '@/lib/storage/quota';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: any;
  lastLogin: any;
  gamesLibrary: string[];
  storageUsed: number;
  storageLimit: number;
}

export type AuthDiagnostics = {
  unavailable: boolean;
  code?: string;
  message?: string;
};

function ensureLocalUid(): string {
  if (typeof window === 'undefined') return 'local-guest';
  try {
    const key = 'nacho_local_uid';
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    return `local-${crypto.randomUUID()}`;
  }
}

function makeLocalGuestUser(): User {
  const uid = ensureLocalUid();
  const u = {
    uid,
    isAnonymous: true,
    getIdToken: async () => null,
  } as any;
  return u as User;
}

class AuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];
  private diagnostics: AuthDiagnostics = { unavailable: false };
  private diagnosticsListeners: ((d: AuthDiagnostics) => void)[] = [];

  constructor() {
    // IMPORTANT: This project’s primary identity model is username + device fingerprint.
    // We intentionally DO NOT depend on Firebase Authentication providers (including anonymous).
    //
    // A stable per-device session id is used as the “uid” for Firestore document paths.
    // Security must be enforced via server-side APIs OR open Firestore rules (dev-only).
    if (typeof window !== 'undefined') {
      this.currentUser = makeLocalGuestUser();
      queueMicrotask(() => this.listeners.forEach((l) => l(this.currentUser)));
    }
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
    throw new Error('Email/password sign-in is not supported in username+fingerprint mode.');
  }

  // Sign up with email/password
  async signUp(email: string, password: string, displayName?: string): Promise<User> {
    throw new Error('Email/password sign-up is not supported in username+fingerprint mode.');
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<User> {
    throw new Error('Google sign-in is not supported in username+fingerprint mode.');
  }

  // Ensure a local session exists.
  // (Name kept for compatibility with existing call sites.)
  async signInAnonymously(): Promise<User> {
    const local = this.currentUser ?? makeLocalGuestUser();
    this.currentUser = local;
    this.listeners.forEach((l) => l(local));
    return local;
  }

  // Sign out
  async signOut(): Promise<void> {
    // Local-only auth: clearing local “uid” is equivalent to sign-out.
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem('nacho_local_uid');
    } catch {
      // ignore
    }
    const local = makeLocalGuestUser();
    this.currentUser = local;
    this.listeners.forEach((l) => l(local));
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get user profile from Firestore
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    // Client no longer reads Firestore directly (rules are locked down).
    // Keep a local-only placeholder so callers can degrade gracefully.
    try {
      const key = `nacho_profile_${uid}`;
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (!raw) return null;
      const j = JSON.parse(raw) as Partial<UserProfile>;
      return {
        uid,
        email: null,
        displayName: j.displayName ?? 'Guest User',
        createdAt: j.createdAt ?? null,
        lastLogin: j.lastLogin ?? null,
        gamesLibrary: Array.isArray(j.gamesLibrary) ? (j.gamesLibrary as any) : [],
        storageUsed: typeof j.storageUsed === 'number' ? j.storageUsed : 0,
        storageLimit: typeof j.storageLimit === 'number' ? j.storageLimit : NACHO_STORAGE_LIMIT_BYTES,
      };
    } catch {
      return null;
    }
  }

  // Update user profile
  private async updateUserProfile(user: User): Promise<void> {
    // No-op (server owns persistence).
  }

  // Add game to user's library
  async addGameToLibrary(gameId: string): Promise<void> {
    if (!this.currentUser) throw new Error('No user signed in');
    // Not supported in local-only mode.
    void gameId;
  }

  // Update storage usage
  async updateStorageUsage(bytes: number): Promise<void> {
    if (!this.currentUser) throw new Error('No user signed in');
    // Local-only cache for UI hints.
    try {
      const uid = this.currentUser.uid;
      const key = `nacho_profile_${uid}`;
      const profile = (await this.getUserProfile(uid)) || {
        uid,
        email: null,
        displayName: 'Guest User',
        createdAt: null,
        lastLogin: null,
        gamesLibrary: [],
        storageUsed: 0,
        storageLimit: NACHO_STORAGE_LIMIT_BYTES,
      };
      const next = { ...profile, storageUsed: bytes };
      if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
}

export const authService = new AuthService();
