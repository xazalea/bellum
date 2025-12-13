"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { User, Users, UserPlus, Check, X, Shield, KeyRound, LogOut } from "lucide-react";
import { authService } from "@/lib/firebase/auth-service";
import {
  approveLoginCode,
  getCachedUsername,
  isCurrentDeviceTrusted,
  setCachedUsername,
  signInUsername,
  signUpUsername,
} from "@/lib/auth/nacho-auth";
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
  const user = authService.getCurrentUser();
  const [username, setUsername] = useState<string | null>(() => getCachedUsername());
  const [trusted, setTrusted] = useState<boolean | null>(null);

  const [usernameInput, setUsernameInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const [friendUsername, setFriendUsername] = useState("");
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // keep username state synced across tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === "nacho_username") setUsername(getCachedUsername());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!username) return;
    const unsubIn = subscribeIncomingFriendRequests(username, setIncoming);
    const unsubFriends = subscribeFriends(username, setFriends);
    return () => {
      unsubIn();
      unsubFriends();
    };
  }, [username]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!username) {
        setTrusted(null);
        return;
      }
      try {
        const ok = await isCurrentDeviceTrusted(username);
        if (!cancelled) setTrusted(ok);
      } catch {
        if (!cancelled) setTrusted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const friendNames = useMemo(() => {
    if (!username) return [];
    return friends
      .map((f) => f.users.find((u) => u !== username) || "")
      .filter(Boolean)
      .sort();
  }, [friends, username]);

  const refreshUsername = () => {
    const u = getCachedUsername();
    setUsername(u);
    if (!u) setTrusted(null);
  };

  const doSignUp = async () => {
    setBusy(true);
    setError(null);
    setAuthMessage(null);
    try {
      const res = await signUpUsername(usernameInput);
      if (res.status === "ok") {
        setAuthMessage(`Username set: ${res.username}`);
        setUsernameInput("");
        refreshUsername();
      } else {
        // Sign-up currently never returns challenge, but keep for completeness.
        setAuthMessage(`Challenge created: ${res.code} (expires soon)`);
      }
    } catch (e: any) {
      setError(e?.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  const doSignIn = async () => {
    setBusy(true);
    setError(null);
    setAuthMessage(null);
    try {
      const res = await signInUsername(usernameInput);
      if (res.status === "ok") {
        setAuthMessage(`Signed in: ${res.username}`);
        setUsernameInput("");
        refreshUsername();
      } else {
        setAuthMessage(
          `New device detected. Ask a trusted device to approve code: ${res.code} (expires in ~5 min)`,
        );
      }
    } catch (e: any) {
      setError(e?.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const doApprove = async () => {
    if (!username) {
      setError("Set your username first.");
      return;
    }
    setBusy(true);
    setError(null);
    setAuthMessage(null);
    try {
      await approveLoginCode(username, otpInput);
      setAuthMessage("Approved. The new device is now trusted.");
      setOtpInput("");
    } catch (e: any) {
      setError(e?.message || "Approval failed");
    } finally {
      setBusy(false);
    }
  };

  const doSignOutUsername = () => {
    setCachedUsername(null);
    refreshUsername();
    setAuthMessage("Signed out (username cleared on this device).");
  };

  const doSend = async () => {
    if (!username) {
      setError("Create/sign-in to a username to use friends.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendFriendRequest(username, friendUsername);
      setFriendUsername("");
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
            {username ? (
              <>
                signed in as <span className="text-white/80 font-mono">{username}</span>
              </>
            ) : (
              "guest mode (no username set)"
            )}
          </p>
          <p className="text-white/30 text-xs font-mono mt-1">
            session: {user ? `${user.uid.slice(0, 8)}…` : "loading…"}
          </p>
          {username && (
            <p className="text-white/30 text-xs font-mono mt-1">
              device trust:{" "}
              {trusted === null ? (
                "checking…"
              ) : trusted ? (
                <span className="text-green-300">trusted</span>
              ) : (
                <span className="text-yellow-300">not trusted</span>
              )}
            </p>
          )}
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
            <div className="font-bold text-lg">Username security (no password)</div>
            {username && (
              <button
                type="button"
                onClick={doSignOutUsername}
                className="ml-auto px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 text-xs font-bold inline-flex items-center gap-2"
              >
                <LogOut size={14} />
                Sign out username
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="bellum-input md:col-span-2"
              placeholder="username (a-z, 0-9, _)"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void doSignIn()}
                className="flex-1 px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm"
              >
                Sign in
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void doSignUp()}
                className="flex-1 px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm"
              >
                Create
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="bellum-input md:col-span-2"
              placeholder="6-digit approval code (from trusted device)"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !username}
              onClick={() => void doApprove()}
              className="px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm inline-flex items-center justify-center gap-2"
              title={!username ? "Set your username first" : "Approve a new device login"}
            >
              <KeyRound size={16} />
              Approve
            </button>
          </div>

          <div className="text-xs text-white/35 mt-3">
            You can play/install as a guest (anonymous session). Usernames are only needed for social features like friends.
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
              placeholder="friend username"
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
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

          {!username && (
            <div className="text-xs text-white/40 mt-3">
              To use friends, set a username in Settings → Security (or the login modal) and come back.
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

