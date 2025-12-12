import { db } from "@/lib/firebase/config";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

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

function archivesCol() {
  return collection(db, "archives");
}

export function subscribePublicArchives(cb: (items: ArchiveEntry[]) => void): () => void {
  const q = query(archivesCol(), orderBy("publishedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const out: ArchiveEntry[] = [];
    snap.forEach((d) => out.push({ id: d.id, ...(d.data() as any) }));
    cb(out);
  });
}

export async function publishArchive(entry: Omit<ArchiveEntry, "id" | "publishedAt">): Promise<string> {
  const ref = await addDoc(archivesCol(), { ...entry, publishedAt: serverTimestamp() });
  return ref.id;
}

export async function deleteArchive(id: string): Promise<void> {
  await deleteDoc(doc(db, "archives", id));
}

