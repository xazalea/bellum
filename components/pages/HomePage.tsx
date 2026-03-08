"use client";

import { motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { HoverBorderGradient, GradientButton } from "@/components/ui/hover-border-gradient";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { DynamicIslandNav } from "@/components/layout/DynamicIslandNav";
import { ArrowRight, Gamepad2, Smartphone, Monitor, Sparkles } from "lucide-react";
import Link from "next/link";

export function HomePage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background */}
      <BackgroundPaths />

      {/* Navigation */}
      <DynamicIslandNav />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Hero section */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Subtitle */}
          <motion.div
            className="flex items-center justify-center gap-2 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Sparkles className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/60 font-medium tracking-wider uppercase">
              Welcome to the depths
            </span>
          </motion.div>

          {/* Main title with hover effect */}
          <div className="h-[40rem] flex items-center justify-center">
            <TextHoverEffect text="challenger deep." />
          </div>

          {/* Description */}
          <motion.p
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Play 20,000+ games instantly in your browser. Run Android and Windows apps
            without downloads. Experience the future of cloud computing.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <HoverBorderGradient
              containerClassName="w-full sm:w-auto"
            >
              <Link href="/games" className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5" />
                Play Games
                <ArrowRight className="w-4 h-4" />
              </Link>
            </HoverBorderGradient>

            <GradientButton className="w-full sm:w-auto">
              <Link href="/android" className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Android Apps
              </Link>
            </GradientButton>
          </motion.div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl w-full"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <FeatureCard
            icon={<Gamepad2 className="w-6 h-6" />}
            title="20,000+ Games"
            description="Play HTML5, Flash, and classic games instantly. No downloads, no installs."
            href="/games"
          />
          <FeatureCard
            icon={<Smartphone className="w-6 h-6" />}
            title="Android Apps"
            description="Run your favorite Android apps in the browser with full compatibility."
            href="/android"
          />
          <FeatureCard
            icon={<Monitor className="w-6 h-6" />}
            title="Windows Apps"
            description="Launch Windows applications directly from your browser."
            href="/windows"
          />
        </motion.div>

        {/* Stats */}
        <motion.div
          className="flex items-center justify-center gap-8 md:gap-16 mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <Stat value="20K+" label="Games" />
          <Stat value="100+" label="Apps" />
          <Stat value="1M+" label="Users" />
          <Stat value="99.9%" label="Uptime" />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-white/60"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </div>
  );
}

// Feature card component
function FeatureCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <GlowingEffect className="rounded-xl h-full">
        <motion.div
          className="relative p-6 rounded-xl bg-card/50 border border-white/5 backdrop-blur-sm h-full cursor-pointer"
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white mb-4">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-white/50">{description}</p>
        </motion.div>
      </GlowingEffect>
    </Link>
  );
}

// Stat component
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-white/40">{label}</div>
    </div>
  );
}