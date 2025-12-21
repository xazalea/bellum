"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { User, Users, UserPlus, Check, X, Shield, LogOut, AtSign } from "lucide-react";
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
  const [accountUsername, setAccountUsername] = useState("");
  const [accountCodeInput, setAccountCodeInput] = useState("");
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [pendingChallenge, setPendingChallenge] = useState(false);
  const [displayedChallenge, setDisplayedChallenge] = useState<{ code: string; expiresAt: number } | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);

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

  const ensureIdentity = async () => {
    if (user) return user;
    const u = await authService.ensureIdentity();
    setUser(u);
    return u;
  };

  const handleAccountResponse = (message: string) => {
    setAccountMessage(message);
    setAccountError(null);
  };

  const handleAccountError = (message: string) => {
    setAccountError(message);
    setAccountMessage(null);
  };

  const accountAction = async (action: "create" | "signin" | "verify") => {
    if (accountBusy) return;
    const username = accountUsername.trim().toLowerCase();
    if (!username) {
      handleAccountError("Enter a username.");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      handleAccountError("Usernames must be 3-20 chars (a-z, 0-9, underscore).");
      return;
    }
    setAccountBusy(true);
    setAccountMessage(null);
    setAccountError(null);
    try {
      await ensureIdentity();
      const payload: Record<string, unknown> = { action, username };
      if (action === "verify") {
        if (!accountCodeInput.trim()) {
          handleAccountError("Enter the code shown on your primary device.");
          return;
        }
        payload.code = accountCodeInput.trim();
      }
      const res = await fetch("/api/user/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        handleAccountError(json?.error || `Failed (${res.status})`);
        return;
      }
      if (json.status === "created") {
        handleAccountResponse("Account created. Your username is linked to this device.");
        setAccountCodeInput("");
        return;
      }
      if (json.status === "ok") {
        handleAccountResponse("Signed in successfully.");
        setPendingChallenge(false);
        setAccountCodeInput("");
        return;
      }
      if (json.status === "challenge_created") {
        handleAccountResponse("A code was generated. Check your primary device to view it.");
        setPendingChallenge(true);
        return;
      }
      handleAccountResponse("Action completed.");
    } catch (e: any) {
      handleAccountError(e?.message || "Account service failed");
    } finally {
      setAccountBusy(false);
    }
  };

  useEffect(() => {
    if (!userUid || !profile?.handle) {
      setDisplayedChallenge(null);
      return;
    }
    let cancelled = false;
    const fetchChallenge = async () => {
      try {
        const res = await fetch(`/api/user/account/challenge?username=${encodeURIComponent(profile.handle)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setDisplayedChallenge(null);
          return;
        }
        const data = (await res.json()) as { code?: string | null; expiresAt?: number };
        if (cancelled) return;
        if (data.code && typeof data.expiresAt === "number") {
          setDisplayedChallenge({ code: data.code, expiresAt: data.expiresAt });
        } else {
          setDisplayedChallenge(null);
        }
      } catch {
        if (!cancelled) setDisplayedChallenge(null);
      }
    };
    void fetchChallenge();
    const interval = window.setInterval(() => {
      void fetchChallenge();
    }, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userUid, profile?.handle]);

  const friendNames = useMemo(() => {
    return friends
      .map((f) => (Array.isArray((f as any).handles) ? (f as any).handles : (f.users as any)))
      .flat()
      .filter((x: any) => typeof x === "string" && x)
      .filter((x: any) => x !== profile?.handle)
      .sort();
  }, [friends, profile?.handle]);

  const doContinue = async () => {
    setBusy(true);
    setError(null);
    setAuthMessage(null);
    try {
      await authService.ensureIdentity();
      setAuthMessage("Identity established.");
    } catch (e: any) {
      setError(e?.message || "Failed to establish identity");
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
      setAuthMessage("Identity cleared.");
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

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bellum-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="text-cyan-300" />
          <div className="font-bold text-lg">Device-linked account</div>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <input
            className="bellum-input flex-1"
            placeholder="username (create/sign-in)"
            value={accountUsername}
            onChange={(e) => setAccountUsername(e.target.value)}
          />
          <button
            type="button"
            disabled={accountBusy}
            onClick={() => void accountAction("create")}
            className="px-4 py-2 rounded-xl border-2 border-white/15 bg-white/5 hover:border-white/35 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm disabled:opacity-50"
          >
            Create account
          </button>
          <button
            type="button"
            disabled={accountBusy}
            onClick={() => void accountAction("signin")}
            className="px-4 py-2 rounded-xl border-2 border-white/15 bg-white/5 hover:border-white/35 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm disabled:opacity-50"
          >
            Sign in
          </button>
        </div>
        {pendingChallenge && (
          <div className="mt-3 text-xs text-amber-200">
            A new device attempted to sign in. The code is shown on your primary device (below) for verification.
          </div>
        )}
        {accountMessage && (
          <div className="mt-3 text-sm font-semibold text-emerald-300">{accountMessage}</div>
        )}
        {accountError && <div className="mt-3 text-sm font-semibold text-rose-300">{accountError}</div>}
        <div className="mt-4 flex gap-2">
          <input
            className="bellum-input flex-1"
            placeholder="Enter code shown on first device"
            value={accountCodeInput}
            onChange={(e) => setAccountCodeInput(e.target.value)}
          />
          <button
            type="button"
            disabled={accountBusy}
            onClick={() => void accountAction("verify")}
            className="px-4 py-2 rounded-xl border-2 border-white/15 bg-white/5 hover:border-white/35 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm disabled:opacity-50"
          >
            Verify code
          </button>
        </div>
        {displayedChallenge && (
          <div className="mt-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80">
            <div className="font-semibold mb-1">Current code for {profile?.handle}</div>
            <div className="font-mono text-lg">{displayedChallenge.code}</div>
            <div className="text-[11px] text-white/60">
              Expires in {Math.max(0, Math.floor((displayedChallenge.expiresAt - Date.now()) / 1000))}s
            </div>
          </div>
        )}
      </motion.div>

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
              onClick={() => void doContinue()}
              className="px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <User size={16} />
              Continue
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

