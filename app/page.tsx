import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Gamepad2, Laptop, Smartphone, Database, Cpu, BrainCircuit } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen text-ocean-primary">
      {/* Hero */}
      <section className="px-6 pt-24 pb-20 md:pt-40 md:pb-32">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.15]">
            Run Everything<br className="hidden md:block" /> in Your Browser
          </h1>
          <p className="text-lg text-ocean-secondary max-w-xl mx-auto leading-relaxed">
            From retro games to Windows and Android. Dedicated compilers turn native
            binaries into web-native code — no emulator images required.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link href="/games">
              <Button variant="primary" className="h-11 px-7">
                Play Games
              </Button>
            </Link>
            <Link href="/virtual-machines">
              <Button variant="outline" className="h-11 px-7">
                Virtual Machines
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-mono text-ocean-muted pt-2">
            <span>ART Runtime</span>
            <span className="text-ocean-border">·</span>
            <span>NTR Engine</span>
            <span className="text-ocean-border">·</span>
            <span>WebGPU Accelerated</span>
            <span className="text-ocean-border">·</span>
            <span>DEX + PE Decoders</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={<Gamepad2 className="w-5 h-5 text-ocean-accent" />}
              title="20,000+ Games"
              description="HTML5 and retro games instantly playable — no downloads required."
              href="/games"
            />
            <FeatureCard
              icon={<Laptop className="w-5 h-5 text-ocean-accent" />}
              title="Windows Runtime"
              badge="NTR Engine"
              description="Dedicated PE decoder with x86 interpreter, Win32 API shims, and DirectX→WebGPU translation."
              href="/windows"
            />
            <FeatureCard
              icon={<Smartphone className="w-5 h-5 text-ocean-accent" />}
              title="Android Runtime"
              badge="ART"
              description="Full AOSP stack with Dalvik-to-WASM JIT compilation and WebGPU-accelerated SurfaceFlinger."
              href="/android"
            />
            <FeatureCard
              icon={<BrainCircuit className="w-5 h-5 text-ocean-accent" />}
              title="AI Assistants"
              description="Chat with thousands of AI models for free — GPT, Claude, Gemini, and more."
              href="/ai"
            />
            <FeatureCard
              icon={<Database className="w-5 h-5 text-ocean-accent" />}
              title="Cloud Storage"
              description="Store files securely using distributed cloud infrastructure."
              href="/storage"
            />
            <FeatureCard
              icon={<Cpu className="w-5 h-5 text-ocean-accent" />}
              title="App Library"
              description="Upload APKs and EXEs — the platform decodes and runs them through dedicated compilers."
              href="/library"
            />
          </div>
        </div>
      </section>

      {/* Architecture callout */}
      <section className="px-6 py-16 border-y border-ocean-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <StatItem value="20K+" label="Games" />
          <StatItem value="100%" label="In-Browser" />
          <StatItem value="2" label="Compilers" />
          <StatItem value="Free" label="To Start" />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Ready to dive in?</h2>
          <p className="text-ocean-secondary">
            Join thousands of users running native apps on the open web.
          </p>
          <Link href="/account">
            <Button variant="primary" className="h-11 px-8 mt-2">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  badge,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="group p-7 rounded-md bg-ocean-card border border-ocean-border hover:border-ocean-border-hover transition-colors duration-150 h-full flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="p-2.5 w-fit rounded-md bg-ocean-accent/8 border border-ocean-accent/10">
            {icon}
          </div>
          {badge && (
            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-ocean-accent border border-ocean-accent/15 font-medium">
              {badge}
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold text-ocean-primary">{title}</h3>
        <p className="text-sm text-ocean-secondary leading-relaxed flex-grow">
          {description}
        </p>
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
    <div className="space-y-2">
      <p className="text-xs font-medium text-ocean-muted uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-mono text-ocean-primary">{pipeline}</p>
      <p className="text-xs text-ocean-secondary leading-relaxed">{detail}</p>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="text-3xl font-bold text-ocean-primary">{value}</div>
      <div className="text-ocean-muted uppercase tracking-widest text-xs">{label}</div>
    </div>
  );
}
