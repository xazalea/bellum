"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface TextHoverEffectProps {
  text: string;
  duration?: number;
  className?: string;
}

export function TextHoverEffect({
  text,
  duration = 0.5,
  className = "",
}: TextHoverEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative cursor-default overflow-hidden", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Base text */}
      <span className="relative z-10 block text-2xl sm:text-3xl md:text-4xl font-light tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-neutral-200 to-neutral-500">
        {text}
      </span>

      {/* Hover gradient overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) =>
              `radial-gradient(300px circle at ${x}px ${y}px, rgba(255,255,255,0.15), transparent 40%)`
          ),
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />
    </div>
  );
}

// Letter-by-letter animation for large headers
export function TextHoverEffectLetters({
  text,
  duration = 0.3,
  className = "",
}: TextHoverEffectProps) {
  const letters = text.split("");

  return (
    <div className={cn("flex items-center justify-center flex-wrap", className)}>
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          className="inline-block font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-white cursor-default"
          initial={{ y: 0 }}
          whileHover={{
            y: -10,
            color: "#a0a0a0",
            transition: { duration },
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 10,
          }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </div>
  );
}

// Gradient text with shimmer effect
export function TextHoverEffectShimmer({
  text,
  duration = 3,
  className = "",
}: TextHoverEffectProps) {
  return (
    <div className={cn("relative", className)}>
      <motion.h1
        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-200 via-white to-neutral-200"
        style={{
          backgroundSize: "200% 100%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "200% 0%"],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {text}
      </motion.h1>
    </div>
  );
}

// Per-letter hover with magnetic effect
export function MagneticText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex items-center justify-center flex-wrap cursor-default", className)}
    >
      {text.split("").map((letter, i) => (
        <MagneticLetter key={i} letter={letter} containerRef={containerRef} />
      ))}
    </div>
  );
}

function MagneticLetter({
  letter,
  containerRef,
}: {
  letter: string;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 100;
    
    if (distance < maxDistance) {
      const factor = 1 - distance / maxDistance;
      x.set(deltaX * factor * 0.4);
      y.set(deltaY * factor * 0.4);
    } else {
      x.set(0);
      y.set(0);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span
      ref={ref}
      className="inline-block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-white hover:text-neutral-300 transition-colors"
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {letter === " " ? "\u00A0" : letter}
    </motion.span>
  );
}

// Outline text effect with hover fill
export function OutlineText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={cn("relative group cursor-pointer", className)}>
      {/* Outline */}
      <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.3)] transition-all duration-300 group-hover:[-webkit-text-stroke:1px_rgba(255,255,255,0.8)]">
        {text}
      </span>
      
      {/* Fill on hover */}
      <span className="absolute inset-0 text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {text}
      </span>
    </div>
  );
}