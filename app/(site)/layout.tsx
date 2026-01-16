import type { PropsWithChildren } from 'react';
import { SiteShell } from '@/components/site/SiteShell';

export default function SiteLayout({ children }: PropsWithChildren) {
  return (
    <>
      <SiteShell>{children}</SiteShell>
    </>
  );
}
