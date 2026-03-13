"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { MinimalNavIsland } from "@/components/ui/dynamic-island";
import { Button } from "@/components/ui/button";
import { Gamepad2, Smartphone, Monitor, Sparkles, ArrowRight, Play, ChevronLeft, ChevronRight, Plus } from "lucide-react";

// Animated particle for hero background
function Particle({ delay = 0 }: { delay?: number }) {
  const style = {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    width: `${Math.random() * 4 + 2}px`,
    height: `${Math.random() * 4 + 2}px`,
  };

  return (
    <motion.div
      className="absolute rounded-full bg-white/20"
      style={style}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
        y: [0, -100 - Math.random() * 100],
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        delay: delay + Math.random() * 2,
        ease: "easeOut",
      }}
    />
  );
}

// Animated particles background
function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 50 }).map((_, i) => (
        <Particle key={i} delay={i * 0.1} />
      ))}
    </div>
  );
}

// 3D Tilt Card component
function TiltCard({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div style={{ transform: "translateZ(50px)" }} className="h-full">
        {children}
      </div>
    </motion.div>
  );
}

// Animated counter component
function AnimatedCounter({ 
  value, 
  duration = 2,
  suffix = ""
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
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, value, duration]);

  return (
    <div ref={ref}>
      {count.toLocaleString()}{suffix}
    </div>
  );
}

// Recent games carousel
function RecentGamesCarousel() {
  const [games, setGames] = useState<Array<{
    id: string;
    name: string;
    thumbnail: string;
    plays: number;
  }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRecentGames = async () => {
      try {
        const response = await fetch('/api/games?limit=10');
        if (response.ok) {
          const data = await response.json();
          setGames((data.games || data || []).slice(0, 8).map((g: any) => ({
            id: g.id || g.game_id,
            name: g.name || g.title || 'Unknown Game',
            thumbnail: g.thumbnail || g.image || `/api/proxy/game/${g.id || g.game_id}/thumbnail`,
            plays: g.plays || g.play_count || Math.floor(Math.random() * 100000)
          })));
        }
      } catch (error) {
        console.error('Failed to fetch recent games:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentGames();
  }, []);

  const scrollToIndex = (index: number) => {
    if (!carouselRef.current) return;
    const cardWidth = carouselRef.current.querySelector('div')?.offsetWidth || 200;
    carouselRef.current.scrollTo({
      left: index * (cardWidth + 16),
      behavior: 'smooth'
    });
    setCurrentIndex(index);
  };

  const handlePrev = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = Math.min(games.length - 1, currentIndex + 1);
    scrollToIndex(newIndex);
  };

  const formatPlays = (plays: number) => {
    if (plays >= 1000000) return `${(plays / 1000000).toFixed(1)}M`;
    if (plays >= 1000) return `${(plays / 1000).toFixed(1)}K`;
    return plays.toString();
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Games</h3>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48 h-32 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Recent Games</h3>
        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous games"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex >= games.length - 1}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next games"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      
      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/play?id=${game.id}`}
            className="flex-shrink-0 group"
          >
            <div className="relative w-48 h-32 rounded-lg overflow-hidden bg-white/5">
              <img
                src={game.thumbnail}
                alt={game.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm font-medium text-white truncate">{game.name}</p>
                <p className="text-xs text-neutral-400">{formatPlays(game.plays)} plays</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <Play className="w-6 h-6 text-white" fill="white" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Floating Action Button
function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const actions = [
    { icon: Gamepad2, label: "Games", href: "/games" },
    { icon: Smartphone, label: "Android", href: "/android" },
    { icon: Monitor, label: "Windows", href: "/windows" },
    { icon: Sparkles, label: "AI", href: "/ai" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
      {/* Action items */}
      <AnimatePresence>
        {isOpen && actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
              router.push(action.href);
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-sm hover:bg-white/20 transition-colors"
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        whileTap={{ scale: 0.95 }}
        aria-label="Quick actions"
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}

export function HomePage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background Effect with Particles */}
      <BackgroundRippleEffect />
      <ParticleField />
      
      {/* Navigation */}
      <MinimalNavIsland currentPath="/" onNavigate={(path) => router.push(path)} />
      
      {/* Main Content */}
      <main className="relative z-10 mx-auto grid w-full max-w-7xl gap-16 px-4 py-24 md:px-6 md:py-32">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center animate-fade-in">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-neutral-400 bg-clip-text text-transparent">
                CHALLENGER
              </span>
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-6"
          >
            <p className="text-xl md:text-2xl text-neutral-400">
              challenger deep.
            </p>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl text-lg text-neutral-400 md:text-xl"
          >
            Play <span className="text-white">20,000+ browser games</span> and run Android, Windows, and AI workloads end-to-end.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <Button asChild size="lg" className="bg-white text-black hover:bg-neutral-200">
              <Link href="/games" className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Open Games
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
              <Link href="/android">Android Runner</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
              <Link href="/windows">Windows Runner</Link>
            </Button>
          </motion.div>
        </section>

        {/* Features Grid with 3D Tilt */}
        <section className="grid gap-4 md:grid-cols-3" style={{ perspective: "1000px" }}>
          {[
            {
              title: "Games",
              description: "Catalog + proxy player with real `/api/games` and `/api/proxy/game` flow.",
              icon: Gamepad2,
              href: "/games",
              gradient: "from-purple-500/20 to-pink-500/20",
            },
            {
              title: "Android & Windows",
              description: "Upload, install, list, launch, and remove apps against live storage and app records.",
              icon: Smartphone,
              href: "/android",
              gradient: "from-blue-500/20 to-cyan-500/20",
            },
            {
              title: "AI via gpt4free",
              description: "Model/site supports and chat completion APIs backed by gpt4free providers.",
              icon: Sparkles,
              href: "/ai",
              gradient: "from-amber-500/20 to-orange-500/20",
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
            >
              <TiltCard className="h-full">
                <Link href={feature.href} className="block h-full">
                  <div className="group relative rounded-xl overflow-hidden h-full">
                    {/* Gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    {/* Glowing border effect */}
                    <div className="absolute -inset-px bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                    
                    <div className="relative p-6 border border-white/10 bg-neutral-900/80 backdrop-blur-xl group-hover:border-white/20 transition-colors h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-white/5">
                          <feature.icon className="h-5 w-5 text-white" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-neutral-400 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </Link>
              </TiltCard>
            </motion.div>
          ))}
        </section>

        {/* Stats Section with Animated Counters */}
        <section className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="inline-flex gap-8 md:gap-16"
          >
            {[
              { label: "Games", value: 20000, suffix: "+" },
              { label: "Platforms", value: 3 },
              { label: "Real APIs", value: 100, suffix: "%" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-neutral-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Recent Games Carousel */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <RecentGamesCarousel />
          </motion.div>
        </section>
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
}