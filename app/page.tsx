import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen text-ocean-primary relative">
      {/* Scanline overlay */}
      <div className="crt-scanlines pointer-events-none fixed inset-0 z-10" />

      {/* Hero */}
      <section className="px-6 pt-32 pb-20 md:pt-44 md:pb-32 relative">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* ASCII art title decoration */}
          <div className="font-pixel text-[10px] md:text-xs text-ocean-muted tracking-widest opacity-60">
            ═══════════════════════════════
          </div>
          <h1 className="font-pixel text-2xl md:text-4xl tracking-tight leading-relaxed text-ocean-accent retro-glow">
            CHALLENGER DEEP
          </h1>
          <div className="font-pixel text-[10px] md:text-xs text-ocean-muted tracking-widest opacity-60">
            ═══════════════════════════════
          </div>
          <p className="font-retro text-xl md:text-2xl text-ocean-text max-w-xl mx-auto leading-relaxed">
            Explore the abyss. Run everything in your browser.
          </p>
          <p className="font-mono text-sm text-ocean-secondary max-w-lg mx-auto leading-relaxed">
            From retro games to Windows and Android. Dedicated compilers
            turn native binaries into web-native code — no emulator images required.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link href="/games" className="retro-btn retro-btn-primary font-pixel text-xs px-8 py-3">
              ▶ PLAY GAMES
            </Link>
            <Link href="/virtual-machines" className="retro-btn retro-btn-outline font-pixel text-xs px-8 py-3">
              ◈ VIRTUAL MACHINES
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-pixel text-[8px] md:text-[10px] text-ocean-muted pt-4">
            <span className="text-ocean-accent/70">ART Runtime</span>
            <span className="text-ocean-border">│</span>
            <span className="text-ocean-biolum/70">NTR Engine</span>
            <span className="text-ocean-border">│</span>
            <span className="text-ocean-accent/70">WebGPU Accelerated</span>
            <span className="text-ocean-border">│</span>
            <span className="text-ocean-biolum/70">DEX + PE Decoders</span>
          </div>
        </div>
      </section>

      {/* Depth Zones - Feature Cards */}
      <section className="px-6 py-20 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-pixel text-lg md:text-xl text-ocean-accent retro-glow">
              ── DEPTH ZONES ──
            </h2>
            <p className="font-retro text-lg text-ocean-secondary mt-3">
              Navigate the features of the deep
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon="🎮"
              title="20,000+ Games"
              description="HTML5 and retro games instantly playable — no downloads required."
              href="/games"
              depth="200m"
            />
            <FeatureCard
              icon="💻"
              title="Windows Runtime"
              badge="NTR"
              description="Dedicated PE decoder with x86 interpreter, Win32 API shims, and DirectX→WebGPU translation."
              href="/windows"
              depth="2000m"
            />
            <FeatureCard
              icon="📱"
              title="Android Runtime"
              badge="ART"
              description="Full AOSP stack with Dalvik-to-WASM JIT compilation and WebGPU-accelerated SurfaceFlinger."
              href="/android"
              depth="4000m"
            />
            <FeatureCard
              icon="🧠"
              title="AI Assistants"
              description="Chat with thousands of AI models for free — GPT, Claude, Gemini, and more."
              href="/ai"
              depth="6000m"
            />
            <FeatureCard
              icon="💾"
              title="Cloud Storage"
              description="Store files securely using distributed cloud infrastructure."
              href="/storage"
              depth="8000m"
            />
            <FeatureCard
              icon="📦"
              title="App Library"
              description="Upload APKs and EXEs — the platform decodes and runs them through dedicated compilers."
              href="/library"
              depth="10994m"
            />
          </div>
        </div>
      </section>

      {/* Architecture Pipeline */}
      <section className="px-6 py-16 border-y border-ocean-border relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-pixel text-lg text-ocean-biolum">
              ── ARCHITECTURE ──
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ArchCard
              label="Android Decoder"
              pipeline="APK → DEX → Dalvik → WASM"
              detail="218 Dalvik opcodes, ART JIT, WebGPU rendering"
            />
            <ArchCard
              label="Windows Decoder"
              pipeline="EXE → PE → x86 → Win32"
              detail="PE32/PE32+ loader, SimpleInterpreter, GDI/DirectX shims"
            />
            <ArchCard
              label="GPU Acceleration"
              pipeline="WebGPU Compute + Render"
              detail="Persistent kernels, SurfaceFlinger, DirectX translation"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16 relative">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <StatItem value="20K+" label="Games" />
          <StatItem value="100%" label="In-Browser" />
          <StatItem value="2" label="Compilers" />
          <StatItem value="Free" label="To Start" />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 relative">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="font-pixel text-xl md:text-2xl text-ocean-accent retro-glow">
            READY TO DIVE?
          </h2>
          <p className="font-retro text-lg text-ocean-secondary">
            Join thousands of users running native apps on the open web.
          </p>
          <div className="font-pixel text-[10px] text-ocean-muted opacity-60 py-2">
            ▼ DESCEND TO 10,994 METERS ▼
          </div>
          <Link href="/account" className="retro-btn retro-btn-primary font-pixel text-xs px-10 py-3 inline-block">
            ▶ GET STARTED FREE
          </Link>
        </div>
      </section>

      {/* Bottom ASCII decoration */}
      <div className="text-center pb-8 font-pixel text-[8px] text-ocean-muted/40">
        ～～～～～～～～～～～～～～～～～～～～～～～～
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  badge,
  description,
  href,
  depth,
}: {
  icon: string;
  title: string;
  badge?: string;
  description: string;
  href: string;
  depth: string;
}) {
  return (
    <Link href={href}>
      <div className="group retro-card h-full flex flex-col space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="text-2xl">{icon}</div>
          <div className="flex items-center gap-2">
            {badge && (
              <span className="font-pixel text-[8px] px-2 py-0.5 text-ocean-accent border border-ocean-accent/30 bg-ocean-accent/5">
                {badge}
              </span>
            )}
            <span className="font-pixel text-[8px] text-ocean-muted">
              ↓{depth}
            </span>
          </div>
        </div>
        <h3 className="font-pixel text-xs text-ocean-primary group-hover:text-ocean-accent transition-colors">
          {title}
        </h3>
        <p className="font-mono text-xs text-ocean-secondary leading-relaxed flex-grow">
          {description}
        </p>
        <div className="font-pixel text-[8px] text-ocean-muted group-hover:text-ocean-accent/60 transition-colors">
          ▶ EXPLORE
        </div>
      </div>
    </Link>
  );
}

function ArchCard({
  label,
  pipeline,
  detail,
}: {
  label: string;
  pipeline: string;
  detail: string;
}) {
  return (
    <div className="retro-card space-y-3">
      <p className="font-pixel text-[10px] text-ocean-accent tracking-wider">
        {label}
      </p>
      <p className="font-mono text-sm text-ocean-biolum">
        {pipeline}
      </p>
      <p className="font-mono text-xs text-ocean-secondary leading-relaxed">{detail}</p>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="space-y-2">
      <div className="font-pixel text-2xl md:text-3xl text-ocean-accent retro-glow">{value}</div>
      <div className="font-pixel text-[10px] text-ocean-muted uppercase tracking-widest">{label}</div>
    </div>
  );
}
