import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function required(name: string, v: string | undefined): string {
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function ensureAdminApp(): App {
  if (!getApps().length) {
    const projectId = required('FIREBASE_ADMIN_PROJECT_ID', process.env.FIREBASE_ADMIN_PROJECT_ID);
    const clientEmail = required('FIREBASE_ADMIN_CLIENT_EMAIL', process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
    const privateKey = required('FIREBASE_ADMIN_PRIVATE_KEY', process.env.FIREBASE_ADMIN_PRIVATE_KEY).replace(/\\n/g, '\n');

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  // At this point at least one app exists.
  return getApps()[0]!;
}

export function getAdminDb() {
  const app = ensureAdminApp();
  return getFirestore(app);
}

export function getAdminAuth() {
  const app = ensureAdminApp();
  return getAuth(app);
}
