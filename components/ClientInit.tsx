'use client';

import { useEffect } from 'react';
import { authService } from '@/lib/firebase/auth-service';
import { ensureKursor } from '@/lib/ui/kursor';
import { hyperRuntime } from '@/lib/performance/hyper-runtime';
import { unlockAchievement } from '@/lib/gamification/achievements';
import { getNachoIdentity } from '@/lib/auth/nacho-identity';

/**
 * Client-side initialization
 * Runs keepalive cluster frame and other client-only setup
 */
export function ClientInit() {
  useEffect(() => {
    // Custom cursor (Kursor)
    ensureKursor().catch(() => {});

    // Ensure a local identity exists (username + device fingerprint). No user action required.
    void getNachoIdentity()
      .then(() => unlockAchievement('booted'))
      .catch(() => {});

    const ensureKeepaliveFrame = () => {
      try {
        // User-controlled opt-out (Network page toggle).
        if (window.localStorage.getItem('nacho.keepalive') === 'off') return;
      } catch {
        // ignore
      }
      const id = 'nacho-cluster-keepalive';
      const existing = document.getElementById(id) as HTMLIFrameElement | null;
      if (existing) return;

      const iframe = document.createElement('iframe');
      iframe.id = id;
      iframe.src = '/keepalive';
      iframe.tabIndex = -1;
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    };

    ensureKeepaliveFrame();

    // Preload critical assets
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Warm runtime helpers early (GPU/audio/worker/idle queue).
        hyperRuntime.ensureInitialized().catch(() => {});

        // Warm Fabric (semantic memo index + CAS path) early for better perceived speed.
        import('@/lib/fabric/runtime')
          .then(({ fabricRuntime }) => fabricRuntime.initialize())
          .catch(() => {});

        // Preload ISO files in background
        import('@/lib/assets/iso-loader').then(({ ISOLoader }) => {
          ISOLoader.preloadISO('android-x86-9.0-r2').catch(console.warn);
          ISOLoader.preloadISO('windows98').catch(console.warn);
        });
      });
    }

    return () => {
      // Keepalive should persist for the lifetime of the app shell;
      // on unmount, remove it.
      const existing = document.getElementById('nacho-cluster-keepalive');
      existing?.remove();
    };
  }, []);

  return null;
}

