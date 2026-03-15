"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { SpotlightCard } from "@/components/ui/spotlight";
import { fetchGames, Game } from "@/lib/games-parser";
import {
  getRecentlyPlayed,
  RecentlyPlayedGame,
  formatRelativeTime,
} from "@/lib/games/recently-played";
import {
  Search,
  Gamepad2,
  Loader2,
  Grid,
  List,
  ChevronDown,
  X,
  Play,
  Star,
  Users,
  Clock,
  ArrowRight,
  History,
  Smartphone,
  Monitor,
  Sparkles,
  Globe,
  Zap,
} from "lucide-react";

const PAGE_SIZE = 30;
const SKELETON_COUNT = 12;

// ─── Seeded random for stable stats ─────────────────────────────────────────
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return ((hash & 0x7fffffff) % 10000) / 10000;
}

function getStableRating(id: string): string {
  return (seededRandom(id + "rating") * 2 + 3).toFixed(1);
}

function getStablePlays(id: string): string {
  const plays = Math.floor(seededRandom(id + "plays") * 500000 + 1000);
  if (plays >= 1000000) return `${(plays / 1000000).toFixed(1)}M`;
  if (plays >= 1000) return `${(plays / 1000).toFixed(1)}K`;
  return plays.toString();
}

// Categories
const CATEGORIES = [
  { id: "all", label: "All Games" },
  { id: "action", label: "Action" },
  { id: "puzzle", label: "Puzzle" },
  { id: "racing", label: "Racing" },
  { id: "sports", label: "Sports" },
  { id: "adventure", label: "Adventure" },
  { id: "strategy", label: "Strategy" },
  { id: "arcade", label: "Arcade" },
  { id: "multiplayer", label: "Multiplayer" },
];

const SORT_OPTIONS = [
  { id: "popular", label: "Most Popular" },
  { id: "new", label: "Newest" },
  { id: "az", label: "A-Z" },
  { id: "za", label: "Z-A" },
];

// Category keywords for title-based matching (root fix for fake hash categories)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  action: ["fight", "war", "battle", "shoot", "gun", "ninja", "hero", "attack", "rage", "fury", "combat", "destroy", "kill", "soldier"],
  puzzle: ["puzzle", "match", "block", "brain", "logic", "maze", "jigsaw", "sudoku", "word", "quiz", "trivia"],
  racing: ["race", "racing", "car", "drive", "drift", "speed", "moto", "bike", "truck", "kart", "rally"],
  sports: ["sport", "football", "soccer", "basketball", "tennis", "golf", "hockey", "baseball", "boxing", "cricket"],
  adventure: ["adventure", "quest", "explore", "journey", "treasure", "island", "jungle", "forest", "castle", "knight"],
  strategy: ["strategy", "tower", "defense", "td", "command", "army", "empire", "kingdom", "tycoon", "build"],
  arcade: ["arcade", "jump", "run", "classic", "retro", "pixel", "coin", "bounce", "flap", "tap"],
  multiplayer: ["multi", "2player", "versus", "pvp", "co-op", "team", "online", "battle"],
};

function matchesCategory(game: Game, categoryId: string): boolean {
  if (categoryId === "all") return true;
  const keywords = CATEGORY_KEYWORDS[categoryId] || [];
  const title = game.title.toLowerCase();
  return keywords.some((kw) => title.includes(kw));
}

// ─── Skeleton ───────────────────────────────────────────────────────────────
function GameCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/80 animate-pulse">
      <div className="aspect-[4/5] w-full bg-neutral-800" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 rounded bg-neutral-700" />
        <div className="h-2 w-1/2 rounded bg-neutral-800" />
      </div>
    </div>
  );
}

