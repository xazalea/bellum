"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextHoverEffectProps {
  text: string;
  className?: string;
  duration?: number;
}

export function TextHoverEffect({
  text,
  className,
  duration = 0.5,
}: TextHoverEffectProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn("relative cursor-pointer", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 300 50"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="50%" stopColor="#a0a0a0" />
            <stop offset="100%" stopColor="#fff" />
          </linearGradient>
          <linearGradient
            id="hoverGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <motion.stop
              offset="0%"
              animate={{
                stopColor: isHovered ? "#60a5fa" : "#fff",
              }}
              transition={{ duration }}
            />
            <motion.stop
              offset="50%"
              animate={{
                stopColor: isHovered ? "#a78bfa" : "#a0a0a0",
              }}
              transition={{ duration }}
            />
            <motion.stop
              offset="100%"
              animate={{
                stopColor: isHovered ? "#f472b6" : "#fff",
              }}
              transition={{ duration }}
            />
          </linearGradient>
        </defs>

        {/* Base text */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="url(#textGradient)"
          className="text-[40px] font-light select-none"
          style={{ opacity: isHovered ? 0 : 1, transition: "opacity 0.3s" }}
        >
          {text}
        </text>

        {/* Hover text with gradient animation */}
        <motion.text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="url(#hoverGradient)"
          className="text-[40px] font-light select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {text}
        </motion.text>
      </svg>
    </div>
  );
}

interface TextRevealProps {
  text: string;
  className?: string;
}

export function TextReveal({ text, className }: TextRevealProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="relative"
        initial={{ y: 0 }}
        animate={{ y: isHovered ? "-100%" : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <span className="block text-white/70">{text}</span>
      </motion.div>
      <motion.div
        className="absolute inset-0"
        initial={{ y: "100%" }}
        animate={{ y: isHovered ? 0 : "100%" }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <span className="block text-white">{text}</span>
      </motion.div>
    </div>
  );
}