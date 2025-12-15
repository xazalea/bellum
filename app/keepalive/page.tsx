"use client";

import { useEffect } from "react";
import { nachoEngine } from "@/lib/nacho/engine";
import { getDeviceFingerprintId } from "@/lib/auth/fingerprint";
import { authService } from "@/lib/firebase/auth-service";
import { getClusterBase } from "@/lib/cluster/cluster-base";

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

    const tick = async () => {
      if (stopped) return;
      try {
        // Ensure a session exists so heartbeat calls are authenticated.
        if (!authService.getCurrentUser()) await authService.ensureIdentity();
        const user = authService.getCurrentUser();
        const deviceId = await getDeviceFingerprintId();
        const base = getClusterBase();
        await fetch(`${base}/api/cluster/heartbeat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user ? { "X-Nacho-UserId": user.uid, "X-Nacho-DeviceId": deviceId } : {}),
          },
          body: JSON.stringify({
            deviceId,
            userAgent: navigator.userAgent,
            label: navigator.platform,
            load: null,
          }),
        }).catch(() => {});
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


