import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import firebaseConfig from './config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Authentication
export const signInAnonymous = async (): Promise<User | null> => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('Anonymous sign-in error:', error);
    return null;
  }
};

// User data persistence
export interface UserGameData {
  id: string;
  name: string;
  type: string;
  optimizedSize: number;
  lastPlayed: Date;
  playtime: number;
  metadata: any;
  iconUrl?: string; // URL to the game icon
}

export class FirebaseService {
  private currentUser: User | null = null;

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
  }

  // Save game data
  async saveGameData(gameId: string, data: UserGameData): Promise<void> {
    if (!this.currentUser) return;

    try {
      const gameRef = doc(db, 'users', this.currentUser.uid, 'games', gameId);
      await setDoc(gameRef, {
        ...data,
        lastPlayed: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error saving game data:', error);
    }
  }

  // Load user's games
  async loadUserGames(): Promise<UserGameData[]> {
    if (!this.currentUser) return [];

    try {
      const gamesRef = collection(db, 'users', this.currentUser.uid, 'games');
      const gamesSnap = await getDocs(gamesRef);

      const games: UserGameData[] = [];
      gamesSnap.forEach((doc) => {
        games.push(doc.data() as UserGameData);
      });
      
      return games.filter(g => !(g as any).deleted);
    } catch (error) {
      console.error('Error loading user games:', error);
      return [];
    }
  }

  // Upload optimized game file
  async uploadGameFile(gameId: string, file: File): Promise<string | null> {
    if (!this.currentUser) return null;

    try {
      const storageRef = ref(storage, `users/${this.currentUser.uid}/games/${gameId}/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading game file:', error);
      return null;
    }
  }

  // Update game playtime
  async updatePlaytime(gameId: string, additionalTime: number): Promise<void> {
    if (!this.currentUser) return;

    try {
      const gameRef = doc(db, 'users', this.currentUser.uid, 'games', gameId);
      const gameSnap = await getDoc(gameRef);

      if (gameSnap.exists()) {
        const currentData = gameSnap.data();
        const currentPlaytime = currentData.playtime || 0;

        await updateDoc(gameRef, {
          playtime: currentPlaytime + additionalTime,
          lastPlayed: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating playtime:', error);
    }
  }

  // Delete game data
  async deleteGame(gameId: string): Promise<void> {
    if (!this.currentUser) return;

    try {
      // Delete from Firestore
      const gameRef = doc(db, 'users', this.currentUser.uid, 'games', gameId);
      await setDoc(gameRef, { deleted: true }, { merge: true });

      // Delete files from Storage (you might want to list and delete all files in the game folder)
      // This is simplified - in production you'd want to list all files first
    } catch (error) {
      console.error('Error deleting game:', error);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}

export const firebaseService = new FirebaseService();