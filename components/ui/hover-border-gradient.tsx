"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HoverBorderGradientProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  as?: React.ElementType;
}

export function HoverBorderGradient({
  children,
  className,
  containerClassName,
  as: Tag = "button",
  ...props
}: HoverBorderGradientProps) {
  return (
    <div
      className={cn(
        "relative group rounded-full p-[1px] overflow-hidden",
        containerClassName
      )}
    >
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(90deg, #4f46e5, #7c3aed, #ec4899, #4f46e5)",
          backgroundSize: "300% 100%",
        }}
        initial={{ backgroundPosition: "0% 0%" }}
        animate={{ backgroundPosition: "100% 0%" }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Inner content background */}
      <Tag
        className={cn(
          "relative z-10 px-6 py-2 rounded-full bg-black text-white text-sm font-medium",
          "transition-all duration-300",
          "group-hover:bg-black/90",
          className
        )}
        {...props}
      >
        {children}
      </Tag>
    </div>
  );
}

interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function GradientButton({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: GradientButtonProps) {
  const sizeClasses = {
    sm: "px-4 py-1.5 text-xs",
    md: "px-6 py-2 text-sm",
    lg: "px-8 py-3 text-base",
  };

  if (variant === "primary") {
    return (
      <HoverBorderGradient className={cn(sizeClasses[size], className)} {...props}>
        {children}
      </HoverBorderGradient>
    );
  }

  if (variant === "secondary") {
    return (
      <button
        className={cn(
          "relative px-6 py-2 rounded-full text-sm font-medium",
          "bg-white/5 border border-white/10",
          "text-white/80 hover:text-white hover:bg-white/10",
          "transition-all duration-300",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      className={cn(
        "relative px-6 py-2 rounded-full text-sm font-medium",
        "text-white/60 hover:text-white hover:bg-white/5",
        "transition-all duration-300",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default HoverBorderGradient;