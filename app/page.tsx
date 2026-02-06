'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { Sparkles, Gamepad2, Laptop, Smartphone, Database, Cpu, BrainCircuit, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-nacho-bg text-nacho-primary">
      {/* Background Effect */}
      <AnimatedGridPattern
        numSquares={40}
        maxOpacity={0.1}
        duration={3}
        repeatDelay={1}
        className="fixed inset-0 -z-10 h-screen w-screen fill-nacho-accent/20 stroke-nacho-accent/20"
      />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-5">
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-nacho-accent/30 bg-nacho-accent/10 text-nacho-accent text-sm font-medium animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>The next generation browser runtime</span>
          </div>

          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <AnimatedGradientText className="text-5xl md:text-7xl font-bold">
                Run Everything in Your Browser
              </AnimatedGradientText>
            </h1>
            <p className="text-xl md:text-2xl text-nacho-secondary max-w-2xl mx-auto">
              From retro games to Windows and Android. Bellum is a high-performance runtime platform powered by emulation and virtualization.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link href="/games">
              <Button variant="shimmer" className="h-12 px-8 text-lg rounded-full">
                Play Games
              </Button>
            </Link>
            <Link href="/android">
              <Button variant="outline" className="h-12 px-8 text-lg rounded-full border-nacho-border bg-nacho-surface/50 backdrop-blur-sm">
                Try Android
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-5 bg-gradient-to-b from-transparent to-nacho-bg/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Gamepad2 className="w-8 h-8 text-blue-400" />}
              title="20,000+ Games"
              description="Access a massive catalog of HTML5 and retro games instantly. No downloads required."
              href="/games"
            />
            <FeatureCard
              icon={<Laptop className="w-8 h-8 text-purple-400" />}
              title="Windows Emulation"
              description="Run Windows 98 and classic PC applications directly in your browser using v86."
              href="/windows"
            />
            <FeatureCard
              icon={<Smartphone className="w-8 h-8 text-green-400" />}
              title="Android Runtime"
              description="Experimental Android support for running mobile apps and experiences on the web."
              href="/android"
            />
            <FeatureCard
              icon={<BrainCircuit className="w-8 h-8 text-pink-400" />}
              title="AI Assistants"
              description="Integrated AI chat with access to thousands of models for help, coding, or just chatting."
              href="/ai"
            />
            <FeatureCard
              icon={<Database className="w-8 h-8 text-orange-400" />}
              title="Cloud Storage"
              description="Store and manage your files securely using our unique Discord-powered storage system."
              href="/storage"
            />
            <FeatureCard
              icon={<Cpu className="w-8 h-8 text-cyan-400" />}
              title="App Library"
              description="Upload your own APKs, EXEs, and ROMs to your personal library and run them anywhere."
              href="/library"
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-yellow-400" />}
              title="Cloud Hosting"
              description="Deploy and host your own sites and applications with our integrated edge hosting platform."
              href="/cluster"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-5 border-y border-nacho-border/50 bg-nacho-surface/20">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <StatItem value="20K+" label="Games" />
          <StatItem value="100%" label="In-Browser" />
          <StatItem value="∞" label="Possibilities" />
          <StatItem value="Free" label="To Start" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-5">
        <div className="max-w-4xl mx-auto text-center space-y-8 p-12 rounded-[2rem] bg-gradient-to-br from-nacho-accent/20 to-purple-500/10 border border-nacho-accent/30 backdrop-blur-md">
          <h2 className="text-4xl font-bold">Ready to dive in?</h2>
          <p className="text-xl text-nacho-secondary">
            Join thousands of users running the future of the web today.
          </p>
          <Link href="/account">
            <Button variant="shimmer" className="h-12 px-10 text-lg rounded-full">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-5 border-t border-nacho-border/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-nacho-muted text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-nacho-accent" />
            <span className="font-semibold text-nacho-primary">Bellum</span>
          </div>
          <div className="flex gap-8">
            <Link href="/games" className="hover:text-nacho-primary transition-colors">Games</Link>
            <Link href="/windows" className="hover:text-nacho-primary transition-colors">Windows</Link>
            <Link href="/android" className="hover:text-nacho-primary transition-colors">Android</Link>
            <Link href="/ai" className="hover:text-nacho-primary transition-colors">AI</Link>
          </div>
          <div>© 2024 Bellum Runtime Platform</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) {
  return (
    <Link href={href}>
      <div className="group p-8 rounded-[1.5rem] bg-nacho-surface border border-nacho-border hover:border-nacho-accent/50 hover:bg-nacho-card-hover transition-all duration-300 h-full flex flex-col space-y-4">
        <div className="p-3 w-fit rounded-xl bg-nacho-bg border border-nacho-border group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-2xl font-bold group-hover:text-nacho-accent transition-colors">{title}</h3>
        <p className="text-nacho-secondary leading-relaxed flex-grow">
          {description}
        </p>
        <div className="pt-4 flex items-center text-nacho-accent font-medium text-sm">
          Learn more
          <span className="material-symbols-outlined ml-1 text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </div>
      </div>
    </Link>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="text-4xl font-bold text-nacho-primary">{value}</div>
      <div className="text-nacho-muted uppercase tracking-widest text-xs font-semibold">{label}</div>
    </div>
  );
}
