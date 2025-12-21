import { getFingerprint } from "@/lib/tracking";

export type NachoAuthResult =
  | { status: "ok"; username: string }
  | { status: "challenge"; username: string; challengeId: string; code: string; expiresAt: number };

function normalizeUsername(input: string): string {
  const u = input.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(u)) {
    throw new Error("Username must be 3–20 chars: a-z, 0-9, underscore.");
  }
  return u;
}

async function nachoFetch<T>(path: string, init: RequestInit & { json?: any } = {}): Promise<T> {
  const fp = await getFingerprint();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    "Content-Type": "application/json",
    "X-Nacho-Fingerprint": fp,
  };
  const res = await fetch(path, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as any;
    throw new Error(j?.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export function getCachedUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nacho_username");
}

export function setCachedUsername(username: string | null) {
  if (typeof window === "undefined") return;
  if (!username) localStorage.removeItem("nacho_username");
  else localStorage.setItem("nacho_username", username);
}

export async function signUpUsername(usernameInput: string): Promise<NachoAuthResult> {
  const username = normalizeUsername(usernameInput);
  const res = await nachoFetch<NachoAuthResult>("/api/nacho/auth/signup", {
    method: "POST",
    json: { username },
  });
  if (res.status === "ok") setCachedUsername(res.username);
  return res;
}

export async function signInUsername(usernameInput: string): Promise<NachoAuthResult> {
  const username = normalizeUsername(usernameInput);
  const res = await nachoFetch<NachoAuthResult>("/api/nacho/auth/signin", {
    method: "POST",
    json: { username },
  });
  if (res.status === "ok") setCachedUsername(res.username);
  return res;
}

export async function approveLoginCode(usernameInput: string, code: string): Promise<void> {
  const username = normalizeUsername(usernameInput);
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) throw new Error("Enter a 6-digit code.");
  await nachoFetch<void>("/api/nacho/auth/approve", {
    method: "POST",
    json: { username, code: normalizedCode },
  });
}

export async function isCurrentDeviceTrusted(usernameInput: string): Promise<boolean> {
  const username = normalizeUsername(usernameInput);
  const res = await nachoFetch<{ trusted: boolean }>("/api/nacho/auth/trusted", {
    method: "POST",
    json: { username },
  });
  return !!res.trusted;
}


