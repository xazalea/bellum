"use client";

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface GlowingEffectProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  hoverColor?: string;
  borderWidth?: number;
}

export function GlowingEffect({
  children,
  className,
  glowColor = "rgba(255, 255, 255, 0.15)",
  hoverColor = "rgba(255, 255, 255, 0.3)",
  borderWidth = 1,
}: GlowingEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [isMounted]);

  if (!isMounted) {
    return (
      <div className={cn("relative", className)}>
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative group", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-lg transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${
            isHovered ? hoverColor : glowColor
          }, transparent 40%)`,
          opacity: isHovered ? 1 : 0.5,
        }}
      />
      
      {/* Border gradient */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          padding: `${borderWidth}px`,
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.2), transparent 40%)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

interface GlowingCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlowingCard({ children, className }: GlowingCardProps) {
  return (
    <GlowingEffect className={cn("rounded-lg", className)}>
      <div className="bg-zinc-900/80 backdrop-blur-sm rounded-lg p-6 border border-white/5">
        {children}
      </div>
    </GlowingEffect>
  );
}