"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Play, Star, Users } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { Game } from "@/lib/games-parser";
import { useRef, useState, useEffect } from "react";

// Format play count to readable format (e.g., "1.2M plays")
function formatPlayCount(count?: number): string {
  if (!count) return "0 plays";
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M plays`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K plays`;
  }
  return `${count} plays`;
}

// Generate a random rating for demo (in real app this would come from data)
function generateRating(): number {
  return Math.round((Math.random() * 2 + 3) * 10) / 10; // 3.0 - 5.0
}

// Skeleton component for loading state
export function GameCardSkeleton() {
  return (
    <div className="relative rounded-xl overflow-hidden bg-card border border-white/5">
      <div className="aspect-[3/4] relative animate-pulse">
        <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10" />
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <div className="p-4 space-y-2">
        <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

interface GameCardProps {
  game: Game;
  index?: number;
  onPlay?: (game: Game) => void;
  className?: string;
  showRating?: boolean;
  showPlayCount?: boolean;
  playCount?: number;
}

export function GameCard({ 
  game, 
  index = 0, 
  onPlay, 
  className,
  showRating = true,
  showPlayCount = true,
  playCount
}: GameCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [rating] = useState(generateRating);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  return (
    <motion.div
      ref={containerRef}
      className={cn("group relative", className)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      whileHover={{ scale: 1.02 }}
      style={{ transition: "transform 200ms ease-out" }}
    >
      <div className="relative rounded-xl">
        <div
          className="relative overflow-hidden rounded-xl bg-card border transition-colors duration-[var(--duration-normal)]"
          style={{
            borderColor: "var(--glass-border)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--glass-border-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--glass-border)";
          }}
        >
          {/* Thumbnail */}
          <div className="aspect-[3/4] relative overflow-hidden">
            {/* Skeleton while loading */}
            {!isLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 animate-pulse">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            )}
            
            {isInView && game.thumb && (
              <img
                ref={imgRef}
                src={game.thumb}
                alt={game.title}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                  !isLoaded && "opacity-0"
                )}
                loading="lazy"
                onLoad={handleImageLoad}
              />
            )}
            
            {!game.thumb && (
              <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
                <Play className="w-12 h-12 text-white/20" />
              </div>
            )}

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]" />

            {/* Quick play button on hover - 44px minimum touch target */}
            <motion.button
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]"
              onClick={() => onPlay?.(game)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={`Play ${game.title}`}
              style={{ minHeight: "44px", minWidth: "44px" }}
            >
              <div 
                className="rounded-full flex items-center justify-center transition-transform duration-[var(--duration-fast)]"
                style={{
                  background: "var(--glass-bg)",
                  backdropFilter: "blur(var(--glass-blur))",
                  WebkitBackdropFilter: "blur(var(--glass-blur))",
                  boxShadow: "var(--shadow-glow-sm)",
                  width: "64px",
                  height: "64px",
                  minWidth: "44px",
                  minHeight: "44px"
                }}
              >
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </div>
            </motion.button>

            {/* Rating badge */}
            {showRating && (
              <div 
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  background: "var(--glass-bg)",
                  backdropFilter: "blur(var(--glass-blur))",
                  WebkitBackdropFilter: "blur(var(--glass-blur))",
                  borderColor: "var(--glass-border)",
                  borderWidth: "1px",
                  borderStyle: "solid"
                }}
              >
                <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                <span className="text-white">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 min-h-[44px]">
            <h3 
              className="font-medium text-white truncate group-hover:text-white/90 transition-colors"
              style={{ minHeight: "24px" }}
            >
              {game.title}
            </h3>
            {game.description && (
              <p className="text-sm text-white/50 mt-1 line-clamp-2">
                {game.description}
              </p>
            )}
            
            {/* Play count */}
            {showPlayCount && (
              <div className="flex items-center gap-1 mt-2 text-white/40 text-xs">
                <Users className="w-3 h-3" />
                <span>{formatPlayCount(playCount ?? Math.floor(Math.random() * 500000) + 1000)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Compact game card for lists
export function GameCardCompact({ game, index = 0, onPlay, className }: GameCardProps) {
  return (
    <motion.div
      className={cn(
        "group flex items-center gap-4 p-3 rounded-lg bg-card/50 border border-white/5 hover:bg-card hover:border-white/10 transition-colors cursor-pointer",
        className
      )}
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      onClick={() => onPlay?.(game)}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
        {game.thumb ? (
          <img
            src={game.thumb}
            alt={game.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
            <Play className="w-6 h-6 text-white/20" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white truncate">{game.title}</h3>
        {game.description && (
          <p className="text-sm text-white/50 truncate">{game.description}</p>
        )}
      </div>

      {/* Play icon */}
      <Play className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
    </motion.div>
  );
}

// Featured game card (larger)
export function GameCardFeatured({ game, onPlay, className }: GameCardProps) {
  return (
    <motion.div
      className={cn("group relative", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative rounded-2xl">
        <GlowingEffect
          blur={20}
          proximity={100}
          spread={50}
          variant="default"
          className="rounded-2xl"
        />
        <div className="relative overflow-hidden rounded-2xl bg-card border border-white/5">
          {/* Thumbnail */}
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

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="text-2xl font-bold text-white mb-2">{game.title}</h2>
              {game.description && (
                <p className="text-white/70 line-clamp-2 mb-4">{game.description}</p>
              )}
              <HoverBorderGradient
                containerClassName="w-fit"
                className="bg-transparent"
              >
                <button 
                  className="flex items-center gap-2"
                  onClick={() => onPlay?.(game)}
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  Play Now
                </button>
              </HoverBorderGradient>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
