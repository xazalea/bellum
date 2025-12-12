import { authService } from "@/lib/firebase/auth-service";
import { db } from "@/lib/firebase/config";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { getDeviceFingerprintId } from "@/lib/auth/fingerprint";

export type NachoAuthResult =
  | { status: "ok"; username: string }
  | { status: "challenge"; username: string; challengeId: string; code: string; expiresAt: number };

export interface NachoAccount {
  username: string;
  primaryUid: string;
  trustedUids: string[];
  trustedFingerprints: string[];
  createdAt: any;
  lastLogin: any;
}

function normalizeUsername(input: string): string {
  const u = input.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(u)) {
    throw new Error("Username must be 3–20 chars: a-z, 0-9, underscore.");
  }
  return u;
}

function accountRef(username: string) {
  return doc(db, "accounts", username);
}

function challengesCol(username: string) {
  return collection(db, "accounts", username, "challenges");
}

function randCode(): string {
  // 6-digit numeric OTP (client-side; approval requires trusted device).
  return Math.floor(100000 + Math.random() * 900000).toString();
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

  // Ensure Firebase session exists (anonymous is fine).
  await authService.signInAnonymously();
  const user = authService.getCurrentUser();
  if (!user) throw new Error("Auth session not available");

  const fingerprint = await getDeviceFingerprintId();

  const ref = accountRef(username);
  const snap = await getDoc(ref);
  if (snap.exists()) throw new Error("Username already taken.");

  const account: NachoAccount = {
    username,
    primaryUid: user.uid,
    trustedUids: [user.uid],
    trustedFingerprints: [fingerprint],
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };

  await setDoc(ref, account, { merge: false });
  setCachedUsername(username);
  return { status: "ok", username };
}

export async function signInUsername(usernameInput: string): Promise<NachoAuthResult> {
  const username = normalizeUsername(usernameInput);

  await authService.signInAnonymously();
  const user = authService.getCurrentUser();
  if (!user) throw new Error("Auth session not available");

  const fingerprint = await getDeviceFingerprintId();

  const ref = accountRef(username);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found.");
  const acc = snap.data() as NachoAccount;

  const uidTrusted = Array.isArray(acc.trustedUids) && acc.trustedUids.includes(user.uid);
  const fpTrusted =
    Array.isArray(acc.trustedFingerprints) && acc.trustedFingerprints.includes(fingerprint);

  if (uidTrusted && fpTrusted) {
    await updateDoc(ref, { lastLogin: serverTimestamp() });
    setCachedUsername(username);
    return { status: "ok", username };
  }

  // New device: create OTP challenge to be approved from a trusted device.
  const code = randCode();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const ch = await addDoc(challengesCol(username), {
    code,
    status: "pending",
    requesterUid: user.uid,
    requesterFingerprint: fingerprint,
    createdAt: serverTimestamp(),
    expiresAt,
  });

  return { status: "challenge", username, challengeId: ch.id, code, expiresAt };
}

export async function approveLoginCode(usernameInput: string, code: string): Promise<void> {
  const username = normalizeUsername(usernameInput);
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) throw new Error("Enter a 6-digit code.");

  // Must be on a trusted session.
  await authService.signInAnonymously();
  const user = authService.getCurrentUser();
  if (!user) throw new Error("Auth session not available");

  const fingerprint = await getDeviceFingerprintId();

  const aRef = accountRef(username);
  const aSnap = await getDoc(aRef);
  if (!aSnap.exists()) throw new Error("Account not found");
  const acc = aSnap.data() as NachoAccount;

  const isTrusted =
    Array.isArray(acc.trustedUids) &&
    acc.trustedUids.includes(user.uid) &&
    Array.isArray(acc.trustedFingerprints) &&
    acc.trustedFingerprints.includes(fingerprint);

  if (!isTrusted) {
    throw new Error("This device is not trusted for that username.");
  }

  const q = query(challengesCol(username), where("status", "==", "pending"), where("code", "==", normalizedCode));
  const snaps = await getDocs(q);
  if (snaps.empty) throw new Error("Code not found or already used.");

  // Approve first matching pending challenge.
  const chSnap = snaps.docs[0];
  const data = chSnap.data() as any;
  const exp = typeof data.expiresAt === "number" ? data.expiresAt : 0;
  if (Date.now() > exp) {
    await updateDoc(chSnap.ref, { status: "expired", resolvedAt: serverTimestamp() });
    throw new Error("Code expired.");
  }

  const requesterUid = String(data.requesterUid || "");
  const requesterFingerprint = String(data.requesterFingerprint || "");
  if (!requesterUid || !requesterFingerprint) throw new Error("Invalid challenge.");

  await updateDoc(aRef, {
    trustedUids: arrayUnion(requesterUid),
    trustedFingerprints: arrayUnion(requesterFingerprint),
    lastLogin: serverTimestamp(),
  });
  await updateDoc(chSnap.ref, {
    status: "approved",
    approvedByUid: user.uid,
    approvedAt: serverTimestamp(),
    resolvedAt: serverTimestamp(),
  });
}

export async function isCurrentDeviceTrusted(usernameInput: string): Promise<boolean> {
  const username = normalizeUsername(usernameInput);
  await authService.signInAnonymously();
  const user = authService.getCurrentUser();
  if (!user) return false;

  const fingerprint = await getDeviceFingerprintId();
  const snap = await getDoc(accountRef(username));
  if (!snap.exists()) return false;
  const acc = snap.data() as NachoAccount;

  return (
    Array.isArray(acc.trustedUids) &&
    acc.trustedUids.includes(user.uid) &&
    Array.isArray(acc.trustedFingerprints) &&
    acc.trustedFingerprints.includes(fingerprint)
  );
}

