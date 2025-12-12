import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebase/config';
import { db } from '@/lib/firebase/config';

export interface NachoUserSettings {
  clusterParticipation: boolean;
}

const DEFAULT_SETTINGS: NachoUserSettings = {
  clusterParticipation: true,
};

function settingsRef(uid: string) {
  return doc(db, 'users', uid, 'settings', 'main');
}

export async function ensureNachoSettings(uid: string): Promise<void> {
  const ref = settingsRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, DEFAULT_SETTINGS, { merge: true });
  }
}

export async function setClusterParticipation(uid: string, enabled: boolean): Promise<void> {
  await setDoc(settingsRef(uid), { clusterParticipation: enabled }, { merge: true });
}

export function onSettings(uid: string, cb: (settings: NachoUserSettings) => void): () => void {
  return onSnapshot(settingsRef(uid), (snap) => {
    const data = (snap.data() as Partial<NachoUserSettings>) || {};
    cb({
      clusterParticipation: typeof data.clusterParticipation === 'boolean' ? data.clusterParticipation : true,
    });
  });
}
