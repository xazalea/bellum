"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Play, ExternalLink } from "lucide-react";
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
      <GlowingEffect
        blur={10}
        proximity={50}
        spread={30}
        variant="center"
        className="rounded-xl"
      >
        <div className="relative overflow-hidden rounded-xl bg-card border border-white/5">
          {/* Thumbnail */}
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

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Play button on hover */}
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

            {/* Platform badge */}
            {game.platform && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 text-xs font-medium bg-white/10 backdrop-blur-sm rounded-full text-white/80">
                  {game.platform}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-medium text-white truncate group-hover:text-white/90 transition-colors">
              {game.title}
            </h3>
            {game.description && (
              <p className="text-sm text-white/50 mt-1 line-clamp-2">
                {game.description}
              </p>
            )}
          </div>
        </div>
      </GlowingEffect>
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
      <GlowingEffect
        blur={20}
        proximity={100}
        spread={50}
        variant="center"
        className="rounded-2xl"
      >
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