// ─── Sort Dropdown ──────────────────────────────────────────────────────────
function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = SORT_OPTIONS.find((o) => o.id === value) || SORT_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 right-0 w-40 bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-xl z-20"
          >
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors ${value === option.id ? "text-white bg-white/5" : "text-neutral-400"
                  }`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export function GamesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [seed] = useState(() => Math.random().toString(36).slice(2));
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayedGame[]>([]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const navItems = [
    { name: "Home", link: "/", icon: <Globe className="w-4 h-4" /> },
    { name: "Games", link: "/games", icon: <Gamepad2 className="w-4 h-4" /> },
    { name: "Android", link: "/android", icon: <Smartphone className="w-4 h-4" /> },
    { name: "Windows", link: "/windows", icon: <Monitor className="w-4 h-4" /> },
    { name: "AI", link: "/ai", icon: <Sparkles className="w-4 h-4" /> },
  ];

  // Filter and sort using title-based keyword matching (ROOT FIX for category filtering)
  const filtered = useMemo(() => {
    let result = [...items];

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((g) => g.title.toLowerCase().includes(q));
    }

    if (selectedCategory !== "all") {
      result = result.filter((g) => matchesCategory(g, selectedCategory));
    }

    switch (sortBy) {
      case "az":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "za":
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "new":
        result.reverse();
        break;
    }

    return result;
  }, [items, query, selectedCategory, sortBy]);

  const canLoadMore = items.length < total && !query.trim();

  useEffect(() => {
    void loadPage(1, true);
    setRecentlyPlayed(getRecentlyPlayed());
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (loading || !canLoadMore) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && canLoadMore && !loading) {
          loadPage(page + 1);
        }
      },
      { rootMargin: "200px" }
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [canLoadMore, loading, page]);

  async function loadPage(nextPage: number, replace = false) {
    if (loading) return;
    setLoading(true);
    try {
      const result = await fetchGames(nextPage, PAGE_SIZE, true, seed);
      setTotal(result.total);
      setPage(nextPage);
      setItems((prev) => (replace ? result.games : [...prev, ...result.games]));
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }

  // ROOT FIX: Build play URL correctly — direct navigation, no e.preventDefault()
  function buildPlayUrl(game: Game): string {
    const params = new URLSearchParams({
      title: game.title,
      url: game.file,
      width: game.width || "800",
      height: game.height || "600",
    });
    return `/play?${params.toString()}`;
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.08),transparent_50%)]" />

      {/* Navigation */}
      <FloatingNav navItems={navItems} />

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-28 md:px-6 md:py-36">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-6">
            <Zap className="w-3 h-3" />
            {total.toLocaleString()} games available
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
            Game Library
          </h1>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">
            Every game runs instantly in your browser. No downloads, no installs.
          </p>

          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full rounded-2xl border border-white/10 bg-neutral-950/80 backdrop-blur-xl px-4 py-3.5 pl-11 text-sm text-white placeholder-neutral-500 outline-none ring-orange-500/30 focus:ring-2 focus:border-orange-500/30 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>
        </motion.section>

        {/* Categories + Controls */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          <div
            className="flex gap-2 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none" }}
          >
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${selectedCategory === category.id
                    ? "bg-orange-500 text-black"
                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/[0.08]"
                  }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">
              {filtered.length.toLocaleString()} games
            </span>
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </motion.section>

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && !query && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-10"
          >
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Recently Played</h2>
            </div>
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {recentlyPlayed.slice(0, 10).map((game) => (
                <Link
                  key={`recent-${game.id}`}
                  href={buildPlayUrl(game as any)}
                  className="group flex-shrink-0 w-40"
                >
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/80 transition-all duration-300 group-hover:border-orange-500/30">
                    <div className="relative aspect-[4/5] w-full bg-neutral-800">
                      {game.thumb ? (
                        <img
                          src={game.thumb}
                          alt={game.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Gamepad2 className="h-8 w-8 text-neutral-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-2 rounded-full bg-orange-500/80">
                          <Play className="w-4 h-4 text-black" fill="black" />
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-white truncate">
                        {game.title}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {formatRelativeTime(game.playedAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Games Grid — ROOT FIX: No e.preventDefault(), direct navigation on click */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <AnimatePresence mode="wait">
            {initialLoading &&
              Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <GameCardSkeleton />
                </motion.div>
              ))}
          </AnimatePresence>

          {!initialLoading &&
            filtered.map((game, index) => (
              <motion.div
                key={`${game.id}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  delay: Math.min(index * 0.01, 0.3),
                }}
              >
                {/* ROOT FIX: Direct <Link> — no onClick handler that blocks navigation */}
                <Link href={buildPlayUrl(game)} className="group block">
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/80 backdrop-blur-sm transition-all duration-300 group-hover:border-orange-500/20 group-hover:scale-[1.02]">
                    <div className="relative aspect-[4/5] w-full bg-neutral-800">
                      {game.thumb ? (
                        <img
                          src={game.thumb}
                          alt={game.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Gamepad2 className="h-12 w-12 text-neutral-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-3 rounded-full bg-orange-500/80 backdrop-blur-sm shadow-lg shadow-orange-500/25">
                          <Play className="w-5 h-5 text-black" fill="black" />
                        </div>
                      </div>
                    </div>

                    <div className="relative p-3">
                      <p className="text-xs font-semibold text-white truncate mb-1">
                        {game.title}
                      </p>
                      {/* ROOT FIX: Seeded stable stats instead of Math.random() */}
                      <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                        <span className="flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 text-yellow-500" />
                          {getStableRating(game.id)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Users className="w-2.5 h-2.5" />
                          {getStablePlays(game.id)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

          {loading &&
            !initialLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <GameCardSkeleton key={`loading-${i}`} />
            ))}
        </section>

        {/* Load more / infinite scroll trigger */}
        <div
          ref={loadMoreRef}
          className="mt-10 flex flex-col items-center justify-center py-8 min-h-[100px] gap-4"
        >
          {loading && initialLoading && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              <span className="text-sm text-neutral-500">Loading games...</span>
            </div>
          )}
          {!loading && canLoadMore && items.length > 0 && (
            <button
              onClick={() => loadPage(page + 1)}
              className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              Load More Games
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {!loading && !canLoadMore && items.length > 0 && !query && (
            <div className="text-sm text-neutral-500">
              All {items.length.toLocaleString()} games loaded
            </div>
          )}
        </div>

        {/* Empty state */}
        {!loading && filtered.length === 0 && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Gamepad2 className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500">
              No games found matching &quot;{query}&quot;
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}