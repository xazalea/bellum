"use client";

import { motion, useMotionControls, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
      className={`relative cursor-default ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 200"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient
            id="text-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#a0a0a0" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <radialGradient
            id="hover-gradient"
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#606060" />
          </radialGradient>
          <mask id="text-mask">
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              className="font-bold"
              style={{
                fontSize: "120px",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {text}
            </text>
          </mask>
        </defs>

        {/* Base text */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="url(#text-gradient)"
          className="font-bold"
          style={{
            fontSize: "120px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {text}
        </text>

        {/* Hover effect overlay */}
        <motion.text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="url(#hover-gradient)"
          className="font-bold"
          style={{
            fontSize: "120px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            opacity: isHovered ? 1 : 0,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration }}
        />
      </svg>

      {/* Animated glow effect on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isHovered
            ? `radial-gradient(600px circle at ${mouseX.get()}px ${mouseY.get()}px, rgba(255,255,255,0.06), transparent 40%)`
            : "none",
        }}
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

// Alternative simpler version with letter-by-letter animation
export function TextHoverEffectLetters({
  text,
  duration = 0.3,
  className = "",
}: TextHoverEffectProps) {
  const letters = text.split("");

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          className="inline-block font-bold text-7xl md:text-8xl lg:text-9xl text-white cursor-default"
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
  duration = 2,
  className = "",
}: TextHoverEffectProps) {
  return (
    <div className={`relative ${className}`}>
      <motion.h1
        className="text-7xl md:text-8xl lg:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-400 to-white"
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