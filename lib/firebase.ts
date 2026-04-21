import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { FIREBASE_CONFIG } from "./config/constants";

// Single source of truth: all Firebase config lives in lib/config/constants.ts
const firebaseConfig = FIREBASE_CONFIG;

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
