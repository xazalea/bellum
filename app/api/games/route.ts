import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// Use Node.js runtime for file system access
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache the parsed games in memory
let cachedGames: Game[] | null = null;
let lastParsed = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface Game {
  id: string;
  title: string;
  description: string;
  thumb: string;
  file: string;
  platform?: string;
  width?: string;
  height?: string;
}

// Fisher-Yates shuffle algorithm with seed for consistency
function shuffleArray<T>(array: T[], seed?: string): T[] {
  const shuffled = [...array];

  if (!seed) {
    // Simple random shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Seeded random shuffle
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = hash & hash;
  }

  const seededRandom = () => {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function loadGamesFromDisk(): Game[] {
  const now = Date.now();

  // Return cached if available and fresh
  if (cachedGames && now - lastParsed < CACHE_DURATION) {
    return cachedGames;
  }

  const publicDir = join(process.cwd(), "public");

  // Try loading JSON first (much faster)
  try {
    const jsonPath = join(publicDir, "games.json");
    const jsonContent = readFileSync(jsonPath, "utf8");
    const data = JSON.parse(jsonContent);

    const games: Game[] = data.games || [];
    cachedGames = games;
    lastParsed = now;

    console.log(`[API/games] Loaded ${games.length} games from JSON`);
    return games;
  } catch (jsonError) {
    console.warn(
      "[API/games] Failed to load games.json, trying XML:",
      jsonError,
    );
  }

  // Fallback to XML
  try {
    const xmlPath = join(publicDir, "games.xml");
    const xmlContent = readFileSync(xmlPath, "utf8");

    const games: Game[] = [];
    const urlRegex = /<url>([\s\S]*?)<\/url>/g;
    let match;

    while ((match = urlRegex.exec(xmlContent)) !== null) {
      const urlBlock = match[1];

      // Extract game URL and ID
      const locMatch =
        /<loc>(https:\/\/html5\.gamedistribution\.com\/([a-f0-9]{32})\/)<\/loc>/.exec(
          urlBlock,
        );
      if (!locMatch) continue;

      const gameUrl = locMatch[1];
      const gameId = locMatch[2];

      // Extract image URL
      const imageMatch = /<image:loc>(.*?)<\/image:loc>/.exec(urlBlock);
      const imageUrl = imageMatch ? imageMatch[1] : "";

      games.push({
        id: gameId,
        title: `HTML5 Game ${gameId.substring(0, 8)}`,
        description: "Play this HTML5 game instantly in your browser",
        thumb: imageUrl,
        file: gameUrl,
        platform: "html5",
        width: "800",
        height: "600",
      });
    }

    cachedGames = games;
    lastParsed = now;

    console.log(`[API/games] Loaded ${games.length} games from XML`);
    return games;
  } catch (xmlError) {
    console.error("[API/games] Failed to load games.xml:", xmlError);
    throw new Error("Could not load games catalog");
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const randomize = searchParams.get("randomize") === "true";
    const seed = searchParams.get("seed") || undefined;

    // Load games from disk
    let allGames = loadGamesFromDisk();

    if (allGames.length === 0) {
      return NextResponse.json(
        { error: "No games available", games: [], total: 0 },
        { status: 404 },
      );
    }

    // Randomize if requested (with seed for consistency within session)
    if (randomize) {
      allGames = shuffleArray(allGames, seed);
    }

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const games = allGames.slice(start, end);

    return NextResponse.json(
      {
        games,
        total: allGames.length,
        page,
        limit,
        totalPages: Math.ceil(allGames.length / limit),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error: any) {
    console.error("[API/games] Request failed:", error);
    return NextResponse.json(
      { error: "Failed to load games", details: error.message },
      { status: 500 },
    );
  }
}
