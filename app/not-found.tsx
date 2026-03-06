"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { GradientButton } from "@/components/ui/hover-border-gradient";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <BackgroundPaths className="min-h-screen">
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[150px] md:text-[200px] font-light text-white/10 leading-none"
          >
            404
          </motion.div>
          
          <h1 className="text-3xl md:text-4xl font-light text-white/90 mb-4 -mt-8">
            Page Not Found
          </h1>
          
          <p className="text-white/50 text-lg font-light mb-12 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved to deeper waters.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <Link href="/">
            <GradientButton variant="primary">
              <Home className="w-4 h-4 mr-2" />
              Back Home
            </GradientButton>
          </Link>
          <button onClick={() => window.history.back()}>
            <GradientButton variant="secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </GradientButton>
          </button>
        </motion.div>
      </div>
    </BackgroundPaths>
  );
}