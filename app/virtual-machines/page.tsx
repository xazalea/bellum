'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Laptop, Smartphone, Cpu } from 'lucide-react';

export default function VirtualMachinesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <header className="space-y-1 border-b border-ocean-border pb-6 mb-10">
        <h1 className="text-2xl font-semibold text-ocean-primary tracking-tight">Virtual Machines</h1>
        <p className="text-sm text-ocean-secondary">Run full operating systems in your browser with dedicated compilers.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VMCard
          icon={<Laptop className="w-8 h-8 text-blue-400" />}
          title="Windows"
          engine="NTR Engine"
          description="Win32 emulation with x86 interpreter, PE loader, and WebGPU-accelerated GDI/DirectX rendering. Load and run native .exe files."
          href="/windows"
          status="Stable"
          accentClass="text-blue-400 border-blue-500/15"
        />
        <VMCard
          icon={<Smartphone className="w-8 h-8 text-teal-400" />}
          title="Android"
          engine="ART Runtime"
          description="Full Android 14 with Dalvik/ART JIT compilation on WebGPU. Boot the Android framework stack and run .apk files directly."
          href="/android"
          status="Experimental"
          accentClass="text-teal-400 border-teal-500/15"
        />
      </div>

      <section className="mt-16">
        <Card className="p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="p-3 rounded-md bg-ocean-accent/8 border border-ocean-accent/10 flex-shrink-0">
              <Cpu className="w-6 h-6 text-ocean-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-ocean-primary">Dedicated Compilers</h3>
              <p className="text-sm text-ocean-secondary leading-relaxed">
                Each virtual machine uses its own personalized compiler stack. Windows uses the NTR engine with an
                x86 SimpleInterpreter, PE section loader, and Win32 API shims (Kernel32, User32, GDI, DirectX → WebGPU).
                Android boots a full AOSP-style framework with ART runtime, Dalvik-to-WASM JIT, SurfaceFlinger compositing,
                and GPU-accelerated Binder IPC — no generic x86 emulator required.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}

function VMCard({
  icon,
  title,
  engine,
  description,
  href,
  status,
  accentClass,
}: {
  icon: React.ReactNode;
  title: string;
  engine: string;
  description: string;
  href: string;
  status: string;
  accentClass: string;
}) {
  return (
    <Card className="flex flex-col p-8 h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-md bg-ocean-accent/8 border border-ocean-accent/10">{icon}</div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${accentClass}`}>
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
      <h3 className="text-lg font-semibold text-ocean-primary mb-3">{title}</h3>
      <p className="text-sm text-ocean-secondary leading-relaxed mb-6 flex-grow">{description}</p>
      <Link href={href} className="w-full">
        <Button variant="primary" className="w-full">
          Launch {title}
        </Button>
      </Link>
    </Card>
  );
}
