import type { Metadata } from 'next';
import { XFabricPanel } from '@/components/XFabric';

// This page reads `searchParams`, so force dynamic rendering to avoid
// "Static generation failed due to dynamic usage" noise during builds.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'XFabric — WebFabric technology',
  description:
    'Showcase of XFabric (WebFabric): orchestration, hosting primitives, and Telegram-backed storage. Includes free-domain onboarding via FreeDNS.',
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
              <div className="text-sm font-bold text-white/90">Minecraft hosting (showcase)</div>
              <div className="text-xs text-white/55 mt-1">
                Orchestrate game workloads, persist worlds, and stream state across nodes.
              </div>
            </div>
            <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
              <div className="text-sm font-bold text-white/90">Proxy hosting</div>
              <div className="text-xs text-white/55 mt-1">
                Reverse-proxy your own services, dashboards, and internal tooling with policy-aware routing.
              </div>
            </div>
            <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
              <div className="text-sm font-bold text-white/90">Web hosting</div>
              <div className="text-xs text-white/55 mt-1">
                Get a free domain via FreeDNS, upload a small site (zip), and host it with Telegram-backed storage.
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
