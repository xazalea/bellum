"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { User, Users, UserPlus, Check, X, Shield, LogIn, LogOut, AtSign } from "lucide-react";
import { authService } from "@/lib/firebase/auth-service";
import {
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  subscribeFriends,
  subscribeIncomingFriendRequests,
  type FriendRequest,
  type Friendship,
} from "@/lib/social/friends-service";

export function AccountPanel() {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const userUid = user?.uid ?? null;
  const [profile, setProfile] = useState<{ handle: string | null } | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const [friendHandle, setFriendHandle] = useState("");
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return authService.onAuthStateChange(setUser);
  }, []);

  useEffect(() => {
    if (!userUid) {
      setIncoming([]);
      setFriends([]);
      return;
    }
    const unsubIn = subscribeIncomingFriendRequests("me", setIncoming);
    const unsubFriends = subscribeFriends("me", setFriends);
    return () => {
      unsubIn();
      unsubFriends();
    };
  }, [userUid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userUid) {
        setProfile(null);
        setHandleInput("");
        return;
      }
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (!res.ok) throw new Error(res.status === 401 ? "Sign in required" : `Failed to load profile (${res.status})`);
        const j = (await res.json()) as { handle?: string | null };
        if (cancelled) return;
        const handle = typeof j?.handle === "string" ? j.handle : null;
        setProfile({ handle });
        setHandleInput(handle || "");
      } catch (e: any) {
        if (!cancelled) setProfile({ handle: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userUid]);

  const friendNames = useMemo(() => {
    return friends
      .map((f) => (Array.isArray((f as any).handles) ? (f as any).handles : (f.users as any)))
      .flat()
      .filter((x: any) => typeof x === "string" && x)
      .filter((x: any) => x !== profile?.handle)
      .sort();
  }, [friends, profile?.handle]);

  const doSignInGoogle = async () => {
    setBusy(true);
    setError(null);
    setAuthMessage(null);
    try {
      await authService.signInWithGoogle();
      setAuthMessage("Signed in.");
    } catch (e: any) {
      setError(e?.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const doSignInGuest = async () => {
    setBusy(true);
    setError(null);
    setAuthMessage(null);
    try {
      await authService.signInAnonymously();
      setAuthMessage("Signed in as guest.");
    } catch (e: any) {
      setError(e?.message || "Guest sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    setBusy(true);
    setError(null);
    setAuthMessage(null);
    try {
      await authService.signOut();
      setAuthMessage("Signed out.");
    } catch (e: any) {
      setError(e?.message || "Sign out failed");
    } finally {
      setBusy(false);
    }
  };

  const saveHandle = async () => {
    if (!user) {
      setError("Sign in required.");
      return;
    }
    setBusy(true);
    setError(null);
    setAuthMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handleInput.trim() || null }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any;
        throw new Error(j?.error || `Save failed (${res.status})`);
      }
      setProfile({ handle: handleInput.trim() ? handleInput.trim().toLowerCase() : null });
      setAuthMessage("Profile updated.");
    } catch (e: any) {
      setError(e?.message || "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  const doSend = async () => {
    if (!user) {
      setError("Sign in required to use friends.");
      return;
    }
    if (!profile?.handle) {
      setError("Set your handle first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendFriendRequest(profile.handle, friendHandle);
      setFriendHandle("");
    } catch (e: any) {
      setError(e?.message || "Failed to send request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-8 pt-24 min-h-screen">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <User className="text-blue-400" />
            Account
          </h2>
          <p className="text-white/40">
            {user ? (
              <span className="text-white/70">signed in</span>
            ) : (
              <span className="text-white/70">not signed in</span>
            )}
          </p>
          <p className="text-white/30 text-xs font-mono mt-1">
            uid: {user ? `${user.uid.slice(0, 10)}…` : "—"}
          </p>
          <p className="text-white/30 text-xs font-mono mt-1">handle: {profile?.handle ? profile.handle : "—"}</p>
        </div>
      </div>

      {error && (
        <div className="bellum-card p-4 mb-6 border-2 border-red-400/30 bg-red-500/10 text-red-200">
          {error}
        </div>
      )}

      {authMessage && (
        <div className="bellum-card p-4 mb-6 border-2 border-blue-400/30 bg-blue-500/10 text-blue-100">
          {authMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bellum-card p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-cyan-300" />
            <div className="font-bold text-lg">Authentication</div>
            <button
              type="button"
              onClick={() => void doSignOut()}
              disabled={busy || !user}
              className="ml-auto px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 text-xs font-bold inline-flex items-center gap-2 disabled:opacity-50"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void doSignInGoogle()}
              className="px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn size={16} />
              Sign in with Google
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void doSignInGuest()}
              className="px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <User size={16} />
              Continue as guest
            </button>
          </div>

          <div className="mt-6 rounded-xl border-2 border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 font-bold text-white">
              <AtSign size={16} className="text-white/70" />
              Your handle (for friends)
            </div>
            <div className="text-xs text-white/45 mt-1">Pick a unique handle: a-z, 0-9, underscore (3–20 chars).</div>
            <div className="mt-3 flex gap-2">
              <input className="bellum-input flex-1" placeholder="handle" value={handleInput} onChange={(e) => setHandleInput(e.target.value)} />
              <button
                type="button"
                disabled={busy || !user}
                onClick={() => void saveHandle()}
                className="px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bellum-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="text-blue-300" />
            <div className="font-bold text-lg">Add friend</div>
          </div>

          <div className="flex gap-3">
            <input
              className="bellum-input"
              placeholder="friend handle"
              value={friendHandle}
              onChange={(e) => setFriendHandle(e.target.value)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void doSend()}
              className="px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm"
            >
              Send
            </button>
          </div>

          {!user && (
            <div className="text-xs text-white/40 mt-3">
              Sign in and set a handle to use friends.
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bellum-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-purple-300" />
            <div className="font-bold text-lg">Incoming requests</div>
            <div className="ml-auto text-xs font-mono text-white/40">{incoming.length}</div>
          </div>

          <div className="space-y-3">
            {incoming.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-3 bg-white/5 border-2 border-white/10 rounded-xl p-3">
                <div className="text-sm">
                  <div className="font-bold text-white">{req.from}</div>
                  <div className="text-xs text-white/40 font-mono">request</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void acceptFriendRequest(req).catch((e: any) => setError(e?.message || "Accept failed"))}
                    className="p-2 rounded-xl border-2 border-white/10 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                    title="Accept"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void declineFriendRequest(req).catch((e: any) => setError(e?.message || "Decline failed"))}
                    className="p-2 rounded-xl border-2 border-white/10 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                    title="Decline"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}

            {incoming.length === 0 && (
              <div className="text-white/40 text-sm border-2 border-dashed border-white/10 rounded-xl p-4 text-center">
                No requests.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bellum-card p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-green-300" />
            <div className="font-bold text-lg">Friends</div>
            <div className="ml-auto text-xs font-mono text-white/40">{friendNames.length}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {friendNames.map((f) => (
              <div key={f} className="bg-white/5 border-2 border-white/10 rounded-xl p-3">
                <div className="font-bold">{f}</div>
                <div className="text-xs text-white/40 font-mono">ready for multiplayer</div>
              </div>
            ))}
            {friendNames.length === 0 && (
              <div className="text-white/40 text-sm border-2 border-dashed border-white/10 rounded-xl p-4 text-center col-span-full">
                No friends yet. Send a request.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

