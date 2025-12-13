"use client";

import { useEffect } from "react";
import { nachoEngine } from "@/lib/nacho/engine";
import { authService } from "@/lib/firebase/auth-service";
import { getDeviceFingerprintId } from "@/lib/auth/fingerprint";

/**
 * Cluster keepalive page.
 *
 * This page is intended to be loaded in a hidden iframe to keep
 * cluster-related workers active while the site is open.
 *
 * Note: Browsers may still throttle background iframes/tabs; this is best-effort.
 */
export default function KeepalivePage() {
  useEffect(() => {
    (async () => {
      try {
        await nachoEngine?.boot();
      } catch (e) {
        // Keepalive should never hard-crash the app; log only.
        console.warn("Keepalive boot failed:", e);
      }
    })();

    let timer: number | null = null;
    let stopped = false;

    const getClusterBase = () =>
      (typeof process !== "undefined" &&
        (process.env as unknown as { NEXT_PUBLIC_CLUSTER_SERVER_URL?: string })
          ?.NEXT_PUBLIC_CLUSTER_SERVER_URL) ||
      "";

    const tick = async () => {
      if (stopped) return;
      const user = authService.getCurrentUser();
      if (!user) return;
      try {
        const deviceId = await getDeviceFingerprintId();
        const token = await user.getIdToken().catch(() => null);
        const base = getClusterBase();
        const bases = base ? [base, ""] : [""];
        for (const b of bases) {
          const res = await fetch(`${b}/api/cluster/heartbeat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Nacho-UserId": user.uid,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              deviceId,
              userAgent: navigator.userAgent,
              label: navigator.platform,
              load: null,
            }),
          });
          if (res.ok) break;
        }
      } catch (e) {
        // best-effort
      }
    };

    // Start heartbeat loop.
    void tick();
    timer = window.setInterval(() => void tick(), 15_000);

    return () => {
      try {
        nachoEngine?.halt();
      } catch {
        // ignore
      }
      stopped = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="sr-only">
      Nacho cluster keepalive.
    </div>
  );
}


