"use client";

import { motion } from "framer-motion";
import { ParallaxScroll } from "@/components/ui/parallax-scroll";
import { BackgroundPaths } from "@/components/ui/background-paths";
import type { GameImage } from "@/types/ui";

// Sample game images - in production these would come from your API
const gameImages: GameImage[] = [
  { id: "1", src: "/games/game1.jpg", alt: "Game 1", title: "Cyber Adventure" },
  { id: "2", src: "/games/game2.jpg", alt: "Game 2", title: "Space Explorer" },
  { id: "3", src: "/games/game3.jpg", alt: "Game 3", title: "Fantasy Quest" },
  { id: "4", src: "/games/game4.jpg", alt: "Game 4", title: "Racing Pro" },
  { id: "5", src: "/games/game5.jpg", alt: "Game 5", title: "Puzzle Master" },
  { id: "6", src: "/games/game6.jpg", alt: "Game 6", title: "Battle Arena" },
  { id: "7", src: "/games/game7.jpg", alt: "Game 7", title: "Zombie Survival" },
  { id: "8", src: "/games/game8.jpg", alt: "Game 8", title: "City Builder" },
  { id: "9", src: "/games/game9.jpg", alt: "Game 9", title: "Sports League" },
  { id: "10", src: "/games/game10.jpg", alt: "Game 10", title: "Mystery Island" },
  { id: "11", src: "/games/game11.jpg", alt: "Game 11", title: "Tower Defense" },
  { id: "12", src: "/games/game12.jpg", alt: "Game 12", title: "Cooking Chef" },
];

// Placeholder images for demo
const placeholderImages: GameImage[] = Array.from({ length: 12 }, (_, i) => ({
  id: `game-${i + 1}`,
  src: `https://picsum.photos/seed/game${i + 1}/400/600`,
  alt: `Game ${i + 1}`,
  title: `Game Title ${i + 1}`,
}));

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-black">
      <BackgroundPaths className="fixed inset-0 opacity-30" />
      
      <div className="relative z-10 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center py-12 px-4"
        >
          <h1 className="text-4xl md:text-5xl font-light text-white/90 mb-4">
            Games
          </h1>
          <p className="text-white/50 text-lg font-light max-w-2xl mx-auto">
            Discover and play a vast collection of games. From retro classics to modern masterpieces.
          </p>
        </motion.div>

        <ParallaxScroll images={placeholderImages} className="relative z-10" />
      </div>
    </div>
  );
}