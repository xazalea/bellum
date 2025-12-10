import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBjrbAulLgYH8gCQO2GwPES3jk7sVmjQ3g",
  authDomain: "nachooooo.firebaseapp.com",
  projectId: "nachooooo",
  storageBucket: "nachooooo.firebasestorage.app",
  messagingSenderId: "704146905294",
  appId: "1:704146905294:web:b00f9b142ef90efc5b589f",
  measurementId: "G-0JH56QWXR3"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  // Only initialize if not already initialized
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Analytics only works in browser
  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.warn('Analytics not available:', e);
    }
  }
}

export { app, auth, db, storage, analytics };
