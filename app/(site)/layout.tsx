import type { PropsWithChildren } from 'react';
import { SiteShell } from '@/components/site/SiteShell';
import { WelcomeOnboarding } from '@/components/nacho-ui/WelcomeOnboarding';

export default function SiteLayout({ children }: PropsWithChildren) {
  return (
    <>
      <SiteShell>{children}</SiteShell>
      <WelcomeOnboarding />
    </>
  );
}


