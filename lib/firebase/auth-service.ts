import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { NACHO_STORAGE_LIMIT_BYTES } from '@/lib/storage/quota';
import { ensureNachoSettings } from '@/lib/cluster/settings';

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

function toFirebaseCode(e: any): string | undefined {
  const c = e?.code;
  return typeof c === 'string' ? c : undefined;
}

function isAuthMisconfigured(code?: string): boolean {
  // Common misconfig cases:
  // - Anonymous / Email not enabled
  // - Auth not set up for the project / wrong key + project pairing
  return (
    code === 'auth/configuration-not-found' ||
    code === 'auth/operation-not-allowed' ||
    code === 'auth/invalid-api-key' ||
    code === 'auth/project-not-found'
  );
}

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
    if (typeof window !== 'undefined') {
      // Guard: config.ts only initializes in browser; if something went wrong,
      // avoid throwing during app bootstrap and surface a clear diagnostics banner.
      if (!auth) {
        this.setDiagnostics({
          unavailable: true,
          code: 'auth/not-initialized',
          message: 'Firebase Auth is not initialized. Check your Firebase config.',
        });
        // Fall back to a local guest session so the UI can still load.
        this.currentUser = makeLocalGuestUser();
        queueMicrotask(() => this.listeners.forEach((l) => l(this.currentUser)));
        return;
      }

      // Enable persistence
      setPersistence(auth, browserLocalPersistence).catch((e) => {
        // Non-fatal; do not block app.
        console.warn('Auth persistence not available:', e);
      });

      // Listen to auth state changes
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        if (user) {
          await this.updateUserProfile(user);
          await ensureNachoSettings(user.uid);
        }
        this.listeners.forEach(listener => listener(user));
      });
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
    if (!auth) throw new Error('Firebase Auth is not initialized.');
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  // Sign up with email/password
  async signUp(email: string, password: string, displayName?: string): Promise<User> {
    if (!auth) throw new Error('Firebase Auth is not initialized.');
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: displayName || null,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      gamesLibrary: [],
      storageUsed: 0,
      storageLimit: NACHO_STORAGE_LIMIT_BYTES
    });

    return user;
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<User> {
    if (!auth) throw new Error('Firebase Auth is not initialized.');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  // Sign in anonymously for guest access
  async signInAnonymously(): Promise<User> {
    if (!auth) {
      this.setDiagnostics({
        unavailable: true,
        code: 'auth/not-initialized',
        message:
          'Firebase Auth is not initialized. Add a Firebase web app config and restart the dev server.',
      });
      const local = makeLocalGuestUser();
      this.currentUser = local;
      this.listeners.forEach((l) => l(local));
      return local;
    }

    try {
      const result = await signInAnonymously(auth);
      this.setDiagnostics({ unavailable: false });

      // Create anonymous user profile (best-effort).
      try {
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: null,
          displayName: 'Guest User',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          gamesLibrary: [],
          storageUsed: 0,
          storageLimit: NACHO_STORAGE_LIMIT_BYTES
        });
      } catch {
        // ignore (rules may require auth / quota)
      }

      return result.user;
    } catch (e: any) {
      const code = toFirebaseCode(e);
      if (isAuthMisconfigured(code)) {
        this.setDiagnostics({
          unavailable: true,
          code,
          message:
            'Firebase Auth is not configured for this project. Enable Authentication providers (at least Anonymous) in Firebase Console → Authentication → Sign-in method.',
        });
        const local = makeLocalGuestUser();
        this.currentUser = local;
        this.listeners.forEach((l) => l(local));
        return local;
      }
      throw e;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    if (!auth) return;
    await firebaseSignOut(auth);
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
    if (!db) return null;
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  }

  // Update user profile
  private async updateUserProfile(user: User): Promise<void> {
    if (!db) return;
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      // Update last login
      const data = userDoc.data() as any;
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        storageLimit: typeof data.storageLimit === 'number' ? data.storageLimit : NACHO_STORAGE_LIMIT_BYTES
      });
    } else {
      // Create profile if it doesn't exist
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        gamesLibrary: [],
        storageUsed: 0,
        storageLimit: NACHO_STORAGE_LIMIT_BYTES
      });
    }
  }

  // Add game to user's library
  async addGameToLibrary(gameId: string): Promise<void> {
    if (!this.currentUser) throw new Error('No user signed in');
    if (!db) throw new Error('Firestore not initialized');
    
    const userRef = doc(db, 'users', this.currentUser.uid);
    const profile = await this.getUserProfile(this.currentUser.uid);
    
    if (profile && !profile.gamesLibrary.includes(gameId)) {
      await updateDoc(userRef, {
        gamesLibrary: [...profile.gamesLibrary, gameId]
      });
    }
  }

  // Update storage usage
  async updateStorageUsage(bytes: number): Promise<void> {
    if (!this.currentUser) throw new Error('No user signed in');
    if (!db) throw new Error('Firestore not initialized');
    
    const userRef = doc(db, 'users', this.currentUser.uid);
    await updateDoc(userRef, {
      storageUsed: bytes
    });
  }
}

export const authService = new AuthService();
