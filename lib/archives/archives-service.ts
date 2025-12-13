import { getCachedUsername } from "@/lib/auth/nacho-auth";
import { getDeviceFingerprintId } from "@/lib/auth/fingerprint";

export interface ArchiveEntry {
  id: string;
  name: string;
  originalName: string;
  type: "android" | "windows" | "unknown";
  fileId: string;
  originalBytes: number;
  storedBytes: number;
  publishedAt: any;
  publisherUid: string;
  compression: "none" | "gzip-chunked";
}

async function headersIfSignedIn(): Promise<Record<string, string>> {
  const username = getCachedUsername();
  if (!username) throw new Error("Not signed in");
  const fp = await getDeviceFingerprintId();
  return { "X-Nacho-Username": username, "X-Nacho-Fingerprint": fp };
}

export function subscribePublicArchives(cb: (items: ArchiveEntry[]) => void): () => void {
  let stopped = false;
  const poll = async () => {
    if (stopped) return;
    try {
      const res = await fetch("/api/archives");
      if (!res.ok) return;
      const items = (await res.json().catch(() => [])) as ArchiveEntry[];
      cb(Array.isArray(items) ? items : []);
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

export async function publishArchive(entry: Omit<ArchiveEntry, "id" | "publishedAt">): Promise<string> {
  const res = await fetch("/api/archives", {
    method: "POST",
    headers: { ...(await headersIfSignedIn()), "Content-Type": "application/json" },
    body: JSON.stringify({ entry }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as any;
    throw new Error(j?.error || "Publish failed");
  }
  const j = (await res.json()) as { id: string };
  return j.id;
}

export async function deleteArchive(id: string): Promise<void> {
  const res = await fetch(`/api/archives/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await headersIfSignedIn(),
  });
  if (!res.ok && res.status !== 204) {
    const j = (await res.json().catch(() => null)) as any;
    throw new Error(j?.error || "Delete failed");
  }
}


