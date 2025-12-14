export interface NachoUserSettings {
  clusterParticipation: boolean;
}

const DEFAULT_SETTINGS: NachoUserSettings = {
  clusterParticipation: true,
};

export async function ensureNachoSettings(uid: string): Promise<void> {
  void uid;
  // Server initializes defaults on read.
  await fetch('/api/user/settings', { cache: 'no-store' }).catch(() => {});
}

export async function setClusterParticipation(uid: string, enabled: boolean): Promise<void> {
  void uid;
  await fetch('/api/user/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clusterParticipation: enabled }),
  });
}

export function onSettings(uid: string, cb: (settings: NachoUserSettings) => void): () => void {
  void uid;
  let stopped = false;
  const poll = async () => {
    if (stopped) return;
    try {
      const res = await fetch('/api/user/settings', { cache: 'no-store' });
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

