import { getCachedUsername } from '@/lib/auth/nacho-auth';
import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';

export interface NachoUserSettings {
  clusterParticipation: boolean;
}

const DEFAULT_SETTINGS: NachoUserSettings = {
  clusterParticipation: true,
};

async function headers() {
  const username = getCachedUsername();
  if (!username) throw new Error('Not signed in');
  const fp = await getDeviceFingerprintId();
  return { 'X-Nacho-Username': username, 'X-Nacho-Fingerprint': fp };
}

export async function ensureNachoSettings(uid: string): Promise<void> {
  // Server initializes defaults on read.
  await fetch('/api/user/settings', { headers: await headers() }).catch(() => {});
}

export async function setClusterParticipation(uid: string, enabled: boolean): Promise<void> {
  await fetch('/api/user/settings', {
    method: 'POST',
    headers: { ...(await headers()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ clusterParticipation: enabled }),
  });
}

export function onSettings(uid: string, cb: (settings: NachoUserSettings) => void): () => void {
  let stopped = false;
  const poll = async () => {
    if (stopped) return;
    try {
      const res = await fetch('/api/user/settings', { headers: await headers() });
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as Partial<NachoUserSettings> | null;
      cb({
        clusterParticipation: typeof data?.clusterParticipation === 'boolean' ? data.clusterParticipation : true,
      });
    } catch {
      // ignore
    }
  };
  void poll();
  const t = window.setInterval(() => void poll(), 5000);
  return () => {
    stopped = true;
    window.clearInterval(t);
  };
}

