import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

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

function normalizeUsername(input: string): string {
  const u = input.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(u)) {
    throw new Error("Username must be 3–20 chars: a-z, 0-9, underscore.");
  }
  return u;
}

function requestId(from: string, to: string) {
  return `${from}__${to}`;
}

function friendshipId(a: string, b: string) {
  const [x, y] = [a, b].sort();
  return `${x}__${y}`;
}

function requestsCol() {
  return collection(db, "friend_requests");
}

function friendshipsCol() {
  return collection(db, "friendships");
}

export async function sendFriendRequest(fromInput: string, toInput: string): Promise<void> {
  const from = normalizeUsername(fromInput);
  const to = normalizeUsername(toInput);
  if (from === to) throw new Error("You can't friend yourself.");

  // Idempotent: one pending request per (from,to).
  const ref = doc(db, "friend_requests", requestId(from, to));
  await setDoc(
    ref,
    {
      from,
      to,
      status: "pending" as const,
      createdAt: serverTimestamp(),
    },
    { merge: false },
  );
}

export async function acceptFriendRequest(req: FriendRequest): Promise<void> {
  const from = normalizeUsername(req.from);
  const to = normalizeUsername(req.to);

  // Create friendship doc (idempotent by sorted pair).
  const fRef = doc(db, "friendships", friendshipId(from, to));
  await setDoc(
    fRef,
    {
      users: [from, to].sort() as [string, string],
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  const rRef = doc(db, "friend_requests", req.id);
  await updateDoc(rRef, { status: "accepted", resolvedAt: serverTimestamp() });
}

export async function declineFriendRequest(req: FriendRequest): Promise<void> {
  const rRef = doc(db, "friend_requests", req.id);
  await updateDoc(rRef, { status: "declined", resolvedAt: serverTimestamp() });
}

export function subscribeIncomingFriendRequests(usernameInput: string, cb: (items: FriendRequest[]) => void): () => void {
  const username = normalizeUsername(usernameInput);
  const q = query(
    requestsCol(),
    where("to", "==", username),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    const out: FriendRequest[] = [];
    snap.forEach((d) => out.push({ id: d.id, ...(d.data() as any) }));
    cb(out);
  });
}

export function subscribeFriends(usernameInput: string, cb: (items: Friendship[]) => void): () => void {
  const username = normalizeUsername(usernameInput);
  const q = query(friendshipsCol(), where("users", "array-contains", username), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const out: Friendship[] = [];
    snap.forEach((d) => out.push({ id: d.id, ...(d.data() as any) }));
    cb(out);
  });
}

