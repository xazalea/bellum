"use client";

import { useEffect } from "react";
import { getDeviceFingerprintId } from "@/lib/auth/fingerprint";
import { getNachoIdentity } from "@/lib/auth/nacho-identity";

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
    let timer: number | null = null;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      try {
        const id = await getNachoIdentity();
        const deviceId = await getDeviceFingerprintId();
        await fetch(`/api/cluster/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Nacho-UserId": id.uid },
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


