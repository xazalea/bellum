import type { Metadata } from 'next';
import { FabrikPanel } from '@/components/XFabric';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Fabrik — hosting dashboard',
  description: 'Fabrik: deploy static sites, attach custom domains, and store bundles via Telegram-backed storage.',
};

export default function FabrikPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const tabParam = String(searchParams?.tab ?? '').toLowerCase();
  const initialTab = tabParam === 'hosting' ? 'hosting' : 'overview';

  return (
    <div className="min-h-screen">
      <div className="w-full max-w-6xl mx-auto px-8 pt-24">
        <div className="bellum-card p-7 border-2 border-white/10">
          <div className="text-3xl md:text-4xl font-bold text-white">Fabrik</div>
          <div className="text-sm md:text-base text-white/60 mt-2 max-w-3xl">
            A production hosting dashboard: deployments, domains, and Telegram-backed storage.
          </div>
        </div>
      </div>

      <FabrikPanel initialTab={initialTab} />
    </div>
  );
}

