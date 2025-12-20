'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/lib/firebase/auth-service';
import { subscribeInstalledApps, type InstalledApp } from '@/lib/apps/apps-service';

export function useInstalledApps() {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [apps, setApps] = useState<InstalledApp[]>([]);

  useEffect(() => authService.onAuthStateChange(setUser), []);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setApps([]);
      return;
    }
    return subscribeInstalledApps(uid, setApps);
  }, [user?.uid]);

  return { user, apps };
}


