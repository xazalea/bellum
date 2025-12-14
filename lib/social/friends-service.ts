export type FriendRequestStatus = "pending" | "accepted" | "declined";

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: FriendRequestStatus;
  createdAt: any;
  resolvedAt?: any;
}

export interface Friendship {
  id: string;
  users: [string, string];
  createdAt: any;
}

function normalizeHandle(input: string): string {
  const u = input.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(u)) {
    throw new Error("Handle must be 3–20 chars: a-z, 0-9, underscore.");
  }
  return u;
}

export async function sendFriendRequest(fromInput: string, toInput: string): Promise<void> {
  void fromInput;
  const to = normalizeHandle(toInput);
  const res = await fetch("/api/user/friends", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "send", to }),
  });
  if (!res.ok && res.status !== 204) {
    const j = (await res.json().catch(() => null)) as any;
    throw new Error(j?.error || "Failed to send request");
  }
}

export async function acceptFriendRequest(req: FriendRequest): Promise<void> {
  const res = await fetch("/api/user/friends", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "accept", requestId: req.id }),
  });
  if (!res.ok && res.status !== 204) {
    const j = (await res.json().catch(() => null)) as any;
    throw new Error(j?.error || "Failed to accept request");
  }
}

export async function declineFriendRequest(req: FriendRequest): Promise<void> {
  const res = await fetch("/api/user/friends", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "decline", requestId: req.id }),
  });
  if (!res.ok && res.status !== 204) {
    const j = (await res.json().catch(() => null)) as any;
    throw new Error(j?.error || "Failed to decline request");
  }
}

export function subscribeIncomingFriendRequests(usernameInput: string, cb: (items: FriendRequest[]) => void): () => void {
  // Server-backed polling subscription. `usernameInput` is kept for compatibility.
  void usernameInput;
  let stopped = false;
  const poll = async () => {
    if (stopped) return;
    try {
      const res = await fetch("/api/user/friends", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json().catch(() => null)) as { incoming?: FriendRequest[] } | null;
      cb(Array.isArray(j?.incoming) ? j!.incoming! : []);
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

export function subscribeFriends(usernameInput: string, cb: (items: Friendship[]) => void): () => void {
  void usernameInput;
  let stopped = false;
  const poll = async () => {
    if (stopped) return;
    try {
      const res = await fetch("/api/user/friends", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json().catch(() => null)) as { friends?: Friendship[] } | null;
      cb(Array.isArray(j?.friends) ? j!.friends! : []);
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

