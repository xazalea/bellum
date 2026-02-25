"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface Game {
  id: string;
  title: string;
  description: string;
  thumb: string;
  file: string;
  platform?: string;
}

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════

function SearchIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className} style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function GamepadIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className} style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className} style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}

function ExpandIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className} style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
      />
    </svg>
  );
}

function XIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className} style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [totalGames, setTotalGames] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const sessionSeed = useRef(`seed-${Date.now()}`).current;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Load games
  const loadGames = useCallback(
    async (pageNum: number, append = false) => {
      try {
        if (!append) setLoading(true);
        else setIsLoadingMore(true);

        setError(null);

        const response = await fetch(
          `/api/games?page=${pageNum}&limit=24&randomize=true&seed=${sessionSeed}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to load games: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setTotalGames(data.total || 0);

        if (append) {
          setGames((prev) => [...prev, ...data.games]);
        } else {
          setGames(data.games || []);
        }

        setHasMore(
          data.games.length === 24 &&
            (append ? games.length + data.games.length : data.games.length) <
              data.total,
        );
      } catch (err: any) {
        console.error("[Games] Load error:", err);
        setError(err.message || "Failed to load games");
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [sessionSeed, games.length],
  );

  // Initial load
  useEffect(() => {
    loadGames(1, false);
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" },
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore]);

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      loadGames(page, true);
    }
  }, [page]);

  // Filter games by search
  const filteredGames = searchQuery.trim()
    ? games.filter(
        (game) =>
          game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          game.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : games;

  // Handle game click
  const handleGameClick = (game: Game) => {
    setSelectedGame(game);
    setGameLoading(true);
  };

  // Handle fullscreen
  const handleFullscreen = () => {
    const iframe = document.querySelector(
      "iframe[data-game-player]",
    ) as HTMLIFrameElement;
    if (iframe) {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if ((iframe as any).webkitRequestFullscreen) {
        (iframe as any).webkitRequestFullscreen();
      }
    }
  };

  // Handle close game
  const handleCloseGame = () => {
    setSelectedGame(null);
    setGameLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--cd-abyss)" }}>
      {/* Header */}
      <div
        className="border-b"
        style={{ borderColor: "var(--cd-border-default)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Title */}
            <div>
              <div className="flex items-center gap-3">
                <GamepadIcon
                  className="w-8 h-8"
                  style={{ color: "var(--cd-cyan)" }}
                />
                <div>
                  <h1
                    className="text-2xl font-bold"
                    style={{ color: "var(--cd-text-primary)" }}
                  >
                    Challenger Deep Games
                  </h1>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--cd-text-muted)" }}
                  >
                    {totalGames > 0
                      ? `${totalGames.toLocaleString()} HTML5 games`
                      : "Loading games..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-80">
              <input
                type="search"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-sm rounded-md transition-all"
                style={{
                  background: "var(--cd-surface)",
                  border: "1px solid var(--cd-border-default)",
                  color: "var(--cd-text-primary)",
                }}
              />
              <SearchIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "var(--cd-text-muted)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="cd-alert cd-alert-error mb-6">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Failed to load games</p>
              <p className="text-sm mt-1 opacity-80">{error}</p>
            </div>
            <button
              onClick={() => loadGames(1, false)}
              className="cd-btn cd-btn-ghost text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="cd-spinner cd-spinner-lg mb-4" />
            <p style={{ color: "var(--cd-text-secondary)" }}>
              Loading games...
            </p>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <GamepadIcon
              className="w-16 h-16 mb-4"
              style={{ color: "var(--cd-text-muted)" }}
            />
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--cd-text-primary)" }}
            >
              {searchQuery ? "No games found" : "No games available"}
            </h3>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--cd-text-secondary)" }}
            >
              {searchQuery ? "Try a different search term" : "Check back later"}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="cd-btn cd-btn-primary"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Games Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleGameClick(game)}
                  className="group relative aspect-[3/4] rounded-lg overflow-hidden transition-all"
                  style={{
                    background: "var(--cd-surface)",
                    border: "1px solid var(--cd-border-default)",
                  }}
                >
                  {/* Thumbnail */}
                  {game.thumb ? (
                    <img
                      src={game.thumb}
                      alt={game.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: "var(--cd-elevated)" }}
                    >
                      <GamepadIcon
                        className="w-12 h-12"
                        style={{ color: "var(--cd-text-muted)" }}
                      />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ background: "var(--cd-cyan)" }}
                      >
                        <GamepadIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                    <p className="text-xs font-medium text-white truncate">
                      {game.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Load More Trigger */}
            {hasMore && !searchQuery && (
              <div
                ref={loadMoreRef}
                className="flex items-center justify-center py-8"
              >
                {isLoadingMore && (
                  <div
                    className="flex items-center gap-3"
                    style={{ color: "var(--cd-text-secondary)" }}
                  >
                    <div className="cd-spinner" />
                    <span className="text-sm">Loading more games...</span>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            {!searchQuery && (
              <div
                className="mt-8 text-center"
                style={{ color: "var(--cd-text-muted)" }}
              >
                <p className="text-sm">
                  Showing {games.length.toLocaleString()} of{" "}
                  {totalGames.toLocaleString()} games
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Game Player Modal */}
      {selectedGame && (
        <div className="fixed inset-0 z-50 cd-overlay">
          <div
            className="fixed inset-0 flex flex-col"
            style={{ background: "var(--cd-abyss)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{
                borderColor: "var(--cd-border-default)",
                background: "var(--cd-surface)",
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCloseGame}
                  className="cd-btn cd-btn-ghost"
                  aria-label="Close game"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </button>
                <div
                  className="h-6 w-px"
                  style={{ background: "var(--cd-border-default)" }}
                />
                <h2
                  className="text-sm font-medium truncate max-w-xs"
                  style={{ color: "var(--cd-text-primary)" }}
                >
                  {selectedGame.title}
                </h2>
              </div>

              <button
                onClick={handleFullscreen}
                className="cd-btn cd-btn-primary"
                aria-label="Fullscreen"
              >
                <ExpandIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            </div>

            {/* Game Frame */}
            <div className="flex-1 relative bg-black">
              {gameLoading && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center z-10"
                  style={{ background: "var(--cd-abyss)" }}
                >
                  <div className="cd-spinner cd-spinner-lg mb-4" />
                  <p style={{ color: "var(--cd-text-secondary)" }}>
                    Loading game...
                  </p>
                  <p
                    className="text-xs mt-2"
                    style={{ color: "var(--cd-text-muted)" }}
                  >
                    This may take a moment
                  </p>
                </div>
              )}
              <iframe
                data-game-player
                src={`/api/proxy/game?url=${encodeURIComponent(selectedGame.file)}`}
                className="w-full h-full border-0"
                title={selectedGame.title}
                sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups"
                allow="fullscreen; autoplay; clipboard-write"
                allowFullScreen
                onLoad={() => setGameLoading(false)}
                onError={() => {
                  setGameLoading(false);
                  setError("Failed to load game. It may have restrictions.");
                }}
              />
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2 border-t flex items-center justify-between text-xs"
              style={{
                borderColor: "var(--cd-border-default)",
                background: "var(--cd-surface)",
                color: "var(--cd-text-muted)",
              }}
            >
              <span>Challenger Deep Game Player</span>
              <span className="font-mono">
                {selectedGame.id.substring(0, 8)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
