# Challenger Deep - Complete UI Implementation Prompt

## Project Overview

You are tasked with implementing a complete UI overhaul for **Challenger Deep**, a Next.js application that provides:
- **20,000+ browser games** playable instantly
- **Android app emulation** via WASM
- **Windows app emulation** (including Windows 98)
- **AI chat** using g4f (GPT4Free)
- **Cloud storage** with compression and chunking

## Tech Stack Verification

Before starting, verify the project has:
- ✅ Next.js 14.2.0
- ✅ React 18.3.0
- ✅ TypeScript 5.3.0
- ✅ Tailwind CSS 3.4.1
- ✅ Framer Motion 12.23.24
- ✅ shadcn/ui structure (`/components/ui/`)
- ✅ `@radix-ui/react-slot`
- ✅ `class-variance-authority`
- ✅ `lucide-react` for icons

All dependencies are already installed. The project uses `pnpm` as the package manager.

## Design Philosophy

**CRITICAL: The UI must be DARK and MONOCHROME except where explicitly specified in components.**

- Background: Pure black (#000) or very dark gray
- Text: White with varying opacity (100%, 80%, 50%, 40%)
- Accents: White/gray gradients only (no colors unless in specific components)
- Cards: Semi-transparent with subtle borders
- Animations: Smooth, subtle, professional

## File Structure

```
app/
├── page.tsx                    # Home page (renders HomePage)
├── layout.tsx                  # Root layout
├── globals.css                 # Global styles (already configured)
├── games/
│   └── page.tsx               # Games page (renders GamesPage)
├── android/
│   └── page.tsx               # Android page (renders AndroidPage)
├── windows/
│   └── page.tsx               # Windows page (renders WindowsPage)
├── play/
│   └── page.tsx               # Game player page
└── api/                       # API routes (already implemented)

components/
├── ui/                        # shadcn/ui components
│   ├── background-paths.tsx   # Animated background
│   ├── text-hover-effect.tsx  # Hero text effect
│   ├── dynamic-island.tsx     # Navigation island
│   ├── hover-border-gradient.tsx # Gradient buttons
│   ├── glowing-effect.tsx     # Glowing card effect
│   ├── parallax-scroll.tsx    # Infinite scroll grid
│   ├── button.tsx             # Base button
│   └── badge.tsx              # Badge component
├── layout/
│   └── DynamicIslandNav.tsx   # Navigation wrapper
├── pages/
│   ├── HomePage.tsx           # Home page component
│   ├── GamesPage.tsx          # Games page component
│   ├── AndroidPage.tsx        # Android page component
│   └── WindowsPage.tsx        # Windows page component
├── games/
│   └── GameCard.tsx           # Game card components
└── apps/
    └── AppCard.tsx            # App card components

lib/
├── utils.ts                   # Utility functions (cn, etc.)
├── games-parser.ts            # Games data fetching
├── apps/
│   └── wasm-app-library.ts    # WASM app library
└── storage/
    └── cloud-database.ts      # Cloud storage
```

---

## Component Implementations

### 1. Background Paths (`/components/ui/background-paths.tsx`)

**Purpose**: Animated SVG background with floating paths for ALL pages.

```tsx
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
      style={{ filter: "blur(1px)" }}
    >
      {paths.map((path) => (
        <motion.path
          key={path.id}
          d={path.d}
          stroke={path.color}
          strokeWidth={path.width}
          strokeDasharray="4 4"
          initial={{ pathLength: 0, strokeDashoffset: 0 }}
          animate={{ pathLength: 1, strokeDashoffset: -100 }}
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
    <div className={cn("absolute inset-0 overflow-hidden bg-background", className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-black/20" />
      <div className="absolute inset-0 opacity-30">
        <FloatingPaths position={1} />
      </div>
      <div className="absolute inset-0 opacity-20">
        <FloatingPaths position={-1} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,black_70%)]" />
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
```

---

### 2. Text Hover Effect (`/components/ui/text-hover-effect.tsx`)

**Purpose**: Large animated text "challenger deep." for the home page hero.

```tsx
"use client";

import { motion, useMotionValue, useMotionTemplate } from "framer-motion";
import { useState, useRef } from "react";

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

  const maskImage = useMotionTemplate`radial-gradient(100px circle at ${mouseX}px ${mouseY}px, white, transparent)`;

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
          <linearGradient id="text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#a0a0a0" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <radialGradient id="hover-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#606060" />
          </radialGradient>
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

        {/* Hover reveal */}
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
            maskImage: isHovered ? maskImage : "none",
            WebkitMaskImage: isHovered ? maskImage : "none",
          }}
        >
          {text}
        </motion.text>
      </svg>
    </div>
  );
}
```

---

### 3. Dynamic Island Navigation (`/components/ui/dynamic-island.tsx`)

**Purpose**: Apple-style dynamic island for navigation, appears on all pages.

```tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Home, Gamepad2, Smartphone, Monitor, X } from "lucide-react";

const navItems = [
  { id: "home", label: "Home", icon: <Home className="w-4 h-4" />, href: "/" },
  { id: "games", label: "Games", icon: <Gamepad2 className="w-4 h-4" />, href: "/games" },
  { id: "android", label: "Android", icon: <Smartphone className="w-4 h-4" />, href: "/android" },
  { id: "windows", label: "Windows", icon: <Monitor className="w-4 h-4" />, href: "/windows" },
];

interface NavigationIslandProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

export function NavigationIsland({
  currentPath,
  onNavigate,
  className,
}: NavigationIslandProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      className={cn("fixed top-4 left-1/2 -translate-x-1/2 z-50", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsExpanded(false);
      }}
    >
      <motion.div
        className="dynamic-island relative overflow-hidden cursor-pointer bg-black"
        initial={false}
        animate={{
          width: isExpanded ? "320px" : isHovered ? "200px" : "126px",
          height: isExpanded ? "auto" : "44px",
          borderRadius: isExpanded ? "24px" : "22px",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Collapsed state */}
        <AnimatePresence mode="wait">
          {!isExpanded && (
            <motion.div
              key="collapsed"
              className="absolute inset-0 flex items-center justify-center gap-2 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {navItems.find((item) => item.href === currentPath)?.icon}
              {isHovered && (
                <motion.span
                  className="text-white text-sm font-medium"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                >
                  {navItems.find((item) => item.href === currentPath)?.label}
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded state */}
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              key="expanded"
              className="p-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-white/60 text-xs font-medium">Navigation</span>
                <button
                  className="text-white/60 hover:text-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => (
                  <motion.button
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                      currentPath === item.href
                        ? "bg-white/20 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(item.href);
                      setIsExpanded(false);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Minimal version for inline use
export function MinimalNavIsland({
  currentPath,
  onNavigate,
  className,
}: NavigationIslandProps) {
  return (
    <motion.div className={cn("fixed top-4 left-1/2 -translate-x-1/2 z-50", className)}>
      <motion.div className="dynamic-island flex items-center gap-1 px-2 py-1 bg-black rounded-full">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            className={cn(
              "p-2 rounded-full transition-colors",
              currentPath === item.href
                ? "bg-white/20 text-white"
                : "text-white/40 hover:text-white/80"
            )}
            onClick={() => onNavigate(item.href)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {item.icon}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

export { navItems };
```

---

### 4. Hover Border Gradient (`/components/ui/hover-border-gradient.tsx`)

**Purpose**: Animated gradient border buttons for CTAs.

```tsx
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
          background: `conic-gradient(from 0deg, transparent 0%, rgba(255, 255, 255, 0.1) 10%, transparent 20%, rgba(255, 255, 255, 0.1) 30%, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%, rgba(255, 255, 255, 0.1) 70%, transparent 80%, rgba(255, 255, 255, 0.1) 90%, transparent 100%)`,
        }}
        animate={{ rotate: isHovered ? (clockwise ? 360 : 0) : (clockwise ? 0 : 360) }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      />

      {/* Inner background */}
      <div className={cn("relative z-10 w-full h-full bg-background rounded-xl", className)}>
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
    <motion.div className={cn("relative group", className)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg bg-gradient-to-r from-white/20 to-transparent" />
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
```

---

### 5. Glowing Effect (`/components/ui/glowing-effect.tsx`)

**Purpose**: Mouse-following glow effect for cards and interactive elements.

```tsx
"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface GlowingEffectProps {
  children: React.ReactNode;
  blur?: number;
  proximity?: number;
  spread?: number;
  variant?: "default" | "center";
  glow?: boolean;
  className?: string;
  disabled?: boolean;
}

export function GlowingEffect({
  children,
  blur = 0,
  proximity = 100,
  spread = 20,
  variant = "default",
  glow = true,
  className,
  disabled = false,
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
      {glow && !disabled && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-inherit"
          style={{ background: glowGradient, opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
      {!disabled && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-inherit"
          style={{ background, opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
```

---

### 6. Parallax Scroll / Infinite Grid (`/components/ui/parallax-scroll.tsx`)

**Purpose**: Infinite scrolling grid for the 20,000+ games library.

```tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import React, { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface InfiniteGridProps {
  items: {
    id: string;
    src: string;
    alt: string;
    title?: string;
  }[];
  className?: string;
  renderItem?: (item: { id: string; src: string; alt: string; title?: string }, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  columns?: number;
}

export function InfiniteGrid({
  items,
  className,
  renderItem,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  columns = 4,
}: InfiniteGridProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [onLoadMore, hasMore, isLoading]);

  const defaultRenderItem = (item: { id: string; src: string; alt: string; title?: string }, index: number) => (
    <motion.div
      key={item.id}
      className="group relative overflow-hidden rounded-xl bg-white/5"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.3 }}
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        <img
          src={item.src}
          alt={item.alt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {item.title && (
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="text-white font-medium text-sm truncate">{item.title}</h3>
          </div>
        )}
      </div>
    </motion.div>
  );

  const gridCols: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
  };

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("grid gap-4", gridCols[columns] || gridCols[4])}>
        {items.map((item, index) =>
          renderItem ? renderItem(item, index) : defaultRenderItem(item, index)
        )}
      </div>
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-10">
          {isLoading && (
            <motion.div
              className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Parallax version for visual effect
export function ParallaxScroll({
  images,
  className,
  renderItem,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}: InfiniteGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);

  const firstColumn = images.filter((_, i) => i % 2 === 0);
  const secondColumn = images.filter((_, i) => i % 2 === 1);

  // ... rest of parallax implementation
  return <InfiniteGrid items={images} className={className} renderItem={renderItem} onLoadMore={onLoadMore} hasMore={hasMore} isLoading={isLoading} />;
}
```

---

## Page Implementations

### Home Page (`/components/pages/HomePage.tsx`)

**Requirements**:
1. Large "challenger deep." text using `TextHoverEffect`
2. `BackgroundPaths` for animated background
3. `DynamicIslandNav` for navigation
4. Feature cards with `GlowingEffect`
5. CTA buttons with `HoverBorderGradient`
6. Stats section
7. Dark, monochrome design

```tsx
"use client";

import { motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { HoverBorderGradient, GradientButton } from "@/components/ui/hover-border-gradient";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { DynamicIslandNav } from "@/components/layout/DynamicIslandNav";
import { ArrowRight, Gamepad2, Smartphone, Monitor, Sparkles } from "lucide-react";
import Link from "next/link";

export function HomePage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <BackgroundPaths />
      <DynamicIslandNav />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Subtitle */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Sparkles className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white/60 font-medium tracking-wider uppercase">
            Welcome to the depths
          </span>
        </motion.div>

        {/* Main title - "challenger deep." */}
        <div className="h-[40rem] flex items-center justify-center">
          <TextHoverEffect text="challenger deep." />
        </div>

        {/* Description */}
        <motion.p
          className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Play 20,000+ games instantly in your browser. Run Android and Windows apps
          without downloads. Experience the future of cloud computing.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <HoverBorderGradient containerClassName="w-full sm:w-auto">
            <Link href="/games" className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" />
              Play Games
              <ArrowRight className="w-4 h-4" />
            </Link>
          </HoverBorderGradient>

          <GradientButton className="w-full sm:w-auto">
            <Link href="/android" className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Android Apps
            </Link>
          </GradientButton>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl w-full"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <FeatureCard
            icon={<Gamepad2 className="w-6 h-6" />}
            title="20,000+ Games"
            description="Play HTML5, Flash, and classic games instantly. No downloads, no installs."
            href="/games"
          />
          <FeatureCard
            icon={<Smartphone className="w-6 h-6" />}
            title="Android Apps"
            description="Run your favorite Android apps in the browser with full compatibility."
            href="/android"
          />
          <FeatureCard
            icon={<Monitor className="w-6 h-6" />}
            title="Windows Apps"
            description="Launch Windows applications directly from your browser."
            href="/windows"
          />
        </motion.div>

        {/* Stats */}
        <motion.div
          className="flex items-center justify-center gap-8 md:gap-16 mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <Stat value="20K+" label="Games" />
          <Stat value="100+" label="Apps" />
          <Stat value="1M+" label="Users" />
          <Stat value="99.9%" label="Uptime" />
        </motion.div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, href }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <GlowingEffect className="rounded-xl h-full">
        <motion.div
          className="relative p-6 rounded-xl bg-card/50 border border-white/5 backdrop-blur-sm h-full cursor-pointer"
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white mb-4">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-white/50">{description}</p>
        </motion.div>
      </GlowingEffect>
    </Link>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-white/40">{label}</div>
    </div>
  );
}
```

---

### Games Page (`/components/pages/GamesPage.tsx`)

**Requirements**:
1. `BackgroundPaths` for background
2. `DynamicIslandNav` for navigation
3. `InfiniteGrid` for 20,000+ games with infinite scroll
4. Search functionality with `GlowingEffect` on input
5. Featured games section with `GameCardFeatured`
6. Regular games with `GameCard`
7. All wrapped in `GlowingEffect`

```tsx
"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { DynamicIslandNav } from "@/components/layout/DynamicIslandNav";
import { GameCard, GameCardFeatured } from "@/components/games/GameCard";
import { InfiniteGrid } from "@/components/ui/parallax-scroll";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { fetchGames, Game } from "@/lib/games-parser";
import { Search, Grid, List, Loader2 } from "lucide-react";

const GAMES_PER_PAGE = 50;

export function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalGames, setTotalGames] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  useEffect(() => {
    loadGames(1, true);
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredGames(games);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredGames(
        games.filter(
          (game) =>
            game.title.toLowerCase().includes(query) ||
            game.description?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, games]);

  const loadGames = async (pageNum: number, initial = false) => {
    if (initial) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const result = await fetchGames(pageNum, GAMES_PER_PAGE, true);
      if (initial) {
        setGames(result.games);
        setTotalGames(result.total);
      } else {
        setGames((prev) => [...prev, ...result.games]);
      }
      setHasMore(result.games.length === GAMES_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load games:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) loadGames(page + 1);
  }, [page, isLoadingMore, hasMore]);

  const handlePlayGame = (game: Game) => {
    window.open(`/play?id=${game.id}`, "_blank");
  };

  const featuredGames = games.slice(0, 3);
  const regularGames = searchQuery ? filteredGames : games.slice(3);

  return (
    <div className="relative min-h-screen bg-background">
      <BackgroundPaths />
      <DynamicIslandNav />

      <div className="relative z-10 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Games Library
          </motion.h1>
          <motion.p
            className="text-white/50 text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {totalGames.toLocaleString()}+ games available to play instantly
          </motion.p>

          {/* Search */}
          <motion.div
            className="mt-6 flex gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlowingEffect className="flex-1 rounded-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-card border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/20"
                />
              </div>
            </GlowingEffect>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-white/40 animate-spin" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4">
            {/* Featured */}
            {!searchQuery && featuredGames.length > 0 && (
              <motion.div
                className="mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-semibold text-white mb-4">Featured</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {featuredGames.map((game, index) => (
                    <GameCardFeatured key={game.id} game={game} index={index} onPlay={handlePlayGame} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* All games with infinite scroll */}
            <InfiniteGrid
              items={regularGames.map((game) => ({
                id: game.id,
                src: game.thumb || "",
                alt: game.title,
                title: game.title,
              }))}
              columns={viewMode === "compact" ? 6 : 4}
              onLoadMore={loadMore}
              hasMore={hasMore && !searchQuery}
              isLoading={isLoadingMore}
              renderItem={(item, index) => (
                <GameCard key={item.id} game={regularGames[index]} index={index} onPlay={handlePlayGame} />
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Android Page (`/components/pages/AndroidPage.tsx`)

**Requirements**:
1. `BackgroundPaths` for background
2. `DynamicIslandNav` for navigation
3. Large center launch button with `GlowingEffect`
4. App icons arranged around center button
5. Upload APK button with `HoverBorderGradient`
6. Stats section

```tsx
"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { DynamicIslandNav } from "@/components/layout/DynamicIslandNav";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { wasmAppLibrary, WASMApp } from "@/lib/apps/wasm-app-library";
import { Smartphone, Upload, Play } from "lucide-react";

export function AndroidPage() {
  const [apps, setApps] = useState<WASMApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [launchedApp, setLaunchedApp] = useState<WASMApp | null>(null);

  useEffect(() => {
    setApps(wasmAppLibrary.getAllApps());
    setIsLoading(false);
  }, []);

  const handleLaunchApp = async (app: WASMApp) => {
    setLaunchedApp(app);
    const container = document.createElement("div");
    container.id = `app-container-${app.id}`;
    container.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 80vw; height: 80vh; background: #1a1a1a; border-radius: 16px;
      overflow: hidden; z-index: 1000; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    `;
    document.body.appendChild(container);
    try {
      await wasmAppLibrary.launchApp(app.id, container);
    } catch (error) {
      console.error("Failed to launch app:", error);
    }
  };

  const featuredApps = apps.slice(0, 6);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <BackgroundPaths />
      <DynamicIslandNav />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Icon */}
        <motion.div
          className="flex items-center justify-center mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-green-400" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Android Apps
        </motion.h1>

        {/* Description */}
        <motion.p
          className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Run Android applications directly in your browser. No downloads, no installs.
        </motion.p>

        {/* Center Launch Button */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
        >
          <GlowingEffect blur={20} proximity={100} spread={40} className="rounded-full">
            <motion.button
              className="relative w-40 h-40 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 flex items-center justify-center group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 rounded-full bg-green-500/5 animate-pulse" />
              <div className="relative flex flex-col items-center gap-2">
                <Play className="w-12 h-12 text-green-400 group-hover:text-green-300 transition-colors" />
                <span className="text-green-400 font-medium text-sm">Launch App</span>
              </div>
            </motion.button>
          </GlowingEffect>
        </motion.div>

        {/* Apps around center */}
        {!isLoading && (
          <motion.div
            className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl w-full"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            {featuredApps.map((app, index) => (
              <AppIconButton key={app.id} app={app} index={index} onClick={() => handleLaunchApp(app)} />
            ))}
          </motion.div>
        )}

        {/* Upload APK */}
        <motion.div className="mt-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
          <HoverBorderGradient>
            <button className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload APK
            </button>
          </HoverBorderGradient>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="flex items-center justify-center gap-8 md:gap-16 mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          <Stat value="16" label="Built-in Apps" />
          <Stat value="50+" label="Compatible" />
          <Stat value="∞" label="Uploads" />
        </motion.div>
      </div>
    </div>
  );
}

function AppIconButton({ app, index, onClick }: { app: WASMApp; index: number; onClick: () => void }) {
  return (
    <motion.button
      className="group relative flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 + index * 0.05 }}
      whileHover={{ y: -5, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="text-3xl">{app.icon}</div>
      <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors truncate max-w-[80px]">
        {app.name}
      </span>
    </motion.button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-white/40">{label}</div>
    </div>
  );
}
```

---

### Windows Page (`/components/pages/WindowsPage.tsx`)

**Requirements**:
1. Same structure as Android Page but with blue accent color
2. Windows 98 emulator feature card
3. Upload EXE button

```tsx
"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { DynamicIslandNav } from "@/components/layout/DynamicIslandNav";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { wasmAppLibrary, WASMApp } from "@/lib/apps/wasm-app-library";
import { Monitor, Upload, Play, MonitorPlay } from "lucide-react";

export function WindowsPage() {
  const [apps, setApps] = useState<WASMApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setApps(wasmAppLibrary.getAllApps());
    setIsLoading(false);
  }, []);

  const handleLaunchApp = async (app: WASMApp) => {
    // Same implementation as Android
  };

  const featuredApps = apps.slice(0, 6);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <BackgroundPaths />
      <DynamicIslandNav />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Icon - Blue accent */}
        <motion.div
          className="flex items-center justify-center mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
            <Monitor className="w-10 h-10 text-blue-400" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Windows Apps
        </motion.h1>

        {/* Description */}
        <motion.p
          className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Run Windows applications directly in your browser. No installation required.
        </motion.p>

        {/* Center Launch Button - Blue accent */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
        >
          <GlowingEffect blur={20} proximity={100} spread={40} className="rounded-full">
            <motion.button
              className="relative w-40 h-40 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 rounded-full bg-blue-500/5 animate-pulse" />
              <div className="relative flex flex-col items-center gap-2">
                <Play className="w-12 h-12 text-blue-400 group-hover:text-blue-300 transition-colors" />
                <span className="text-blue-400 font-medium text-sm">Launch App</span>
              </div>
            </motion.button>
          </GlowingEffect>
        </motion.div>

        {/* Apps */}
        {!isLoading && (
          <motion.div
            className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl w-full"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            {featuredApps.map((app, index) => (
              <AppIconButton key={app.id} app={app} index={index} onClick={() => handleLaunchApp(app)} />
            ))}
          </motion.div>
        )}

        {/* Windows 98 Feature Card */}
        <motion.div
          className="mt-12 max-w-2xl w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <GlowingEffect className="rounded-2xl">
            <div className="relative p-6 rounded-2xl bg-card/50 border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 flex items-center justify-center shrink-0">
                  <MonitorPlay className="w-7 h-7 text-teal-400" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-white mb-1">Windows 98 Emulator</h3>
                  <p className="text-sm text-white/50">Experience the nostalgia of Windows 98 right in your browser.</p>
                </div>
                <HoverBorderGradient containerClassName="shrink-0">
                  <button className="flex items-center gap-2">
                    Launch <MonitorPlay className="w-4 h-4" />
                  </button>
                </HoverBorderGradient>
              </div>
            </div>
          </GlowingEffect>
        </motion.div>

        {/* Upload EXE */}
        <motion.div className="mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
          <HoverBorderGradient>
            <button className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload EXE
            </button>
          </HoverBorderGradient>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="flex items-center justify-center gap-8 md:gap-16 mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <Stat value="16" label="Built-in Apps" />
          <Stat value="Win98" label="Emulator" />
          <Stat value="∞" label="Uploads" />
        </motion.div>
      </div>
    </div>
  );
}

// AppIconButton and Stat components same as Android page
```

---

## Game Card Component (`/components/games/GameCard.tsx`)

```tsx
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { Game } from "@/lib/games-parser";

interface GameCardProps {
  game: Game;
  index?: number;
  onPlay?: (game: Game) => void;
  className?: string;
}

export function GameCard({ game, index = 0, onPlay, className }: GameCardProps) {
  return (
    <motion.div
      className={cn("group relative", className)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
    >
      <GlowingEffect blur={10} proximity={50} spread={30} variant="center" className="rounded-xl">
        <div className="relative overflow-hidden rounded-xl bg-card border border-white/5">
          <div className="aspect-[3/4] relative overflow-hidden">
            {game.thumb ? (
              <img
                src={game.thumb}
                alt={game.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
                <Play className="w-12 h-12 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <motion.button
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              onClick={() => onPlay?.(game)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </div>
            </motion.button>
            {game.platform && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 text-xs font-medium bg-white/10 backdrop-blur-sm rounded-full text-white/80">
                  {game.platform}
                </span>
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-medium text-white truncate group-hover:text-white/90 transition-colors">
              {game.title}
            </h3>
            {game.description && (
              <p className="text-sm text-white/50 mt-1 line-clamp-2">{game.description}</p>
            )}
          </div>
        </div>
      </GlowingEffect>
    </motion.div>
  );
}

export function GameCardFeatured({ game, onPlay, className }: GameCardProps) {
  return (
    <motion.div
      className={cn("group relative", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <GlowingEffect blur={20} proximity={100} spread={50} variant="center" className="rounded-2xl">
        <div className="relative overflow-hidden rounded-2xl bg-card border border-white/5">
          <div className="aspect-video relative overflow-hidden">
            {game.thumb ? (
              <img
                src={game.thumb}
                alt={game.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
                <Play className="w-20 h-20 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="text-2xl font-bold text-white mb-2">{game.title}</h2>
              {game.description && (
                <p className="text-white/70 line-clamp-2 mb-4">{game.description}</p>
              )}
              <HoverBorderGradient containerClassName="w-fit" className="bg-transparent">
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4" fill="currentColor" />
                  Play Now
                </span>
              </HoverBorderGradient>
            </div>
          </div>
        </div>
      </GlowingEffect>
    </motion.div>
  );
}
```

---

## Navigation Wrapper (`/components/layout/DynamicIslandNav.tsx`)

```tsx
"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavigationIsland, MinimalNavIsland } from "@/components/ui/dynamic-island";

interface DynamicIslandNavProps {
  variant?: "default" | "minimal";
  className?: string;
}

export function DynamicIslandNav({ variant = "default", className }: DynamicIslandNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  if (variant === "minimal") {
    return <MinimalNavIsland currentPath={pathname} onNavigate={handleNavigate} className={className} />;
  }

  return <NavigationIsland currentPath={pathname} onNavigate={handleNavigate} className={className} />;
}
```

---

## Utility Functions (`/lib/utils.ts`)

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Global Styles Update (`/app/globals.css`)

Add these additional styles:

```css
/* Dynamic Island styles */
.dynamic-island {
  @apply bg-black rounded-full transition-all duration-300 ease-out;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1),
              0 4px 20px rgba(0, 0, 0, 0.5),
              0 8px 40px rgba(0, 0, 0, 0.3);
}

.dynamic-island:hover {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.15),
              0 4px 25px rgba(0, 0, 0, 0.6),
              0 8px 50px rgba(0, 0, 0, 0.4);
}

/* Rounded inherit for glow effects */
.rounded-inherit {
  border-radius: inherit;
}

/* Card hover effect */
.card-hover {
  @apply transition-all duration-300 ease-out;
}

.card-hover:hover {
  @apply -translate-y-1;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3),
              0 0 20px rgba(255, 255, 255, 0.05);
}
```

---

## ⚠️ CRITICAL: END-TO-END FEATURE VERIFICATION REQUIREMENTS

**YOU MUST ENSURE ALL FEATURES WORK END-TO-END, FROM BACKEND TO FRONTEND. THIS IS NOT OPTIONAL.**

After implementing the UI, you MUST verify that every single feature works completely. Do not consider the task complete until all of the following are verified working:

---

### 1. APK/EXE Runner - COMPLETE VERIFICATION

**Frontend Tests:**
- [ ] Click on app icons on Android/Windows pages triggers launch
- [ ] App container modal opens with correct dimensions (80vw x 80vh)
- [ ] Close button/overlay click closes the modal properly
- [ ] App icons display correctly with emoji icons
- [ ] Hover effects on app icons work (scale, translate, color change)

**Backend Tests:**
- [ ] `wasmAppLibrary.launchApp()` executes without errors
- [ ] Calculator app: All buttons work, calculations are correct
- [ ] Notepad app: Text input works, save/open buttons respond
- [ ] Paint app: Canvas drawing works, color picker functions, brush size adjusts
- [ ] Code Editor: Text input works, syntax highlighting displays
- [ ] Media Player: UI renders correctly
- [ ] Image Viewer: UI renders correctly
- [ ] PDF Viewer: UI renders correctly
- [ ] File Manager: File list displays, navigation works
- [ ] Terminal: Input field accepts commands
- [ ] 2048 Game: Grid renders, arrow keys work
- [ ] Snake Game: Canvas renders, game starts on button click
- [ ] Tetris Game: Canvas renders
- [ ] Minesweeper: Grid renders, cells respond to clicks
- [ ] Solitaire: Cards display correctly
- [ ] Chess: Board renders with correct colors

**Windows 98 Emulator:**
- [ ] Windows 98 emulator card is visible on Windows page
- [ ] Launch button triggers emulator
- [ ] `Windows98.img` file is accessible
- [ ] Emulator loads and displays Windows 98 interface

---

### 2. Games Library - COMPLETE VERIFICATION

**Frontend Tests:**
- [ ] Home page displays "challenger deep." with hover effect
- [ ] Games page header shows total game count
- [ ] Search input filters games in real-time
- [ ] Featured games section displays first 3 games
- [ ] Infinite scroll triggers loading more games
- [ ] Game cards display thumbnail, title, description
- [ ] Hover on game card shows play button overlay
- [ ] Click on game opens `/play?id={gameId}` in new tab
- [ ] Platform badges display correctly (html5, flash, etc.)
- [ ] Loading spinner displays during data fetch

**Backend Tests:**
- [ ] `/api/games` endpoint returns paginated games
- [ ] `fetchGames()` in `lib/games-parser.ts` returns correct data
- [ ] Games are returned with: id, title, description, thumb, file, width, height, platform
- [ ] Pagination works correctly (page, limit parameters)
- [ ] Randomization seed works for consistent ordering
- [ ] Total count is accurate (20,000+)
- [ ] `games.json` or `games.xml` is parsed correctly
- [ ] Game proxy endpoint `/api/proxy/game` bypasses iframe restrictions

**Game Player Page (`/play`):**
- [ ] Page accepts `id` query parameter
- [ ] Game loads in iframe or canvas
- [ ] Game dimensions are applied correctly
- [ ] Game is playable (controls work)

---

### 3. Cloud Storage - COMPLETE VERIFICATION

**Frontend Tests:**
- [ ] Upload APK/EXE buttons are visible and clickable
- [ ] File input opens file picker
- [ ] Upload progress displays (if implemented)
- [ ] Success/error messages display

**Backend Tests:**
- [ ] `CloudDatabase.saveBinary()` compresses files correctly
- [ ] Files are split into 5MB chunks
- [ ] Chunks are stored in IndexedDB via `HiberFile`
- [ ] Manifest is created with: id, originalSize, compressedSize, chunks, timestamp, mimeType
- [ ] `CloudDatabase.loadBinary()` reassembles chunks correctly
- [ ] Decompression restores original file
- [ ] `CompressionService` works for compression/decompression
- [ ] `saveRecord()` and `loadRecord()` work for metadata

**Upload API Endpoints:**
- [ ] `/api/uploads/init` initializes upload session
- [ ] `/api/uploads/[uploadId]/chunk/[chunkIndex]` accepts chunk uploads
- [ ] `/api/uploads/[uploadId]/complete` finalizes upload
- [ ] Discord/Telegram storage backends work (if configured)

---

### 4. AI Chat (g4f) - COMPLETE VERIFICATION

**Frontend Tests:**
- [ ] AI chat interface is accessible (if implemented)
- [ ] Messages can be sent
- [ ] Responses display correctly

**Backend Tests:**
- [ ] `GET /api/ai/chat?prompt=...` returns response
- [ ] `POST /api/ai/chat` with JSON body works
- [ ] Request body accepts: `{ prompt: string | array, model?: string, site?: string }`
- [ ] Response body contains: `{ content: string, error?: string }`
- [ ] `ChatModelFactory` from `lib/gpt4free/model/index` initializes
- [ ] Multiple AI providers work (Site enum)
- [ ] Multiple models work (ModelType enum)
- [ ] Streaming endpoint `/api/ai/chat/stream` works (if implemented)
- [ ] Error handling returns proper error messages

**AI Provider Verification:**
- [ ] `lib/gpt4free/` directory exists and is properly structured
- [ ] Model enums are defined correctly
- [ ] At least one AI provider returns valid responses

---

### 5. Navigation - COMPLETE VERIFICATION

**Frontend Tests:**
- [ ] Dynamic Island appears at top center of all pages
- [ ] Default state shows current page icon
- [ ] Hover expands to show current page label
- [ ] Click expands to show all navigation options
- [ ] Navigation items: Home (/), Games (/games), Android (/android), Windows (/windows)
- [ ] Clicking navigation item navigates to correct page
- [ ] Current page is highlighted with different background
- [ ] Close button (X) collapses the island
- [ ] Mouse leave collapses the island
- [ ] Spring animation is smooth (stiffness: 400, damping: 30)

**Backend Tests:**
- [ ] `useRouter()` and `usePathname()` hooks work correctly
- [ ] `router.push()` navigates without page reload
- [ ] All page routes are defined in `app/` directory

---

### 6. Visual Design - COMPLETE VERIFICATION

**Theme:**
- [ ] Background is pure black (#000) or very dark (hsl(0, 0%, 3%))
- [ ] Text is white with varying opacity
- [ ] No colors except green accents on Android page, blue accents on Windows page
- [ ] Cards have semi-transparent backgrounds with subtle borders

**Animations:**
- [ ] Background paths animate smoothly (floating SVG lines)
- [ ] Glowing effects follow mouse cursor
- [ ] Hover effects on buttons (scale, glow)
- [ ] Page transitions are smooth
- [ ] Loading spinners animate

**Responsive Design:**
- [ ] Mobile (< 640px): Single column layouts, smaller text
- [ ] Tablet (640px - 1024px): 2-3 column grids
- [ ] Desktop (> 1024px): Full layouts, 3-6 column grids
- [ ] Dynamic Island adapts to screen size
- [ ] Touch interactions work on mobile

---

### 7. API Endpoints - COMPLETE VERIFICATION

**Games API:**
- [ ] `GET /api/games?page=1&limit=50&randomize=true` returns games
- [ ] Response includes: `{ games: Game[], total: number }`

**Proxy API:**
- [ ] `GET /api/proxy/game?url=...` proxies game content
- [ ] Iframe detection headers are modified

**AI API:**
- [ ] `GET /api/ai/chat` works
- [ ] `POST /api/ai/chat` works
- [ ] `GET /api/ai/supports` returns supported models/sites

**Upload API:**
- [ ] `POST /api/uploads/init` initializes upload
- [ ] `POST /api/uploads/[uploadId]/chunk/[chunkIndex]` uploads chunk
- [ ] `POST /api/uploads/[uploadId]/complete` completes upload

**User API:**
- [ ] `GET /api/user/profile` returns user profile
- [ ] `POST /api/user/settings` updates settings

**Archives API:**
- [ ] `GET /api/archives` lists archives
- [ ] `GET /api/archives/[id]` retrieves archive

---

### 8. Error Handling - COMPLETE VERIFICATION

- [ ] API errors return proper HTTP status codes
- [ ] Error messages are user-friendly
- [ ] Loading states display during async operations
- [ ] Failed operations show error feedback
- [ ] Network errors are handled gracefully
- [ ] Missing data shows fallback UI

---

## Implementation Verification Steps

**STEP 1: Run Development Server**
```bash
pnpm dev
```

**STEP 2: Test Each Page**
1. Open `http://localhost:3000` - Verify home page
2. Navigate to `/games` - Verify games library
3. Navigate to `/android` - Verify Android apps
4. Navigate to `/windows` - Verify Windows apps

**STEP 3: Test API Endpoints**
```bash
# Test games API
curl "http://localhost:3000/api/games?page=1&limit=10"

# Test AI chat API
curl "http://localhost:3000/api/ai/chat?prompt=Hello"

# Test AI chat POST
curl -X POST "http://localhost:3000/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'
```

**STEP 4: Test App Launching**
1. Click on any app icon on Android/Windows page
2. Verify app container opens
3. Interact with the app
4. Close the app

**STEP 5: Test Games**
1. Search for a game
2. Click on a game card
3. Verify game opens in new tab
4. Play the game

**STEP 6: Test Responsive Design**
1. Open browser DevTools
2. Toggle device toolbar
3. Test at various screen sizes

**STEP 7: Run Build**
```bash
pnpm build
```
Verify no build errors.

**STEP 8: Run Production Server**
```bash
pnpm start
```
Verify all features work in production mode.

---

## Final Checklist

**DO NOT MARK COMPLETE UNTIL ALL ITEMS ARE VERIFIED:**

- [ ] Home page renders with "challenger deep." text effect
- [ ] Background paths animate on all pages
- [ ] Dynamic Island navigation works on all pages
- [ ] Games page loads and displays 20,000+ games
- [ ] Infinite scroll loads more games
- [ ] Search filters games correctly
- [ ] Game cards display correctly with hover effects
- [ ] Clicking a game opens it in a new tab
- [ ] Game is playable
- [ ] Android page displays app icons
- [ ] Clicking app icon launches the app
- [ ] Calculator app works correctly
- [ ] Notepad app works correctly
- [ ] Paint app works correctly
- [ ] Other WASM apps render correctly
- [ ] Windows page displays app icons
- [ ] Windows 98 emulator card is visible
- [ ] Upload APK/EXE buttons are present
- [ ] AI chat API returns responses
- [ ] Cloud storage functions work
- [ ] All API endpoints respond correctly
- [ ] No console errors in browser
- [ ] No build errors
- [ ] Responsive design works on all screen sizes
- [ ] Dark monochrome theme is consistent
- [ ] All animations are smooth

---

## Implementation Steps

1. **Verify Dependencies**: Ensure all packages are installed
2. **Create UI Components**: Implement all `/components/ui/` files
3. **Create Layout Components**: Implement `DynamicIslandNav`
4. **Create Page Components**: Implement all `/components/pages/` files
5. **Create Game Components**: Implement `GameCard`
6. **Update Global Styles**: Add additional CSS
7. **Test All Features**: Run through testing checklist
8. **Fix Any Issues**: Debug and fix any problems

---

## Notes

- The project uses `pnpm` as the package manager
- All components use `"use client"` directive for client-side rendering
- Framer Motion is used for all animations
- The design is intentionally dark and monochrome
- Only the Android page uses green accents, Windows page uses blue accents
- The home page hero text must be "challenger deep." with the period

---

## Current Implementation Status

The codebase already has most of these components implemented. Your task is to:

1. **Review** the existing implementation
2. **Update** any components that don't match the specifications
3. **Test** all functionality end-to-end
4. **Fix** any bugs or issues
5. **Ensure** the UI is dark, monochrome, and functional

The existing files are located at:
- `/components/ui/` - UI components
- `/components/pages/` - Page components
- `/components/layout/` - Layout components
- `/components/games/` - Game components
- `/lib/` - Utility functions and libraries

Good luck with the implementation!