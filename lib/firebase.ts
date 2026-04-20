import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBjrbAulLgYH8gCQO2GwPES3jk7sVmjQ3g",
  authDomain: "challengeroooo.firebaseapp.com",
  projectId: "challengeroooo",
  storageBucket: "challengeroooo.firebasestorage.app",
  messagingSenderId: "704146905294",
  appId: "1:704146905294:web:b00f9b142ef90efc5b589f",
  measurementId: "G-0JH56QWXR3"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Analytics — loaded lazily to avoid crashing edge/SSR builds.
// firebase/analytics references `document` at module level, which throws
// ReferenceError in non-browser environments.
let analytics: unknown = null;
if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then((mod) => mod.isSupported().then((supported) => supported ? mod : null))
    .then((mod) => {
      if (mod) analytics = mod.getAnalytics(app);
    })
    .catch(() => {
      // Analytics not available — non-critical
    });
}

export { app, auth, analytics };
