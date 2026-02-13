'use client';

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
            From retro games to Windows and Android. A high-performance runtime
            platform powered by emulation and virtualization.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link href="/games">
              <Button variant="primary" className="h-11 px-7">
                Play Games
              </Button>
            </Link>
            <Link href="/android">
              <Button variant="outline" className="h-11 px-7">
                Try Android
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Gamepad2 className="w-5 h-5 text-ocean-accent" />}
              title="20,000+ Games"
              description="HTML5 and retro games instantly. No downloads required."
              href="/games"
            />
            <FeatureCard
              icon={<Laptop className="w-5 h-5 text-ocean-accent" />}
              title="Windows Emulation"
              description="Run Windows 98 and classic PC apps directly in your browser."
              href="/windows"
            />
            <FeatureCard
              icon={<Smartphone className="w-5 h-5 text-ocean-accent" />}
              title="Android Runtime"
              description="Experimental Android support for mobile apps on the web."
              href="/android"
            />
            <FeatureCard
              icon={<BrainCircuit className="w-5 h-5 text-ocean-accent" />}
              title="AI Assistants"
              description="AI chat with access to thousands of models for free."
              href="/ai"
            />
            <FeatureCard
              icon={<Database className="w-5 h-5 text-ocean-accent" />}
              title="Cloud Storage"
              description="Store files securely using distributed cloud storage."
              href="/storage"
            />
            <FeatureCard
              icon={<Cpu className="w-5 h-5 text-ocean-accent" />}
              title="App Library"
              description="Upload APKs, EXEs, and ROMs to run them anywhere."
              href="/library"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16 border-y border-ocean-border">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <StatItem value="20K+" label="Games" />
          <StatItem value="100%" label="In-Browser" />
          <StatItem value="∞" label="Possibilities" />
          <StatItem value="Free" label="To Start" />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Ready to dive in?</h2>
          <p className="text-ocean-secondary">
            Join thousands of users running the future of the web today.
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

function FeatureCard({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) {
  return (
    <Link href={href}>
      <div className="group p-8 rounded-md bg-ocean-card border border-ocean-border hover:border-ocean-border-hover transition-colors duration-150 h-full flex flex-col space-y-4">
        <div className="p-2.5 w-fit rounded-md bg-ocean-accent/8 border border-ocean-accent/10">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-ocean-primary">{title}</h3>
        <p className="text-sm text-ocean-secondary leading-relaxed flex-grow">
          {description}
        </p>
      </div>
    </Link>
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
