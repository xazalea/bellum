"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface HoverBorderGradientProps {
  children: React.ReactNode;
  containerClassName?: string;
  className?: string;
  as?: React.ElementType;
  duration?: number;
  clockwise?: boolean;
  onClick?: () => void;
  href?: string;
}

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 8,
  clockwise = true,
  onClick,
  href,
}: HoverBorderGradientProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const gradientTransform = clockwise
    ? "rotate(0deg)"
    : "rotate(360deg)";

  const gradientTransformHover = clockwise
    ? "rotate(360deg)"
    : "rotate(0deg)";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center p-[1px] rounded-xl overflow-hidden",
        containerClassName
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          background: `
            conic-gradient(
              from 0deg,
              transparent 0%,
              rgba(255, 255, 255, 0.1) 10%,
              transparent 20%,
              rgba(255, 255, 255, 0.1) 30%,
              transparent 40%,
              rgba(255, 255, 255, 0.1) 50%,
              transparent 60%,
              rgba(255, 255, 255, 0.1) 70%,
              transparent 80%,
              rgba(255, 255, 255, 0.1) 90%,
              transparent 100%
            )
          `,
        }}
        initial={{ transform: gradientTransform }}
        animate={{
          transform: isHovered ? gradientTransformHover : gradientTransform,
        }}
        transition={{
          duration: duration,
          ease: "linear",
          repeat: Infinity,
        }}
      />

      {/* Inner background */}
      <div
        className={cn(
          "relative z-10 w-full h-full bg-background rounded-xl",
          className
        )}
      >
        <Tag
          className="w-full h-full flex items-center justify-center px-6 py-3 text-white font-medium rounded-xl transition-colors hover:text-white/90"
          onClick={onClick}
          href={href}
        >
          {children}
        </Tag>
      </div>
    </div>
  );
}

// Alternative with solid gradient
export function HoverBorderGradientSolid({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  onClick,
  href,
}: HoverBorderGradientProps) {
  return (
    <div
      className={cn(
        "relative group flex items-center justify-center rounded-xl overflow-hidden",
        containerClassName
      )}
    >
      {/* Gradient border */}
      <div
        className="absolute inset-0 rounded-xl p-[1px]"
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))`,
        }}
      />

      {/* Animated glow on hover */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))`,
          filter: "blur(4px)",
        }}
      />

      {/* Content */}
      <Tag
        className={cn(
          "relative z-10 w-full h-full flex items-center justify-center px-6 py-3 bg-background rounded-xl text-white font-medium transition-all group-hover:bg-background/90",
          className
        )}
        onClick={onClick}
        href={href}
      >
        {children}
      </Tag>
    </div>
  );
}

// Simple gradient button
export function GradientButton({
  children,
  className,
  onClick,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}) {
  const Tag = href ? "a" : "button";

  return (
    <motion.div
      className={cn("relative group", className)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Glow effect */}
      <div
        className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.2), transparent)",
        }}
      />

      {/* Button */}
      <Tag
        className="relative px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium transition-all hover:bg-white/10 hover:border-white/20"
        onClick={onClick}
        href={href}
      >
        {children}
      </Tag>
    </motion.div>
  );
}