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
        <p className="text-sm text-ocean-secondary">Run full operating systems in your browser.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VMCard
          icon={<Laptop className="w-8 h-8 text-ocean-accent" />}
          title="Windows 98"
          description="Run legacy PC applications, play retro games, or explore the classic Windows environment."
          href="/windows"
          status="Stable"
        />
        <VMCard
          icon={<Smartphone className="w-8 h-8 text-ocean-accent" />}
          title="Android Runtime"
          description="Experimental Android-x86 environment. Test mobile apps within your browser."
          href="/android"
          status="Experimental"
        />
      </div>

      <section className="mt-16">
        <Card className="p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="p-3 rounded-md bg-ocean-accent/8 border border-ocean-accent/10 flex-shrink-0">
              <Cpu className="w-6 h-6 text-ocean-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-ocean-primary">Advanced Virtualization</h3>
              <p className="text-sm text-ocean-secondary leading-relaxed">
                Bellum uses high-performance JIT compilation and WebGPU acceleration. Our API-level emulation layer
                reduces overhead by mapping OS calls directly to Web APIs.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}

function VMCard({ icon, title, description, href, status }: { icon: React.ReactNode; title: string; description: string; href: string; status: string }) {
  return (
    <Card className="flex flex-col p-8 h-full">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 rounded-md bg-ocean-accent/8 border border-ocean-accent/10">
          {icon}
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
          status === 'Stable' ? 'text-emerald-400 border border-emerald-500/15' : 'text-amber-400 border border-amber-500/15'
        }`}>
          {status}
        </span>
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
