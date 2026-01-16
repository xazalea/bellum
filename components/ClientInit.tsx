'use client';

import { useEffect, useState } from 'react';

export function ClientInit() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Any other client-side initialization can go here
  }, []);

  if (!mounted) return null;

  return null;
}
