"use client";

import { useEffect, useMemo, useState } from "react";
import { authService } from "@/lib/firebase/auth-service";
import { nachoEngine } from "@/lib/nacho/engine";

type TelegramStatus = { enabled: boolean };

export default function ClusterServerPage() {
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [engineStatus, setEngineStatus] = useState<"idle" | "booting" | "online" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState(() => authService.getCurrentUser());
  useEffect(() => authService.onAuthStateChange(setUser), []);
  const uid = user?.uid ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/telegram/status", { cache: "no-store" });
        const j = (await res.json().catch(() => null)) as TelegramStatus | null;
        if (!cancelled) setTelegram(j);
      } catch {
        if (!cancelled) setTelegram({ enabled: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setEngineStatus("booting");
        await nachoEngine?.boot();
        if (!cancelled) setEngineStatus("online");
      } catch (e: any) {
        if (!cancelled) {
          setEngineStatus("error");
          setError(e?.message || "Engine boot failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const telegramLabel = useMemo(() => {
    if (!telegram) return "checking…";
    if (telegram.enabled) return "enabled";
    return "disabled";
  }, [telegram]);

  return (
    <div className="w-full max-w-5xl mx-auto p-8 pt-24 min-h-screen space-y-6">
      <div className="bellum-card p-6 border-2 border-white/10">
        <div className="text-2xl font-bold text-white">Cluster / Server</div>
        <div className="text-sm text-white/45 mt-1">
          This page runs a <span className="font-mono text-white/70">client cluster node</span> (compute + caching) while the site is open.
          Storage is proxied through Vercel route handlers into Telegram (secrets stay server-side).
        </div>
      </div>

      {error && (
        <div className="bellum-card p-4 border-2 border-red-400/30 bg-red-500/10 text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bellum-card p-6 border-2 border-white/10">
          <div className="text-sm font-bold text-white/90 mb-2">Node status</div>
          <div className="text-xs font-mono text-white/60">
            engine:{" "}
            {engineStatus === "online" ? (
              <span className="text-green-300">online</span>
            ) : engineStatus === "booting" ? (
              <span className="text-yellow-300">booting</span>
            ) : engineStatus === "error" ? (
              <span className="text-red-300">error</span>
            ) : (
              <span>idle</span>
            )}
          </div>
          <div className="text-xs font-mono text-white/60 mt-1">uid: {uid ? `${uid.slice(0, 10)}…` : "guest/loading…"}</div>
        </div>

        <div className="bellum-card p-6 border-2 border-white/10">
          <div className="text-sm font-bold text-white/90 mb-2">Telegram cloud storage</div>
          <div className="text-xs font-mono text-white/60">
            status:{" "}
            {telegramLabel === "enabled" ? (
              <span className="text-green-300">enabled</span>
            ) : telegramLabel === "misconfigured" ? (
              <span className="text-yellow-300">misconfigured</span>
            ) : telegramLabel === "disabled" ? (
              <span className="text-red-300">disabled</span>
            ) : (
              <span>checking…</span>
            )}
          </div>
          <div className="text-xs text-white/40 mt-2">
            Uses <span className="font-mono">/api/telegram/*</span> route handlers to keep the bot token private.
          </div>
        </div>
      </div>
    </div>
  );
}

