"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BackgroundRippleEffectProps {
  className?: string;
  children?: React.ReactNode;
}

export function BackgroundRippleEffect({ className, children }: BackgroundRippleEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 overflow-hidden bg-black",
        className
      )}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Ripple boxes */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute border border-white/5"
            style={{
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              borderRadius: "4px",
            }}
            initial={{ opacity: 0.1, scale: 1 }}
            animate={{
              opacity: [0.05, 0.15, 0.05],
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Radial glow following mouse */}
      <motion.div
        className="pointer-events-none absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
          left: mousePosition.x - 300,
          top: mousePosition.y - 300,
        }}
      />

      {/* Corner glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-radial from-white/5 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-white/5 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      {children}
    </div>
  );
}

// Background boxes effect (alternative)
export function BackgroundBoxes({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-black", className)}>
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 gap-0.5 p-4">
        {Array.from({ length: 144 }).map((_, i) => (
          <motion.div
            key={i}
            className="relative border border-white/5 bg-white/[0.02] rounded-sm"
            whileHover={{
              backgroundColor: "rgba(255,255,255,0.1)",
              borderColor: "rgba(255,255,255,0.2)",
            }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black pointer-events-none" />
    </div>
  );
}

// Spotlight background effect
export function SpotlightBackground({ className }: { className?: string }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden bg-black", className)}
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-black to-neutral-950" />
      
      {/* Moving spotlight */}
      <motion.div
        className="pointer-events-none absolute w-[800px] h-[800px]"
        style={{
          background: "radial-gradient(circle, rgba(120,80,200,0.15) 0%, transparent 50%)",
          left: mousePosition.x - 400,
          top: mousePosition.y - 400,
        }}
      />
      
      {/* Static ambient spots */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
    </div>
  );
}