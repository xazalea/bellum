import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
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

function appsCol(uid: string) {
  return collection(db, "users", uid, "apps");
}

export function detectAppType(fileName: string): AppType {
  const n = fileName.toLowerCase();
  if (n.endsWith(".apk")) return "android";
  if (n.endsWith(".exe") || n.endsWith(".msi")) return "windows";
  return "unknown";
}

export function subscribeInstalledApps(uid: string, cb: (apps: InstalledApp[]) => void): () => void {
  const q = query(appsCol(uid), orderBy("installedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const apps: InstalledApp[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<InstalledApp, "id">;
      apps.push({ id: d.id, ...data });
    });
    cb(apps);
  });
}

export async function addInstalledApp(uid: string, app: Omit<InstalledApp, "id">): Promise<string> {
  const ref = doc(appsCol(uid));
  await setDoc(ref, app, { merge: true });
  return ref.id;
}

export async function removeInstalledApp(uid: string, appId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "apps", appId));
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

  // Check if any other app in this user references same fileId.
  const otherAppsQ = query(
    collection(db, "users", uid, "apps"),
    where("fileId", "==", app.fileId),
    limit(1)
  );
  const otherApps = await getDocs(otherAppsQ);
  if (!otherApps.empty) return;

  // Check if it is referenced by any public archive.
  const archivesQ = query(collection(db, "archives"), where("fileId", "==", app.fileId), limit(1));
  const archives = await getDocs(archivesQ);
  if (!archives.empty) return;

  // Best-effort delete from cluster.
  await deleteClusterFile(app.fileId);
}

export async function listInstalledApps(uid: string): Promise<InstalledApp[]> {
  const snap = await getDocs(appsCol(uid));
  const apps: InstalledApp[] = [];
  snap.forEach((d) => apps.push({ id: d.id, ...(d.data() as any) }));
  return apps;
}


