"use client";

import { motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { GradientButton } from "@/components/ui/hover-border-gradient";
import Link from "next/link";

export default function HomePage() {
  return (
    <BackgroundPaths className="min-h-screen">
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-light tracking-tight text-white/90 mb-4">
            challenger deep.
          </h1>
          <p className="text-lg md:text-xl text-white/50 font-light mb-12">
            the deepest point in the digital ocean
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <Link href="/games">
            <GradientButton variant="primary" size="lg">
              Explore Games
            </GradientButton>
          </Link>
          <Link href="/android">
            <GradientButton variant="secondary" size="lg">
              Android Apps
            </GradientButton>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2 text-white/30">
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1"
            >
              <motion.div className="w-1 h-2 rounded-full bg-white/40" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </BackgroundPaths>
  );
}