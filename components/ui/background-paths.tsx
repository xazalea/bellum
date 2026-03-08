"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BackgroundPathsProps {
  title?: string;
  className?: string;
}

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 + i * 5 * position} ${216 - i * 6} ${
      152 + i * 5 * position
    } ${343 - i * 6}C${616 + i * 5 * position} ${471 - i * 6} ${
      684 + i * 5 * position
    } ${471 - i * 6} ${684 + i * 5 * position} ${471 - i * 6}`,
    color: `rgba(255,255,255,${0.1 + i * 0.03})`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      style={{
        filter: "blur(1px)",
      }}
    >
      {paths.map((path) => (
        <motion.path
          key={path.id}
          d={path.d}
          stroke={path.color}
          strokeWidth={path.width}
          strokeDasharray="4 4"
          initial={{
            pathLength: 0,
            strokeDashoffset: 0,
          }}
          animate={{
            pathLength: 1,
            strokeDashoffset: -100,
          }}
          transition={{
            duration: 20 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear",
            delay: path.id * 0.1,
          }}
        />
      ))}
    </svg>
  );
}

export function BackgroundPaths({ title, className }: BackgroundPathsProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden bg-background",
        className
      )}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-black/20" />

      {/* Animated paths - two layers for depth */}
      <div className="absolute inset-0 opacity-30">
        <FloatingPaths position={1} />
      </div>
      <div className="absolute inset-0 opacity-20">
        <FloatingPaths position={-1} />
      </div>

      {/* Radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,black_70%)]" />

      {/* Optional title */}
      {title && (
        <div className="relative z-10 flex items-center justify-center h-full">
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white text-center px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {title}
          </motion.h1>
        </div>
      )}
    </div>
  );
}

// Simplified version with just animated lines
export function BackgroundLines({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <svg className="absolute inset-0 w-full h-full opacity-20">
        {Array.from({ length: 20 }, (_, i) => (
          <motion.line
            key={i}
            x1="0%"
            y1={`${i * 5}%`}
            x2="100%"
            y2={`${i * 5 + 10}%`}
            stroke="white"
            strokeWidth="0.5"
            strokeDasharray="8 8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.2,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

// Grid pattern background
export function BackgroundGrid({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,black_80%)]" />
    </div>
  );
}