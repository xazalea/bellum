"use client";

import React, { useRef, useState } from "react";
import { motion, useAnimationFrame } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextHoverEffectProps {
  text: string;
  className?: string;
}

export function TextHoverEffect({ text, className }: TextHoverEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center justify-center w-full h-full",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <filter id="text-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient
            id="hover-gradient"
            cx={mousePosition.x}
            cy={mousePosition.y}
            r="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#00d9ff" />
            <stop offset="50%" stopColor="#9d79ff" />
            <stop offset="100%" stopColor="#00e6b8" />
          </radialGradient>
          <mask id="text-mask">
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              className="text-[8rem] font-bold fill-white"
              style={{ fontFamily: "inherit" }}
            >
              {text}
            </text>
          </mask>
        </defs>

        {/* Background text */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="text-[8rem] font-bold fill-neutral-800 select-none"
          style={{ fontFamily: "inherit" }}
        >
          {text}
        </text>

        {/* Hover effect text */}
        <motion.text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="text-[8rem] font-bold select-none"
          style={{
            fontFamily: "inherit",
            fill: isHovered ? "url(#hover-gradient)" : "transparent",
            filter: isHovered ? "url(#text-glow)" : "none",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {text}
        </motion.text>

        {/* Outline text */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="text-[8rem] font-bold select-none"
          style={{
            fontFamily: "inherit",
            fill: "transparent",
            stroke: isHovered ? "#00d9ff" : "#3f3f46",
            strokeWidth: 1,
          }}
        >
          {text}
        </text>
      </svg>
    </div>
  );
}