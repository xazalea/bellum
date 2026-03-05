'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { TextHoverEffect } from '@/components/ui/text-hover-effect';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { Box, Lock, Search, Settings, Sparkles, ArrowRight, Cpu, Gamepad2, Bot, Cloud, Server } from 'lucide-react';

// Dynamically import CanvasRevealEffect with SSR disabled
const CanvasRevealEffect = dynamic(
  () => import('@/components/ui/canvas-reveal-effect').then((mod) => mod.CanvasRevealEffect),
  { ssr: false }
);

const FEATURES = [
  {
    title: 'Virtual Machines',
    description: 'Boot full Android or Windows operating systems directly in your browser with native performance.',
    icon: Cpu,
    href: '/virtual-machines',
    color: 'cyan',
    stats: '2 OS Types',
  },
  {
    title: 'Game Library',
    description: 'Access 20,000+ HTML5 and retro games instantly. No downloads, no installs, just play.',
    icon: Gamepad2,
    href: '/games',
    color: 'purple',
    stats: '20K+ Games',
  },
  {
    title: 'App Decoders',
    description: 'Drop APK or EXE files and watch them decode through dedicated compiler stacks in real-time.',
    icon: Box,
    href: '/library',
    color: 'emerald',
    stats: '2 Compilers',
  },
  {
    title: 'AI Assistants',
    description: 'Chat with thousands of AI models including GPT, Claude, Gemini, and more — all for free.',
    icon: Bot,
    href: '/ai',
    color: 'pink',
    stats: '1000+ Models',
  },
  {
    title: 'Cloud Storage',
    description: 'Store files securely using distributed cloud infrastructure with global replication.',
    icon: Cloud,
    href: '/storage',
    color: 'blue',
    stats: 'Distributed',
  },
  {
    title: 'GPU Cluster',
    description: 'Access high-performance GPU computing for rendering, ML, and compute-intensive tasks.',
    icon: Server,
    href: '/cluster',
    color: 'orange',
    stats: 'WebGPU Ready',
  },
];

const TECH_STACK = [
  { name: 'ART Runtime', status: 'Active', color: 'emerald' },
  { name: 'NTR Engine', status: 'Active', color: 'emerald' },
  { name: 'WebGPU', status: 'Ready', color: 'cyan' },
  { name: 'DEX Decoder', status: 'Active', color: 'emerald' },
  { name: 'PE Loader', status: 'Active', color: 'emerald' },
  { name: 'WASM JIT', status: 'Ready', color: 'cyan' },
];

// Animated Counter Component
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

// Glowing Feature Card Component
function GlowingFeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const Icon = feature.icon;
  
  return (
    <Link
      href={feature.href}
      className="relative h-full rounded-2xl border border-white/10 p-2 group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={3}
      />
      <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border border-white/10 bg-neutral-950 p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
        <div className="relative flex flex-1 flex-col justify-between gap-3">
          <div className="w-fit rounded-lg border border-white/10 bg-white/5 p-2">
            <Icon className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="pt-0.5 text-xl leading-[1.375rem] font-semibold font-sans tracking-[-0.04em] md:text-2xl md:leading-[1.875rem] text-balance text-white">
                {feature.title}
              </h3>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                {feature.stats}
              </span>
            </div>
            <p className="font-sans text-sm leading-[1.125rem] md:text-base md:leading-[1.375rem] text-slate-400">
              {feature.description}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 group-hover:text-cyan-400 transition-colors">
            <span>Explore</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Canvas Reveal Card Component
function CanvasCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="border border-white/[0.2] group/canvas-card flex items-center justify-center max-w-sm w-full mx-auto p-4 relative h-[30rem] rounded-xl bg-neutral-950"
    >
      <Icon className="absolute h-6 w-6 -top-3 -left-3 text-cyan-400" />
      <Icon className="absolute h-6 w-6 -bottom-3 -left-3 text-cyan-400" />
      <Icon className="absolute h-6 w-6 -top-3 -right-3 text-cyan-400" />
      <Icon className="absolute h-6 w-6 -bottom-3 -right-3 text-cyan-400" />
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full absolute inset-0 rounded-xl overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative z-20">
        <div className="text-center group-hover/canvas-card:-translate-y-4 group-hover/canvas-card:opacity-0 transition duration-200 w-full mx-auto flex items-center justify-center">
          {icon}
        </div>
        <h2 className="dark:text-white text-xl opacity-0 group-hover/canvas-card:opacity-100 relative z-10 text-black mt-4 font-bold group-hover/canvas-card:text-white group-hover/canvas-card:-translate-y-2 transition duration-200 text-center">
          {title}
        </h2>
      </div>
    </div>
  );
}

const AceternityIcon = () => {
  return (
    <svg
      width="66"
      height="65"
      viewBox="0 0 66 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10 text-cyan-400 group-hover/canvas-card:text-white"
    >
      <path
        d="M8 8.05571C8 8.05571 54.9009 18.1782 57.8687 30.062C60.8365 41.9458 9.05432 57.4696 9.05432 57.4696"
        stroke="currentColor"
        strokeWidth="15"
        strokeMiterlimit="3.86874"
        strokeLinecap="round"
        style={{ mixBlendMode: "darken" }}
      />
    </svg>
  );
};

const Icon = ({ className, ...rest }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={className}
      {...rest}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
};

