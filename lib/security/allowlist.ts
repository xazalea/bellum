export type AllowlistPolicy = {
  enabled: boolean;
  /**
   * Domain / host patterns.
   * Supported:
   * - exact host: example.com
   * - wildcard subdomains: *.example.com
   * - exact origin: https://example.com (protocol + host)
   * - exact IPv4: 10.0.0.10
   */
  entries: string[];
  updatedAt: number;
};

const GLOBAL_KEY = 'bellum.allowlist.v1';
const ROOM_KEY_PREFIX = 'bellum.lan.allowlist.v1:';

function now() {
  return Date.now();
}

function normalizeEntry(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  // Don’t allow paths/query in entries. Keep scheme://host or host or ip.
  if (s.includes('://')) {
    try {
      const u = new URL(s);
      return `${u.protocol}//${u.host}`.toLowerCase();
    } catch {
      return '';
    }
  }
  return s.toLowerCase();
}

function defaultPolicy(): AllowlistPolicy {
  return { enabled: false, entries: [], updatedAt: now() };
}

function readFromStorage(key: string): AllowlistPolicy {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultPolicy();
    const j = JSON.parse(raw) as any;
    const entries = Array.isArray(j?.entries) ? j.entries.map(normalizeEntry).filter(Boolean) : [];
    return {
      enabled: !!j?.enabled,
      entries: entries.slice(0, 512),
      updatedAt: typeof j?.updatedAt === 'number' ? j.updatedAt : now(),
    };
  } catch {
    return defaultPolicy();
  }
}

function writeToStorage(key: string, p: AllowlistPolicy) {
  try {
    window.localStorage.setItem(key, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function getGlobalAllowlist(): AllowlistPolicy {
  if (typeof window === 'undefined') return defaultPolicy();
  return readFromStorage(GLOBAL_KEY);
}

export function setGlobalAllowlist(next: AllowlistPolicy) {
  if (typeof window === 'undefined') return;
  writeToStorage(GLOBAL_KEY, { ...next, updatedAt: now() });
}

export function getRoomAllowlist(roomId: string): AllowlistPolicy {
  if (typeof window === 'undefined') return defaultPolicy();
  const rid = String(roomId || '').trim();
  if (!rid) return defaultPolicy();
  return readFromStorage(ROOM_KEY_PREFIX + rid);
}

export function setRoomAllowlist(roomId: string, next: AllowlistPolicy) {
  if (typeof window === 'undefined') return;
  const rid = String(roomId || '').trim();
  if (!rid) return;
  writeToStorage(ROOM_KEY_PREFIX + rid, { ...next, updatedAt: now() });
}

export function addAllowlistEntry(roomId: string | null, entry: string): AllowlistPolicy {
  const e = normalizeEntry(entry);
  const cur = roomId ? getRoomAllowlist(roomId) : getGlobalAllowlist();
  if (!e) return cur;
  const set = new Set(cur.entries);
  set.add(e);
  const next: AllowlistPolicy = { ...cur, entries: Array.from(set).slice(0, 512), updatedAt: now() };
  if (roomId) setRoomAllowlist(roomId, next);
  else setGlobalAllowlist(next);
  return next;
}

export function removeAllowlistEntry(roomId: string | null, entry: string): AllowlistPolicy {
  const e = normalizeEntry(entry);
  const cur = roomId ? getRoomAllowlist(roomId) : getGlobalAllowlist();
  const next: AllowlistPolicy = { ...cur, entries: cur.entries.filter((x) => x !== e), updatedAt: now() };
  if (roomId) setRoomAllowlist(roomId, next);
  else setGlobalAllowlist(next);
  return next;
}

function hostMatches(host: string, pattern: string): boolean {
  if (!pattern) return false;
  if (pattern.startsWith('*.')) {
    const base = pattern.slice(2);
    return host === base || host.endsWith(`.${base}`);
  }
  return host === pattern;
}

export function isUrlAllowedByPolicy(url: string, policy: AllowlistPolicy): { allowed: boolean; reason?: string } {
  // Always allow same-origin and localhost-like internal surfaces.
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.href : undefined);

    // Always allow same origin (core platform).
    if (typeof window !== 'undefined' && u.origin === window.location.origin) return { allowed: true };

    const host = u.host.toLowerCase(); // includes port
    const hostname = u.hostname.toLowerCase(); // no port

    // Always allow localhost targets.
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return { allowed: true };

    // If not enabled, allow.
    if (!policy.enabled) return { allowed: true };

    // Allow private/local ranges that represent LOCALNET semantics.
    if (hostname.startsWith('10.0.0.')) return { allowed: true };
    if (hostname.startsWith('fc') || hostname.startsWith('fd')) return { allowed: true }; // ULA-style v6

    for (const raw of policy.entries) {
      const p = normalizeEntry(raw);
      if (!p) continue;
      if (p.includes('://')) {
        if (u.origin === p) return { allowed: true };
      } else {
        if (hostMatches(hostname, p) || hostMatches(host, p)) return { allowed: true };
      }
    }
    return { allowed: false, reason: 'blocked_by_allowlist' };
  } catch {
    // If URL is malformed, fail closed only when enabled.
    return policy.enabled ? { allowed: false, reason: 'malformed_url' } : { allowed: true };
  }
}

export function assertUrlAllowed(url: string, policy: AllowlistPolicy): void {
  const r = isUrlAllowedByPolicy(url, policy);
  if (!r.allowed) throw new Error(r.reason || 'blocked');
}







