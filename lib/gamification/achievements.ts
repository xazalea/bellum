export type AchievementId =
  | 'booted'
  | 'installed_app'
  | 'ran_app'
  | 'joined_cluster'
  | 'deployed_site'
  | 'opened_fabrik';

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
  points: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'booted', title: 'Boot Sequence', description: 'Open Nacho and initialize your device identity.', points: 10 },
  { id: 'installed_app', title: 'Collector', description: 'Install your first app.', points: 25 },
  { id: 'ran_app', title: 'First Launch', description: 'Run an app in the runner.', points: 25 },
  { id: 'joined_cluster', title: 'Node Online', description: 'Connect to the cluster and see active peers.', points: 40 },
  { id: 'opened_fabrik', title: 'Builder', description: 'Open Fabrik and explore hosting.', points: 20 },
  { id: 'deployed_site', title: 'Shipped', description: 'Deploy your first site with Fabrik.', points: 75 },
];

const KEY_PREFIX = 'bellum.achievement.';
const XP_KEY = 'bellum.xp';

function readBool(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeBool(key: string, v: boolean): void {
  try {
    window.localStorage.setItem(key, v ? '1' : '0');
  } catch {
    // ignore
  }
}

function readNumber(key: string): number {
  try {
    const n = Number(window.localStorage.getItem(key) || '0');
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeNumber(key: string, v: number): void {
  try {
    window.localStorage.setItem(key, String(v));
  } catch {
    // ignore
  }
}

export function isUnlocked(id: AchievementId): boolean {
  if (typeof window === 'undefined') return false;
  return readBool(KEY_PREFIX + id);
}

export function getXp(): number {
  if (typeof window === 'undefined') return 0;
  return readNumber(XP_KEY);
}

export function unlockAchievement(id: AchievementId): boolean {
  if (typeof window === 'undefined') return false;
  if (isUnlocked(id)) return false;

  const meta = ACHIEVEMENTS.find((a) => a.id === id);
  writeBool(KEY_PREFIX + id, true);
  if (meta) writeNumber(XP_KEY, getXp() + meta.points);

  try {
    window.dispatchEvent(new CustomEvent('bellum:achievement', { detail: { id } }));
  } catch {
    // ignore
  }

  return true;
}

export function subscribeAchievements(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener('storage', handler);
  window.addEventListener('bellum:achievement' as any, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('bellum:achievement' as any, handler);
  };
}

export function getAchievementProgress(): { unlocked: number; total: number; xp: number } {
  if (typeof window === 'undefined') return { unlocked: 0, total: ACHIEVEMENTS.length, xp: 0 };
  const unlocked = ACHIEVEMENTS.filter((a) => isUnlocked(a.id)).length;
  return { unlocked, total: ACHIEVEMENTS.length, xp: getXp() };
}
