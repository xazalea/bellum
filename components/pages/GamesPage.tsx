"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { MinimalNavIsland } from "@/components/ui/dynamic-island";
import { fetchGames, Game } from "@/lib/games-parser";
import { 
  Search, Gamepad2, Loader2, Grid, List, ChevronDown, X, Play, 
  Star, Users, Clock, ArrowRight, ChevronLeft, ChevronRight 
} from "lucide-react";

const PAGE_SIZE = 30;
const SKELETON_COUNT = 12;

// Game categories
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

// Sort options
const SORT_OPTIONS = [
  { id: "popular", label: "Most Popular" },
  { id: "new", label: "Newest" },
  { id: "az", label: "A-Z" },
  { id: "za", label: "Z-A" },
];

// Game card skeleton
function GameCardSkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="flex gap-4 p-4 rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl animate-pulse">
        <div className="w-32 h-24 bg-neutral-800 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-neutral-700" />
          <div className="h-3 w-1/2 rounded bg-neutral-700" />
          <div className="h-3 w-1/4 rounded bg-neutral-700" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl animate-pulse">
      <div className="relative aspect-[4/5] w-full bg-neutral-800" />
      <div className="relative p-3">
        <div className="h-3 w-3/4 rounded bg-neutral-700" />
      </div>
    </div>
  );
}

