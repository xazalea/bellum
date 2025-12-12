import { collection, doc, onSnapshot, setDoc, deleteDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export type AppType = "android" | "windows" | "unknown";

export interface InstalledApp {
  id: string;
  name: string;
  originalName: string;
  type: AppType;
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

export async function listInstalledApps(uid: string): Promise<InstalledApp[]> {
  const snap = await getDocs(appsCol(uid));
  const apps: InstalledApp[] = [];
  snap.forEach((d) => apps.push({ id: d.id, ...(d.data() as any) }));
  return apps;
}

