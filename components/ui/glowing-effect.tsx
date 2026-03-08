"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface GlowingEffectProps {
  children: React.ReactNode;
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  variant?: "default" | "center";
  glow?: boolean;
  className?: string;
  disabled?: boolean;
  movementDuration?: number;
  borderWidth?: number;
}

export function GlowingEffect({
  children,
  blur = 0,
  inactiveZone = 0.7,
  proximity = 100,
  spread = 20,
  variant = "default",
  glow = true,
  className,
  disabled = false,
  movementDuration = 2,
  borderWidth = 1,
}: GlowingEffectProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovered, setIsHovered] = React.useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || disabled) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const background = useMotionTemplate`
    radial-gradient(
      ${spread}px circle at ${mouseX}px ${mouseY}px,
      rgba(255, 255, 255, 0.15),
      transparent 80%
    )
  `;

  const glowGradient = useMotionTemplate`
    radial-gradient(
      ${proximity}px circle at ${mouseX}px ${mouseY}px,
      rgba(255, 255, 255, 0.1),
      transparent 80%
    )
  `;

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect layer */}
      {glow && !disabled && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-inherit"
          style={{
            background: glowGradient,
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: movementDuration / 2 }}
        />
      )}

      {/* Border glow effect */}
      {!disabled && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-inherit"
          style={{
            background,
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: movementDuration / 4 }}
        />
      )}

      {/* Border ring */}
      {!disabled && (
        <div
          className="pointer-events-none absolute inset-0 rounded-inherit"
          style={{
            border: `${borderWidth}px solid transparent`,
            background: `
              linear-gradient(var(--background), var(--background)) padding-box,
              linear-gradient(
                ${variant === "center" ? "135deg" : "180deg"},
                rgba(255, 255, 255, 0.1) 0%,
                rgba(255, 255, 255, 0.05) 50%,
                transparent 100%
              ) border-box
            `,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Simpler glow border component
export function GlowBorder({
  children,
  className,
  glowColor = "rgba(255, 255, 255, 0.15)",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  return (
    <div className={cn("relative group", className)}>
      {/* Animated border */}
      <div
        className="absolute -inset-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)`,
          filter: "blur(8px)",
        }}
      />

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}

// Spotlight effect
export function SpotlightEffect({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const spotlight = useMotionTemplate`
    radial-gradient(
      400px circle at ${mouseX}px ${mouseY}px,
      rgba(255, 255, 255, 0.03),
      transparent 80%
    )
  `;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: spotlight }}
      />
      {children}
    </div>
  );
}