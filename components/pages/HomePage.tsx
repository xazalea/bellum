"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Spotlight } from "@/components/ui/spotlight";
import { SpotlightCard } from "@/components/ui/spotlight";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { Button } from "@/components/ui/button";
import {
  Gamepad2,
  Smartphone,
  Monitor,
  Sparkles,
  ArrowRight,
  Play,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Globe,
  Zap,
  Shield,
} from "lucide-react";

// ─── Animated Counter ──────────────────────────────────────────────────────
function AnimatedCounter({
  value,
  duration = 2,
  suffix = "",
}: {
  value: number;
  duration?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTime: number;
    let animationFrame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * value));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, value, duration]);

  return (
    <div ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </div>
  );
}

// ─── Seeded random for stable stats ─────────────────────────────────────────
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return ((hash & 0x7fffffff) % 10000) / 10000;
}

// ─── Games Carousel ─────────────────────────────────────────────────────────
function RecentGamesCarousel() {
  const [games, setGames] = useState<
    Array<{ id: string; name: string; thumbnail: string; plays: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRecentGames = async () => {
      try {
        const response = await fetch("/api/games?limit=12");
        if (response.ok) {
          const data = await response.json();
          setGames(
            (data.games || data || []).slice(0, 12).map((g: any) => ({
              id: g.id || g.game_id,
              name: g.name || g.title || "Unknown Game",
              thumbnail:
                g.thumbnail ||
                g.image ||
                `https://img.gamedistribution.com/${g.id || g.game_id}.jpg`,
              plays: Math.floor(seededRandom(g.id || g.game_id || "") * 500000 + 1000),
            }))
          );
        }
      } catch {
        // Silently fail - will show empty state
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecentGames();
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = direction === "left" ? -320 : 320;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const formatPlays = (plays: number) => {
    if (plays >= 1000000) return `${(plays / 1000000).toFixed(1)}M`;
    if (plays >= 1000) return `${(plays / 1000).toFixed(1)}K`;
    return plays.toString();
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Trending Now</h3>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-56 h-36 bg-white/5 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (games.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Trending Now</h3>
          <p className="text-sm text-neutral-500 mt-1">Most played games this week</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:border-white/20"
            aria-label="Previous games"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:border-white/20"
            aria-label="Next games"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {games.map((game) => (
          <Link key={game.id} href={`/play?id=${game.id}`} className="flex-shrink-0 group">
            <div className="relative w-56 h-36 rounded-2xl overflow-hidden bg-neutral-900 border border-white/5 hover:border-white/20 transition-all duration-300 hover:scale-[1.02]">
              <img
                src={game.thumbnail}
                alt={game.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm font-semibold text-white truncate">{game.name}</p>
                <p className="text-xs text-neutral-400">
                  {formatPlays(game.plays)} plays
                </p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="p-3 rounded-full bg-orange-500/80 backdrop-blur-sm shadow-lg shadow-orange-500/25">
                  <Play className="w-5 h-5 text-white" fill="white" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export function HomePage() {
  const router = useRouter();

  const navItems = [
    { name: "Home", link: "/", icon: <Globe className="w-4 h-4" /> },
    { name: "Games", link: "/games", icon: <Gamepad2 className="w-4 h-4" /> },
    { name: "Android", link: "/android", icon: <Smartphone className="w-4 h-4" /> },
    { name: "Windows", link: "/windows", icon: <Monitor className="w-4 h-4" /> },
    { name: "AI", link: "/ai", icon: <Sparkles className="w-4 h-4" /> },
  ];

  const features = [
    {
      title: "Instant Game Library",
      description:
        "20,000+ HTML5 games playable in your browser with zero downloads. Jump right in.",
      icon: <Gamepad2 className="h-5 w-5 text-orange-400" />,
      href: "/games",
      gradient: "from-orange-500/20 to-amber-500/20",
    },
    {
      title: "Android Runtime",
      description:
        "Upload and run APK files in a sandboxed Android environment powered by WebGPU.",
      icon: <Smartphone className="h-5 w-5 text-green-400" />,
      href: "/android",
      gradient: "from-green-500/20 to-emerald-500/20",
    },
    {
      title: "Windows Runtime",
      description:
        "Launch EXE applications in a browser-based NT environment with GPU acceleration.",
      icon: <Monitor className="h-5 w-5 text-blue-400" />,
      href: "/windows",
      gradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
      title: "AI Assistant",
      description:
        "Powered by GLM-4, Gemini, and GPT4Free with automatic provider failover.",
      icon: <Sparkles className="h-5 w-5 text-purple-400" />,
      href: "/ai",
      gradient: "from-purple-500/20 to-pink-500/20",
    },
    {
      title: "Cloud Persistence",
      description:
        "Your save data, uploaded apps, and preferences sync via Discord and Telegram cloud storage.",
      icon: <Shield className="h-5 w-5 text-cyan-400" />,
      href: "/games",
      gradient: "from-cyan-500/20 to-teal-500/20",
    },
    {
      title: "Zero Latency",
      description:
        "All computation runs locally in your browser. No server round-trips, no waiting.",
      icon: <Zap className="h-5 w-5 text-yellow-400" />,
      href: "/games",
      gradient: "from-yellow-500/20 to-orange-500/20",
    },
  ];

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background Effects */}
      <BackgroundBeams />
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="rgba(249, 115, 22, 0.5)" />

      {/* Floating Navigation */}
      <FloatingNav navItems={navItems} />

      {/* Main Content */}
      <main className="relative z-10 mx-auto grid w-full max-w-7xl gap-24 px-4 py-32 md:px-6 md:py-40">
        {/* ─── Hero Section ─────────────────────────────────────────── */}
        <section className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium mb-8">
              <Zap className="w-3.5 h-3.5" />
              Now with 20,000+ games and AI
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">
              <span className="bg-gradient-to-b from-white via-white to-neutral-500 bg-clip-text text-transparent">
                CHALLENGER
              </span>
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                DEEP
              </span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <TextGenerateEffect
              words="The ultimate browser-native gaming platform. Play instantly. Run anything. No downloads."
              className="text-lg md:text-xl text-neutral-400 max-w-2xl font-normal"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-black font-semibold hover:from-orange-400 hover:to-amber-400 shadow-lg shadow-orange-500/25 border-0 px-8"
            >
              <Link href="/games" className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Play Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/10 text-white hover:bg-white/5 backdrop-blur-sm"
            >
              <Link href="/android" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Run Android
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/10 text-white hover:bg-white/5 backdrop-blur-sm"
            >
              <Link href="/windows" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Run Windows
              </Link>
            </Button>
          </motion.div>
        </section>

        {/* ─── Stats Strip ──────────────────────────────────────────── */}
        <section className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="inline-flex gap-8 md:gap-16 px-8 py-6 rounded-2xl border border-white/5 bg-neutral-950/50 backdrop-blur-xl"
          >
            {[
              { label: "Games", value: 20000, suffix: "+" },
              { label: "Platforms", value: 3 },
              { label: "AI Models", value: 12, suffix: "+" },
              { label: "Uptime", value: 100, suffix: "%" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-black bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ─── Features Grid ────────────────────────────────────────── */}
        <section>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Everything you need
            </h2>
            <p className="text-neutral-500 max-w-lg mx-auto">
              A complete platform for gaming, app execution, and AI — all running natively in your browser.
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.1 + index * 0.08 }}
              >
                <SpotlightCard className="h-full">
                  <Link href={feature.href} className="block p-6 h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${feature.gradient}`}>
                        {feature.icon}
                      </div>
                      <ArrowRight className="h-4 w-4 text-neutral-600 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </Link>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Games Carousel ──────────────────────────────────────── */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.5 }}
          >
            <RecentGamesCarousel />
          </motion.div>
        </section>

        {/* ─── CTA ─────────────────────────────────────────────────── */}
        <section className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.7 }}
            className="relative p-12 rounded-3xl border border-white/5 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.08),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Start playing now
              </h2>
              <p className="text-neutral-400 mb-8 max-w-md mx-auto">
                No account required. No downloads. Just click and play.
              </p>
              <Button
                asChild
                size="lg"
                className="bg-white text-black font-semibold hover:bg-neutral-200 px-10"
              >
                <Link href="/games" className="flex items-center gap-2">
                  <Play className="h-4 w-4" fill="black" />
                  Browse Games
                </Link>
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">
            © 2024 Challenger Deep. All games are property of their respective owners.
          </p>
          <div className="flex gap-6 text-sm text-neutral-600">
            <Link href="/games" className="hover:text-white transition-colors">
              Games
            </Link>
            <Link href="/android" className="hover:text-white transition-colors">
              Android
            </Link>
            <Link href="/windows" className="hover:text-white transition-colors">
              Windows
            </Link>
            <Link href="/ai" className="hover:text-white transition-colors">
              AI
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}