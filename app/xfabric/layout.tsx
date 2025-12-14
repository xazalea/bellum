import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'XFabric Console',
  description: 'XFabric (WebFabric) console — deploy, domains, analytics, and cluster edge.',
};

export default function XFabricLayout({ children }: { children: React.ReactNode }) {
  // Make XFabric feel like a separate product surface (console) from Nacho.
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_520px_at_45%_12%,rgba(140,170,238,0.12),transparent_62%)]">
      <div className="w-full border-b border-white/10 bg-[rgba(35,38,52,0.65)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/5 border-2 border-white/10" />
            <div className="leading-tight">
              <div className="font-extrabold tracking-tight text-white">XFabric Console</div>
              <div className="text-xs text-white/45">separate surface • vercel+cloudflare vibes</div>
            </div>
          </div>
          <a
            href="/"
            className="text-sm text-white/60 hover:text-white/90 transition-colors"
            title="Back to Nacho"
          >
            ← Back to Nacho
          </a>
        </div>
      </div>

      {children}
    </div>
  );
}

