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

class AuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      // Enable persistence
      setPersistence(auth, browserLocalPersistence).catch(console.error);

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

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  // Sign up with email/password
  async signUp(email: string, password: string, displayName?: string): Promise<User> {
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
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  // Sign in anonymously for guest access
  async signInAnonymously(): Promise<User> {
    const result = await signInAnonymously(auth);
    
    // Create anonymous user profile
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

    return result.user;
  }

  // Sign out
  async signOut(): Promise<void> {
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
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  }

  // Update user profile
  private async updateUserProfile(user: User): Promise<void> {
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
    
    const userRef = doc(db, 'users', this.currentUser.uid);
    await updateDoc(userRef, {
      storageUsed: bytes
    });
  }
}

export const authService = new AuthService();
