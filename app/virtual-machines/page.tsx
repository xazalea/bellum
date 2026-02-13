'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Laptop, Smartphone, Cpu } from 'lucide-react';

export default function VirtualMachinesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <header className="space-y-1 border-b border-ocean-border pb-6 mb-10">
        <h1 className="text-2xl font-semibold text-ocean-primary tracking-tight">
          Virtual Machines
        </h1>
        <p className="text-sm text-ocean-secondary">
          Run full operating systems in your browser with dedicated compilers — no
          generic ISO emulators.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VMCard
          icon={<Laptop className="w-7 h-7 text-blue-400" />}
          title="Windows"
          engine="NTR Engine"
          pipeline="EXE → PE Parse → x86 Decode → Win32 Shims → Execute"
          description="Win32 emulation with a dedicated x86 interpreter, PE section loader, and WebGPU-accelerated GDI/DirectX rendering. Load and run native .exe files."
          features={['PE32/PE32+ loader', 'x86 SimpleInterpreter', 'Kernel32 · User32 · GDI32', 'DirectX → WebGPU']}
          href="/windows"
          status="Stable"
          accentClass="text-blue-400 border-blue-500/15"
        />
        <VMCard
          icon={<Smartphone className="w-7 h-7 text-teal-400" />}
          title="Android"
          engine="ART Runtime"
          pipeline="APK → DEX Extract → Dalvik Decode → ART JIT → Execute"
          description="Full Android 14 with Dalvik/ART JIT compilation on WebGPU. Boot the AOSP framework stack and run .apk files directly."
          features={['218 Dalvik opcodes', 'ART JIT → WASM', 'SurfaceFlinger compositing', 'Binder IPC']}
          href="/android"
          status="Experimental"
          accentClass="text-teal-400 border-teal-500/15"
        />
      </div>

      <section className="mt-14">
        <Card className="p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="p-3 rounded-md bg-ocean-accent/8 border border-ocean-accent/10 flex-shrink-0">
              <Cpu className="w-6 h-6 text-ocean-accent" />
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-ocean-primary">
                Dedicated Compilers, Not Emulators
              </h3>
              <p className="text-sm text-ocean-secondary leading-relaxed">
                Each virtual machine uses its own personalized compiler stack to turn
                native binaries into web-executable code. Windows uses the NTR engine
                with an x86 SimpleInterpreter, PE section loader, and Win32 API shims
                (Kernel32, User32, GDI, DirectX → WebGPU). Android boots a full
                AOSP-style framework with ART runtime, Dalvik-to-WASM JIT,
                SurfaceFlinger compositing, and GPU-accelerated Binder IPC.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <TechBadge>WebGPU Compute</TechBadge>
                <TechBadge>Persistent Kernels</TechBadge>
                <TechBadge>WASM JIT</TechBadge>
                <TechBadge>Virtual Memory</TechBadge>
                <TechBadge>Syscall Translation</TechBadge>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}

function TechBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-ocean-muted border border-ocean-border">
      {children}
    </span>
  );
}

function VMCard({
  icon,
  title,
  engine,
  pipeline,
  description,
  features,
  href,
  status,
  accentClass,
}: {
  icon: React.ReactNode;
  title: string;
  engine: string;
  pipeline: string;
  description: string;
  features: string[];
  href: string;
  status: string;
  accentClass: string;
}) {
  return (
    <Card className="flex flex-col p-7 h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-md bg-ocean-accent/8 border border-ocean-accent/10">
          {icon}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border font-medium ${accentClass}`}
          >
            {engine}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
              status === 'Stable'
                ? 'text-emerald-400 border border-emerald-500/15'
                : 'text-amber-400 border border-amber-500/15'
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-ocean-primary mb-2">{title}</h3>
      <p className="text-sm text-ocean-secondary leading-relaxed mb-4">
        {description}
      </p>

      {/* Decoder pipeline */}
      <div className="mb-4 px-3 py-2 rounded bg-ocean-bg/40 border border-ocean-border">
        <p className="text-[10px] text-ocean-muted uppercase tracking-wider mb-1">
          Decoder Pipeline
        </p>
        <p className="text-xs font-mono text-ocean-secondary">{pipeline}</p>
      </div>

      {/* Feature tags */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {features.map((f) => (
          <span
            key={f}
            className="px-2 py-0.5 rounded text-[10px] font-mono text-ocean-muted border border-ocean-border"
          >
            {f}
          </span>
        ))}
      </div>

      <div className="mt-auto">
        <Link href={href} className="w-full block">
          <Button variant="primary" className="w-full">
            Launch {title}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