// Floating Paths Component (for hero background)
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    color: `rgba(15,23,42,${0.1 + i * 0.03})`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full text-slate-950 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  );
}

// Hero Section with Text Hover Effect
function HeroSection() {
  return (
    <div className="relative min-h-[90vh] w-full flex items-center justify-center overflow-hidden bg-neutral-950">
      {/* Animated Background Paths */}
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">WebGPU Accelerated • 20,000+ Games</span>
          </motion.div>

          {/* Large Text Hover Effect */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="h-[12rem] mb-4"
          >
            <TextHoverEffect text="CHALLENGER" className="text-6xl md:text-8xl" />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto"
          >
            Run Android, Windows, and 20,000+ games directly in your browser.
            No downloads. No installs. Just pure web-native power.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link
              href="/virtual-machines"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-cyan-500 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/25"
            >
              <Cpu className="w-5 h-5" />
              Launch VM
            </Link>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            >
              <Gamepad2 className="w-5 h-5" />
              Play Games
            </Link>
          </motion.div>

          {/* Tech Stack Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="flex flex-wrap justify-center gap-2 mt-10"
          >
            {TECH_STACK.map((tech) => (
              <div
                key={tech.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${tech.color === 'emerald' ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                <span className="text-slate-300">{tech.name}</span>
                <span className={tech.color === 'emerald' ? 'text-emerald-400' : 'text-cyan-400'}>{tech.status}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// Canvas Reveal Section
function CanvasRevealSection() {
  return (
    <section className="py-20 flex flex-col lg:flex-row items-center justify-center bg-neutral-950 w-full gap-4 mx-auto px-8">
      <CanvasCard title="Android Runtime" icon={<AceternityIcon />}>
        <CanvasRevealEffect
          animationSpeed={5.1}
          containerClassName="bg-emerald-900"
        />
      </CanvasCard>
      <CanvasCard title="Windows Engine" icon={<AceternityIcon />}>
        <CanvasRevealEffect
          animationSpeed={3}
          containerClassName="bg-black"
          colors={[
            [236, 72, 153],
            [232, 121, 249],
          ]}
          dotSize={2}
        />
      </CanvasCard>
      <CanvasCard title="GPU Cluster" icon={<AceternityIcon />}>
        <CanvasRevealEffect
          animationSpeed={3}
          containerClassName="bg-sky-600"
          colors={[[125, 211, 252]]}
        />
      </CanvasCard>
    </section>
  );
}

// Main Page Component
export default function LandingPage() {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section with Animated Background */}
      <HeroSection />

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
        {[
          { value: 20000, suffix: '+', label: 'Games Available', color: 'cyan' },
          { value: 100, suffix: '%', label: 'In-Browser', color: 'purple' },
          { value: 2, suffix: '', label: 'OS Compilers', color: 'emerald' },
          { value: 0, suffix: '$', label: 'Cost to Start', color: 'pink' },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-xl border border-cyan-500/10 bg-gradient-to-br from-cyan-500/5 to-transparent p-6 text-center group hover:border-cyan-500/30 transition-all duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
              {stat.value === 0 ? stat.suffix : <AnimatedCounter end={stat.value} suffix={stat.suffix} />}
            </div>
            <div className="text-sm text-slate-400">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Canvas Reveal Section */}
      <CanvasRevealSection />

      {/* Features Grid with Glowing Effect */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Platform Features</h2>
            <p className="text-slate-400">Everything you need to run apps in the cloud</p>
          </div>
          <Link
            href="/account"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, index) => (
            <GlowingFeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </section>

      {/* Architecture Section */}
      <section className="rounded-2xl border border-cyan-500/10 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-emerald-500/5 p-8 mx-4">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">System Architecture</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Android Stack',
              pipeline: 'APK → DEX → Dalvik → WASM',
              details: ['ART Runtime', '218 Dalvik opcodes', 'SurfaceFlinger', 'SystemUI'],
              color: 'emerald',
            },
            {
              title: 'Windows Stack',
              pipeline: 'EXE → PE → x86 → Win32',
              details: ['PE32/PE32+ loader', 'Kernel32', 'User32', 'GDI/DirectX'],
              color: 'cyan',
            },
            {
              title: 'GPU Acceleration',
              pipeline: 'WebGPU Compute + Render',
              details: ['Persistent kernels', 'Parallel compilation', 'DirectX translation', 'Compute shaders'],
              color: 'purple',
            },
          ].map((stack) => (
            <div
              key={stack.title}
              className="rounded-xl border border-white/10 bg-white/5 p-6 hover:border-cyan-500/30 transition-all duration-300"
            >
              <h3 className={`text-sm font-semibold text-${stack.color}-400 mb-3 uppercase tracking-wider`}>
                {stack.title}
              </h3>
              <div className="text-lg font-mono text-white mb-4">{stack.pipeline}</div>
              <ul className="space-y-2">
                {stack.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-2 text-sm text-slate-400">
                    <div className={`w-1 h-1 rounded-full bg-${stack.color}-400`} />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden rounded-2xl mx-4">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />
        
        <div className="relative px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Dive In?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            Join thousands of users running native apps on the open web. 
            No installation required.
          </p>
          <Link
            href="/account"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-cyan-600 font-bold rounded-xl hover:bg-cyan-50 transition-all duration-200 hover:shadow-xl"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}