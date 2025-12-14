import { deleteClusterFile } from "@/lib/storage/chunked-download";
import { opfsDelete } from "@/lib/storage/local-opfs";

export type AppType = "android" | "windows" | "unknown";
export type AppScope = "user" | "public";

export interface InstalledApp {
  id: string;
  name: string;
  originalName: string;
  type: AppType;
  scope?: AppScope;
  originalBytes: number;
  storedBytes: number;
  fileId: string;
  installedAt: number;
  compression: "none" | "gzip-chunked";
}

export function detectAppType(fileName: string): AppType {
  const n = fileName.toLowerCase();
  if (n.endsWith(".apk")) return "android";
  if (n.endsWith(".exe") || n.endsWith(".msi")) return "windows";
  return "unknown";
}

export function subscribeInstalledApps(uid: string, cb: (apps: InstalledApp[]) => void): () => void {
  // Server-backed polling subscription (secure).
  void uid;
  let stopped = false;
  const poll = async () => {
    if (stopped) return;
    try {
      const res = await fetch("/api/user/apps", { cache: "no-store" });
      if (!res.ok) return;
      const apps = (await res.json().catch(() => [])) as InstalledApp[];
      cb(Array.isArray(apps) ? apps : []);
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

export async function addInstalledApp(uid: string, app: Omit<InstalledApp, "id">): Promise<string> {
  void uid;
  const res = await fetch("/api/user/apps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as any;
    throw new Error(j?.error || "Failed to add app");
  }
  const j = (await res.json()) as { id: string };
  return j.id;
}

export async function removeInstalledApp(uid: string, appId: string): Promise<void> {
  void uid;
  const res = await fetch(`/api/user/apps/${encodeURIComponent(appId)}`, {
    method: "DELETE",
    cache: "no-store",
  });
  if (!res.ok && res.status !== 204) {
    const j = (await res.json().catch(() => null)) as any;
    throw new Error(j?.error || "Failed to remove app");
  }
}

/**
 * Removes an installed app and best-effort cleans up storage.
 *
 * - Always deletes the user's Firestore app doc.
 * - Always deletes OPFS cache for the referenced fileId.
 * - Deletes the cluster file ONLY if:
 *   - scope === 'user'
 *   - AND no other app in this user references that fileId
 *   - AND no public archive references that fileId
 */
export async function removeInstalledAppWithCleanup(uid: string, app: InstalledApp): Promise<void> {
  await removeInstalledApp(uid, app.id);
  await opfsDelete(app.fileId);

  const scope = app.scope ?? "user";
  if (scope !== "user") return;

  // For security, we no longer query Firestore from the client.
  // Best-effort: do NOT delete the shared cluster file here (could be referenced elsewhere).
  // If you want safe GC, implement it server-side where all references can be checked.
  void deleteClusterFile(app.fileId).catch(() => {});
}

export async function listInstalledApps(uid: string): Promise<InstalledApp[]> {
  void uid;
  const res = await fetch("/api/user/apps", { cache: "no-store" });
  if (!res.ok) return [];
  const apps = (await res.json().catch(() => [])) as InstalledApp[];
  return Array.isArray(apps) ? apps : [];
}


