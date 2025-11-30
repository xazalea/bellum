'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/ui/service-worker-register';

/**
 * Client-side initialization
 * Runs service worker registration and other client-only setup
 */
export function ClientInit() {
  useEffect(() => {
    // Register service worker
    registerServiceWorker().catch(console.error);

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
  }, []);

  return null;
}

