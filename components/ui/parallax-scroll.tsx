"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { GameImage } from "@/types/ui";

interface ParallaxScrollProps {
  images: GameImage[];
  className?: string;
}

export function ParallaxScroll({ images, className }: ParallaxScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Split images into three columns
  const firstColumn = images.filter((_, i) => i % 3 === 0);
  const secondColumn = images.filter((_, i) => i % 3 === 1);
  const thirdColumn = images.filter((_, i) => i % 3 === 2);

  if (!isMounted) {
    return (
      <div className={cn("flex gap-4 p-4", className)}>
        <div className="flex-1 space-y-4">
          {firstColumn.map((image) => (
            <div key={image.id} className="rounded-lg overflow-hidden bg-zinc-800 aspect-[3/4]" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          {secondColumn.map((image) => (
            <div key={image.id} className="rounded-lg overflow-hidden bg-zinc-800 aspect-[3/4]" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          {thirdColumn.map((image) => (
            <div key={image.id} className="rounded-lg overflow-hidden bg-zinc-800 aspect-[3/4]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("min-h-[200vh] relative", className)}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="flex gap-4 p-4 h-full">
          <ParallaxColumn images={firstColumn} baseVelocity={-5} />
          <ParallaxColumn images={secondColumn} baseVelocity={5} />
          <ParallaxColumn images={thirdColumn} baseVelocity={-3} />
        </div>
      </div>
    </div>
  );
}

interface ParallaxColumnProps {
  images: GameImage[];
  baseVelocity: number;
}

function ParallaxColumn({ images, baseVelocity }: ParallaxColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: columnRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, baseVelocity * 100]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

  return (
    <motion.div
      ref={columnRef}
      className="flex-1 space-y-4"
      style={{ y: smoothY }}
    >
      {images.map((image) => (
        <GameCard key={image.id} image={image} />
      ))}
    </motion.div>
  );
}

interface GameCardProps {
  image: GameImage;
}

function GameCard({ image }: GameCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative rounded-lg overflow-hidden cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="aspect-[3/4] relative">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Hover overlay */}
        <motion.div
          className="absolute inset-0 bg-black/40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: isHovered ? 1 : 0.8, opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white/10 backdrop-blur-sm rounded-full p-3"
          >
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          </motion.div>
        </motion.div>

        {/* Title */}
        {image.title && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-medium text-sm truncate">
              {image.title}
            </h3>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ParallaxScroll;