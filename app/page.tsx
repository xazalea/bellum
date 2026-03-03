'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BackgroundPaths } from '@/components/ui/background-paths';

const FEATURES = [
  {
    title: 'Virtual Machines',
    description: 'Boot full Android or Windows operating systems directly in your browser with native performance.',
    icon: VMIcon,
    href: '/virtual-machines',
    color: 'cyan',
    stats: '2 OS Types',
  },
  {
    title: 'Game Library',
    description: 'Access 20,000+ HTML5 and retro games instantly. No downloads, no installs, just play.',
    icon: GamesIcon,
    href: '/games',
    color: 'purple',
    stats: '20K+ Games',
  },
  {
    title: 'App Decoders',
    description: 'Drop APK or EXE files and watch them decode through dedicated compiler stacks in real-time.',
    icon: DecoderIcon,
    href: '/library',
    color: 'emerald',
    stats: '2 Compilers',
  },
  {
    title: 'AI Assistants',
    description: 'Chat with thousands of AI models including GPT, Claude, Gemini, and more — all for free.',
    icon: AIIcon,
    href: '/ai',
    color: 'pink',
    stats: '1000+ Models',
  },
  {
    title: 'Cloud Storage',
    description: 'Store files securely using distributed cloud infrastructure with global replication.',
    icon: StorageIcon,
    href: '/storage',
    color: 'blue',
    stats: 'Distributed',
  },
  {
    title: 'GPU Cluster',
    description: 'Access high-performance GPU computing for rendering, ML, and compute-intensive tasks.',
    icon: ClusterIcon,
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

// Icon Components
function VMIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function GamesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}

function DecoderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function AIIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function StorageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}

function ClusterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

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

// Feature Card Component
function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const Icon = feature.icon;
  const colorClasses = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400 hover:border-cyan-500/50',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400 hover:border-purple-500/50',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400 hover:border-emerald-500/50',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/30 text-pink-400 hover:border-pink-500/50',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400 hover:border-blue-500/50',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400 hover:border-orange-500/50',
  };

  return (
    <Link
      href={feature.href}
      className={`
        group relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorClasses[feature.color as keyof typeof colorClasses]}
        p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl
        animate-fade-in
      `}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[feature.color as keyof typeof colorClasses]} bg-opacity-20`}>
            <Icon className="w-6 h-6" />
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/5 border border-white/10">
            {feature.stats}
          </span>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
          {feature.title}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          {feature.description}
        </p>

        {/* Action */}
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 group-hover:text-cyan-400 transition-colors">
          <span>Explore</span>
          <ArrowRightIcon className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

// Hero Section with Background Paths
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
            <SparklesIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">WebGPU Accelerated • 20,000+ Games</span>
          </motion.div>

          {/* Title */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter">
            {['Challenger', 'Deep'].map((word, wordIndex) => (
              <span
                key={wordIndex}
                className="inline-block mr-4 last:mr-0"
              >
                {word.split('').map((letter, letterIndex) => (
                  <motion.span
                    key={`${wordIndex}-${letterIndex}`}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: wordIndex * 0.1 + letterIndex * 0.03 + 0.3,
                      type: 'spring',
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="inline-block text-transparent bg-clip-text 
                    bg-gradient-to-r from-neutral-900 to-neutral-700/80 
                    dark:from-white dark:to-white/80"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

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
              <VMIcon className="w-5 h-5" />
              Launch VM
            </Link>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            >
              <GamesIcon className="w-5 h-5" />
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

      {/* Features Grid */}
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
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
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
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}