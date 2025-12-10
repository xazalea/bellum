import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Analytics (only on client side)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, analytics };
