import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen text-ocean-primary relative">
      {/* Hero */}
      <section className="px-6 pt-28 pb-16 md:pt-36 md:pb-24 relative">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ocean-accent/10 border border-ocean-accent/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-pixel text-[8px] text-ocean-accent tracking-wider uppercase">Now with WebGPU Acceleration</span>
          </div>
          
          {/* Main Title */}
          <h1 className="font-pixel text-3xl md:text-5xl lg:text-6xl tracking-tight leading-tight text-ocean-accent retro-glow">
            CHALLENGER
            <br />
            <span className="text-ocean-biolum">DEEP</span>
          </h1>
          
          <p className="font-retro text-lg md:text-xl text-ocean-text max-w-2xl mx-auto leading-relaxed">
            Run Android, Windows, and 20,000+ games directly in your browser.
            <br className="hidden md:block" />
            No downloads. No installs. Just pure web-native power.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/games" className="group relative overflow-hidden rounded-lg bg-ocean-accent/10 border border-ocean-accent/30 px-6 py-3 font-pixel text-xs text-ocean-accent transition-all hover:bg-ocean-accent/20 hover:border-ocean-accent/50 hover:shadow-[0_0_20px_rgba(0,255,204,0.2)]">
              <span className="relative z-10 flex items-center gap-2">
                <span>▶</span> PLAY GAMES
              </span>
            </Link>
            <Link href="/virtual-machines" className="group rounded-lg border border-ocean-border-hover bg-ocean-surface/50 px-6 py-3 font-pixel text-xs text-ocean-text transition-all hover:border-ocean-biolum/50 hover:text-ocean-biolum hover:bg-ocean-biolum/5">
              <span className="flex items-center gap-2">
                <span>◈</span> VIRTUAL MACHINES
              </span>
            </Link>
            <Link href="/library" className="group rounded-lg border border-ocean-border-hover bg-ocean-surface/50 px-6 py-3 font-pixel text-xs text-ocean-text transition-all hover:border-ocean-biolum/50 hover:text-ocean-biolum hover:bg-ocean-biolum/5">
              <span className="flex items-center gap-2">
                <span>▤</span> LIBRARY
              </span>
            </Link>
          </div>
          
          {/* Tech Stack Pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {['ART Runtime', 'NTR Engine', 'WebGPU', 'DEX Decoder', 'PE Loader'].map((tech) => (
              <span key={tech} className="px-2.5 py-1 rounded-md bg-ocean-surface/30 border border-ocean-border/50 font-mono text-[10px] text-ocean-secondary">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Depth Zones - Feature Cards */}
      <section className="px-6 py-16 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-ocean-biolum/10 border border-ocean-biolum/20 font-pixel text-[8px] text-ocean-biolum tracking-wider uppercase mb-4">
              Features
            </span>
            <h2 className="font-pixel text-xl md:text-2xl text-ocean-accent retro-glow">
              EXPLORE THE DEPTH
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon="🎮"
              title="20,000+ Games"
              description="HTML5 and retro games instantly playable — no downloads required."
              href="/games"
              color="teal"
            />
            <FeatureCard
              icon="🖥️"
              title="Virtual Machines"
              badge="OS"
              description="Boot full Android or Windows operating systems directly in the browser."
              href="/virtual-machines"
              color="blue"
            />
            <FeatureCard
              icon="📱"
              title="App Decoders"
              badge="APK/EXE"
              description="Drop an APK or EXE and it's decoded through dedicated compiler stacks."
              href="/android"
              color="purple"
            />
            <FeatureCard
              icon="🧠"
              title="AI Assistants"
              description="Chat with thousands of AI models for free — GPT, Claude, Gemini, and more."
              href="/ai"
              color="pink"
            />
            <FeatureCard
              icon="💾"
              title="Cloud Storage"
              description="Store files securely using distributed cloud infrastructure."
              href="/storage"
              color="cyan"
            />
            <FeatureCard
              icon="📦"
              title="App Library"
              description="Upload APKs and EXEs — the platform decodes and runs them through dedicated compilers."
              href="/library"
              color="amber"
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
              label="Android Stack"
              pipeline="APK → DEX → Dalvik → WASM"
              detail="218 Dalvik opcodes, ART JIT, SurfaceFlinger, SystemUI"
            />
            <ArchCard
              label="Windows Stack"
              pipeline="EXE → PE → x86 → Win32"
              detail="PE32/PE32+ loader, Kernel32, User32, GDI/DirectX shims"
            />
            <ArchCard
              label="GPU Acceleration"
              pipeline="WebGPU Compute + Render"
              detail="Persistent kernels, parallel compilation, DirectX translation"
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
  color,
}: {
  icon: string;
  title: string;
  badge?: string;
  description: string;
  href: string;
  color: 'teal' | 'blue' | 'purple' | 'pink' | 'cyan' | 'amber';
}) {
  const colorStyles = {
    teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400', glow: 'group-hover:shadow-[0_0_20px_rgba(20,184,166,0.15)]' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', glow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400', glow: 'group-hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', glow: 'group-hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
  };
  
  const c = colorStyles[color];
  
  return (
    <Link href={href} className="group block">
      <div className={`h-full rounded-xl border ${c.border} bg-ocean-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:bg-ocean-card-hover/70 hover:border-ocean-accent/30 ${c.glow}`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center text-xl`}>
            {icon}
          </div>
          {badge && (
            <span className={`font-pixel text-[8px] px-2 py-1 rounded-md ${c.text} border ${c.border} ${c.bg}`}>
              {badge}
            </span>
          )}
        </div>
        <h3 className="font-pixel text-sm text-ocean-primary mb-2 group-hover:text-ocean-accent transition-colors">
          {title}
        </h3>
        <p className="font-mono text-xs text-ocean-secondary leading-relaxed">
          {description}
        </p>
        <div className="mt-4 flex items-center gap-1 font-pixel text-[10px] text-ocean-muted group-hover:text-ocean-accent/70 transition-colors">
          <span>Explore</span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
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
