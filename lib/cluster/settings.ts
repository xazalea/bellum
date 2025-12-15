export interface NachoUserSettings {
  clusterParticipation: boolean;
}

const DEFAULT_SETTINGS: NachoUserSettings = {
  // Always-on: cluster participation is required for Fabrik + hosted sites.
  clusterParticipation: true,
};

export async function ensureNachoSettings(uid: string): Promise<void> {
  void uid;
  // Server initializes defaults on read.
  await fetch('/api/user/settings', { cache: 'no-store' }).catch(() => {});
}

export async function setClusterParticipation(uid: string, enabled: boolean): Promise<void> {
  void uid;
  void enabled;
  // Opt-out removed: cluster is always on.
}

export function onSettings(uid: string, cb: (settings: NachoUserSettings) => void): () => void {
  void uid;
  cb({ ...DEFAULT_SETTINGS });
  return () => {};
}