// Game Preview Modal
function GamePreviewModal({ 
  game, 
  onClose 
}: { 
  game: Game | null; 
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  if (!game) return null;

  const playUrl = `/play?title=${encodeURIComponent(game.title)}&url=${encodeURIComponent(game.file)}&width=${game.width || 800}&height=${game.height || 600}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-2xl bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Preview image */}
          <div className="relative aspect-video w-full bg-neutral-800">
            {game.thumb ? (
              <img
                src={game.thumb}
                alt={game.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Gamepad2 className="w-16 h-16 text-neutral-700" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />
            
            {/* Play button overlay */}
            <Link
              href={playUrl}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                <Play className="w-12 h-12 text-white" fill="white" />
              </div>
            </Link>
          </div>

          {/* Game info */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-2">{game.title}</h2>
            
            {/* Stats */}
            <div className="flex gap-6 mb-4 text-sm text-neutral-400">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>{(Math.random() * 2 + 3).toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{Math.floor(Math.random() * 100000).toLocaleString()} plays</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Arcade</span>
              </div>
            </div>

            {/* Description placeholder */}
            <p className="text-neutral-400 text-sm mb-6 line-clamp-2">
              Play {game.title} instantly in your browser. No downloads required.
            </p>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Link
                href={playUrl}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-neutral-200 transition-colors"
              >
                <Play className="w-5 h-5" />
                Play Now
              </Link>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Category filter pill
function CategoryPill({ 
  category, 
  isActive, 
  onClick 
}: { 
  category: typeof CATEGORIES[0]; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
        isActive
          ? "bg-white text-black"
          : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {category.label}
    </button>
  );
}

// Sort dropdown
function SortDropdown({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = SORT_OPTIONS.find(o => o.id === value) || SORT_OPTIONS[0];

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
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
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
                className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors ${
                  value === option.id ? "text-white bg-white/5" : "text-neutral-400"
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

// View toggle
function ViewToggle({ 
  value, 
  onChange 
}: { 
  value: "grid" | "list"; 
  onChange: (value: "grid" | "list") => void;
}) {
  return (
    <div className="flex rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      <button
        onClick={() => onChange("grid")}
        className={`p-2 transition-colors ${value === "grid" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white"}`}
        aria-label="Grid view"
      >
        <Grid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange("list")}
        className={`p-2 transition-colors ${value === "list" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white"}`}
        aria-label="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

export function GamesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [seed] = useState(() => Math.random().toString(36).slice(2));
  
  // New state for filters and view
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewGame, setPreviewGame] = useState<Game | null>(null);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(true);
  
  // Refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter and sort games
  const filtered = useMemo(() => {
    let result = [...items];
    
    // Filter by search query
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((g) => g.title.toLowerCase().includes(q));
    }
    
    // Filter by category (mock - in real app would be server-side)
    if (selectedCategory !== "all") {
      // For demo, randomly assign some games to categories based on id hash
      result = result.filter((g) => {
        const hash = g.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
        const categoryIndex = hash % (CATEGORIES.length - 1);
        return CATEGORIES[categoryIndex + 1]?.id === selectedCategory;
      });
    }
    
    // Sort
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
      case "popular":
      default:
        // Keep original order (assumed to be by popularity)
        break;
    }
    
    return result;
  }, [items, query, selectedCategory, sortBy]);

  const canLoadMore = items.length < total && !query.trim();

  useEffect(() => {
    void loadPage(1, true);
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || !canLoadMore || !useInfiniteScroll) return;

    const options = {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && canLoadMore && !loading) {
        loadPage(page + 1);
      }
    }, options);

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [canLoadMore, loading, page, useInfiniteScroll]);

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

  const handleLoadMore = useCallback(() => {
    if (!loading && canLoadMore) {
      loadPage(page + 1);
    }
  }, [loading, canLoadMore, page]);

  const handleCardClick = useCallback((game: Game, e: React.MouseEvent) => {
    e.preventDefault();
    setPreviewGame(game);
  }, []);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background Effect */}
      <BackgroundRippleEffect />
      
      {/* Navigation */}
      <MinimalNavIsland currentPath="/games" onNavigate={(path) => router.push(path)} />
      
      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-24 md:px-6 md:py-32">
        {/* Header Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Games Library
          </h1>
          <p className="text-neutral-400 max-w-xl mx-auto mb-6">
            Browse and play <span className="text-white">{total.toLocaleString()} games</span> instantly in your browser.
          </p>
          
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl px-4 py-3 pl-11 text-sm text-white placeholder-neutral-500 outline-none ring-white/20 focus:ring-2 transition-all"
            />
          </div>
        </motion.section>

        {/* Filters Section */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {CATEGORIES.map((category) => (
              <CategoryPill
                key={category.id}
                category={category}
                isActive={selectedCategory === category.id}
                onClick={() => setSelectedCategory(category.id)}
              />
            ))}
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-neutral-500">
              {filtered.length.toLocaleString()} games
            </div>
            <div className="flex items-center gap-3">
              <SortDropdown value={sortBy} onChange={setSortBy} />
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </motion.section>

        {/* Games Grid/List */}
        <section 
          ref={containerRef}
          className={viewMode === "grid" 
            ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            : "flex flex-col gap-3"
          }
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* Initial loading skeletons */}
          <AnimatePresence mode="wait">
            {initialLoading && Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <GameCardSkeleton viewMode={viewMode} />
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Game cards */}
          {!initialLoading && filtered.map((game, index) => {
            const params = new URLSearchParams({
              title: game.title,
              url: game.file,
              width: game.width || "800",
              height: game.height || "600",
            });
            
            if (viewMode === "list") {
              return (
                <motion.div
                  key={`${game.id}-${game.file}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.3) }}
                >
                  <Link
                    href={`/play?${params.toString()}`}
                    onClick={(e) => handleCardClick(game, e)}
                    className="group flex gap-4 p-4 rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-neutral-800/80"
                  >
                    {/* Thumbnail */}
                    <div className="w-32 h-24 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
                      {game.thumb ? (
                        <img
                          src={game.thumb}
                          alt={game.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Gamepad2 className="w-8 h-8 text-neutral-700" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate group-hover:text-white transition-colors">
                        {game.title}
                      </h3>
                      <p className="text-sm text-neutral-500 mt-1">
                        Arcade
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {(Math.random() * 2 + 3).toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {Math.floor(Math.random() * 100000).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Play button */}
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                        <Play className="w-5 h-5 text-white" fill="white" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            }
            
            return (
              <motion.div
                key={`${game.id}-${game.file}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.3) }}
              >
                <Link
                  href={`/play?${params.toString()}`}
                  onClick={(e) => handleCardClick(game, e)}
                  className="group block"
                >
                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl transition-all duration-300 group-hover:border-white/20 group-hover:scale-[1.02]">
                    {/* Glow effect on hover */}
                    <div className="absolute -inset-px bg-gradient-to-r from-purple-500/0 via-purple-500/20 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl blur-sm" />
                    
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
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Quick play button */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                          <Play className="w-6 h-6 text-white" fill="white" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative p-3">
                      <p className="line-clamp-2 text-xs font-medium text-white group-hover:text-white transition-colors">
                        {game.title}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
          
          {/* Loading more skeletons */}
          {loading && !initialLoading && Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={`loading-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <GameCardSkeleton viewMode={viewMode} />
            </motion.div>
          ))}
        </section>

        {/* Load More Button / Infinite scroll trigger */}
        <div ref={loadMoreRef} className="mt-8 flex flex-col items-center justify-center py-8 min-h-[100px] gap-4">
          {loading && initialLoading && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              <span className="text-sm text-neutral-500">Loading games...</span>
            </div>
          )}
          
          {/* Load More button (alternative to infinite scroll) */}
          {!loading && canLoadMore && items.length > 0 && (
            <button
              onClick={handleLoadMore}
              className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
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
            <p className="text-neutral-500">No games found matching "{query}"</p>
          </motion.div>
        )}
      </main>

      {/* Game Preview Modal */}
      <AnimatePresence>
        {previewGame && (
          <GamePreviewModal
            game={previewGame}
            onClose={() => setPreviewGame(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}