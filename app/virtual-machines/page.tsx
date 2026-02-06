'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Laptop, Smartphone, Monitor, Cpu } from 'lucide-react';

export default function VirtualMachinesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10">
      <header className="space-y-2 border-b border-nacho-border pb-6 mb-12">
        <h1 className="text-4xl font-bold text-nacho-primary tracking-tight">Virtual Machines</h1>
        <p className="text-nacho-secondary text-lg">Run full operating systems directly in your browser.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <VMCard
          icon={<Laptop className="w-12 h-12 text-purple-400" />}
          title="Windows 98"
          description="Experience the classic Windows 98 environment. Run legacy PC applications, play retro games, or just enjoy the nostalgia. Powered by v86 virtualization."
          href="/windows"
          status="Stable"
        />
        <VMCard
          icon={<Smartphone className="w-12 h-12 text-green-400" />}
          title="Android Runtime"
          description="Experimental Android-x86 environment. Test mobile apps or explore the Android ecosystem within your web browser."
          href="/android"
          status="Experimental"
        />
      </div>

      <section className="mt-20">
        <Card className="p-8 bg-nacho-surface/20 border-nacho-border">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-20 h-20 rounded-2xl bg-nacho-accent/20 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-10 h-10 text-nacho-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Advanced Virtualization</h3>
              <p className="text-nacho-secondary leading-relaxed">
                Bellum uses high-performance JIT compilation and WebGPU acceleration to provide a smooth emulation experience. Our unique API-level emulation layer reduces overhead by mapping OS calls directly to Web APIs.
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
    <Card className="flex flex-col p-8 h-full group hover:border-nacho-accent transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className="p-4 rounded-2xl bg-nacho-bg border border-nacho-border group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          status === 'Stable' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          {status}
        </span>
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-nacho-secondary mb-8 flex-grow leading-relaxed">
        {description}
      </p>
      <Link href={href} className="w-full">
        <Button variant="shimmer" className="w-full h-12 rounded-xl">
          Launch {title}
        </Button>
      </Link>
    </Card>
  );
}
