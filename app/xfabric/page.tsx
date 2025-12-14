import type { Metadata } from 'next';
import { XFabricPanel } from '@/components/XFabric';

// This page reads `searchParams`, so force dynamic rendering to avoid
// "Static generation failed due to dynamic usage" noise during builds.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'XFabric — WebFabric technology',
  description:
    'XFabric: deploy static sites, attach custom domains, and store bundles via Telegram-backed storage.',
};

export default function XFabricPage({
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
          <div className="text-3xl md:text-4xl font-bold text-white">XFabric</div>
          <div className="text-sm md:text-base text-white/60 mt-2 max-w-3xl">
            WebFabric, turned into a product: insanely composable building blocks for hosting, orchestration, and storage.
          </div>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
              <div className="text-sm font-bold text-white/90">Static site hosting</div>
              <div className="text-xs text-white/55 mt-1">
                Upload a zip (or import from GitHub) and serve it from your deployment.
              </div>
            </div>
            <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
              <div className="text-sm font-bold text-white/90">Custom domains</div>
              <div className="text-xs text-white/55 mt-1">
                Attach a domain to a deployment by setting a DNS A record.
              </div>
            </div>
            <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
              <div className="text-sm font-bold text-white/90">Telegram-backed storage</div>
              <div className="text-xs text-white/55 mt-1">
                Bundles are stored server-side (secrets never reach the client).
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive panel: overview + hosting */}
      <XFabricPanel initialTab={initialTab} />
    </div>
  );
}
