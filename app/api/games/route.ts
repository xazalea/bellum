import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Force this route to be dynamic (not pre-rendered at build time)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cache the parsed games in memory
let cachedGames: any = null;
let lastParsed = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface Game {
  id: string;
  title: string;
  description: string;
  thumb: string;
  file: string;
  platform: string;
}

async function parseGamesXml(): Promise<Game[]> {
  const now = Date.now();
  
  // Return cached if available and fresh
  if (cachedGames && (now - lastParsed) < CACHE_DURATION) {
    console.log('[API/games] Returning cached games');
    return cachedGames;
  }
  
  console.log('[API/games] Parsing games.xml...');
  const startTime = Date.now();
  
  try {
    const xmlPath = join(process.cwd(), 'public', 'games.xml');
    const xmlContent = await readFile(xmlPath, 'utf-8');
    
    const games: Game[] = [];
    
    // Fast regex parsing (much faster than XML parser)
    const urlRegex = /<url>([\s\S]*?)<\/url>/g;
    let match;
    
    while ((match = urlRegex.exec(xmlContent)) !== null) {
      const urlBlock = match[1];
      
      // Extract game URL and ID
      const locMatch = /<loc>(https:\/\/html5\.gamedistribution\.com\/([a-f0-9]{32})\/)<\/loc>/.exec(urlBlock);
      if (!locMatch) continue;
      
      const gameUrl = locMatch[1];
      const gameId = locMatch[2];
      
      // Extract image URL
      const imageMatch = /<image:loc>(.*?)<\/image:loc>/.exec(urlBlock);
      const imageUrl = imageMatch ? imageMatch[1] : '';
      
      games.push({
        id: gameId,
        title: `HTML5 Game ${gameId.substring(0, 8)}`,
        description: 'Play this HTML5 game instantly in your browser',
        thumb: imageUrl,
        file: gameUrl,
        platform: 'html5'
      });
    }
    
    cachedGames = games;
    lastParsed = now;
    
    const parseTime = Date.now() - startTime;
    console.log(`[API/games] Parsed ${games.length} games in ${parseTime}ms`);
    
    return games;
  } catch (error) {
    console.error('[API/games] Error parsing XML:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Parse games (uses cache if available)
    const allGames = await parseGamesXml();
    
    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const games = allGames.slice(start, end);
    
    return NextResponse.json({
      games,
      total: allGames.length,
      page,
      limit,
      totalPages: Math.ceil(allGames.length / limit)
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      }
    });
  } catch (error: any) {
    console.error('[API/games] Request failed:', error);
    return NextResponse.json(
      { error: 'Failed to load games', details: error.message },
      { status: 500 }
    );
  }
}
