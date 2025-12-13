'use client';

import { useEffect } from 'react';
import { authService } from '@/lib/firebase/auth-service';
import { onSettings } from '@/lib/cluster/settings';
import { ensureKursor } from '@/lib/ui/kursor';

/**
 * Client-side initialization
 * Runs keepalive cluster frame and other client-only setup
 */
export function ClientInit() {
  useEffect(() => {
    // Custom cursor (Kursor)
    ensureKursor().catch(() => {});

    // Guest access: ensure there is a Firebase session, but DO NOT race
    // against an existing persisted login (avoid accidentally switching to guest).
    let resolvedFirstAuthState = false;
    const unsubGuest = authService.onAuthStateChange((u) => {
      if (resolvedFirstAuthState) return;
      resolvedFirstAuthState = true;
      if (!u) {
        authService.signInAnonymously().catch(() => {});
      }
    });

    const ensureKeepaliveFrame = (enabled: boolean) => {
      const id = 'nacho-cluster-keepalive';
      const existing = document.getElementById(id) as HTMLIFrameElement | null;

      if (!enabled) {
        existing?.remove();
        return;
      }

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

    let unsubSettings: (() => void) | null = null;
    const unsubAuth = authService.onAuthStateChange((user) => {
      unsubSettings?.();
      unsubSettings = null;
      ensureKeepaliveFrame(false);

      if (!user) return;
      unsubSettings = onSettings(user.uid, (s) => {
        ensureKeepaliveFrame(!!s.clusterParticipation);
      });
    });

    // Preload critical assets
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Preload ISO files in background
        import('@/lib/assets/iso-loader').then(({ ISOLoader }) => {
          ISOLoader.preloadISO('android-x86-9.0-r2').catch(console.warn);
          ISOLoader.preloadISO('windows98').catch(console.warn);
        });
      });
    }

    return () => {
      unsubSettings?.();
      unsubAuth();
      unsubGuest();
      ensureKeepaliveFrame(false);
    };
  }, []);

  return null;
}

