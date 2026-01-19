/**
 * Fast Game XML Parser (WASM)
 * Fallback to DOMParser if WASM unavailable
 */

import { loadAndInstantiate } from './loader';

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  url: string;
  category: string;
  width: number;
  height: number;
}

interface GameParserWasm {
  GameParser: {
    new(): any;
  };
}

let wasmModule: any | null = null;
let parser: any | null = null;
let useWasm = false;

/**
 * Initialize game parser
 */
export async function initGameParser(): Promise<boolean> {
  try {
    wasmModule = await loadAndInstantiate('/wasm/game-parser.wasm');
    if (wasmModule && wasmModule.GameParser) {
      parser = new wasmModule.GameParser();
      useWasm = true;
      console.log('✅ Game Parser WASM loaded');
      return true;
    }
  } catch (error) {
    console.warn('Game Parser WASM failed, using JS fallback:', error);
  }
  
  useWasm = false;
  return false;
}

/**
 * Parse XML game data
 */
export async function parseGameXML(xmlData: string): Promise<void> {
  if (!parser && !useWasm) {
    await initGameParser();
  }

  if (useWasm && parser) {
    try {
      parser.parse_xml(xmlData);
      return;
    } catch (error) {
      console.warn('WASM XML parse failed, using fallback:', error);
      useWasm = false;
    }
  }

  // JavaScript fallback - store in memory for fallback parser
  if (typeof window !== 'undefined') {
    (window as any).__gameXmlData = xmlData;
  }
}

/**
 * Get total game count
 */
export function getGameCount(): number {
  if (useWasm && parser) {
    return parser.game_count();
  }
  
  // Fallback: parse and count
  return parseGamesFallback().length;
}

/**
 * Get games (paginated)
 */
export async function getGames(page: number, pageSize: number): Promise<GameInfo[]> {
  if (!parser && !useWasm) {
    await initGameParser();
  }

  if (useWasm && parser) {
    try {
      const result = parser.get_games(page, pageSize);
      return result || [];
    } catch (error) {
      console.warn('WASM get_games failed, using fallback:', error);
      useWasm = false;
    }
  }

  // JavaScript fallback
  const allGames = parseGamesFallback();
  const start = page * pageSize;
  const end = start + pageSize;
  return allGames.slice(start, end);
}

/**
 * Search games by name/description
 */
export async function searchGames(query: string): Promise<GameInfo[]> {
  if (!parser && !useWasm) {
    await initGameParser();
  }

  if (useWasm && parser) {
    try {
      return parser.search_games(query) || [];
    } catch (error) {
      console.warn('WASM search failed, using fallback:', error);
      useWasm = false;
    }
  }

  // JavaScript fallback
  const allGames = parseGamesFallback();
  const queryLower = query.toLowerCase();
  return allGames.filter(g =>
    g.name.toLowerCase().includes(queryLower) ||
    g.description.toLowerCase().includes(queryLower)
  );
}

/**
 * Filter games by category
 */
export async function filterByCategory(category: string): Promise<GameInfo[]> {
  if (!parser && !useWasm) {
    await initGameParser();
  }

  if (useWasm && parser) {
    try {
      return parser.filter_by_category(category) || [];
    } catch (error) {
      console.warn('WASM filter failed, using fallback:', error);
      useWasm = false;
    }
  }

  // JavaScript fallback
  const allGames = parseGamesFallback();
  return allGames.filter(g => g.category === category);
}

/**
 * JavaScript fallback parser (DOMParser)
 */
function parseGamesFallback(): GameInfo[] {
  if (typeof window === 'undefined') return [];
  
  const xmlData = (window as any).__gameXmlData;
  if (!xmlData) return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlData, 'text/xml');
    const gameElements = doc.querySelectorAll('game');
    
    const games: GameInfo[] = [];
    gameElements.forEach(gameEl => {
      games.push({
        id: gameEl.getAttribute('id') || '',
        name: gameEl.querySelector('name')?.textContent || '',
        description: gameEl.querySelector('description')?.textContent || '',
        thumbnail: gameEl.querySelector('thumbnail')?.textContent || '',
        url: gameEl.querySelector('url')?.textContent || '',
        category: gameEl.querySelector('category')?.textContent || '',
        width: parseInt(gameEl.getAttribute('width') || '800'),
        height: parseInt(gameEl.getAttribute('height') || '600'),
      });
    });
    
    return games;
  } catch (error) {
    console.error('Fallback XML parse failed:', error);
    return [];
  }
}

/**
 * Check if WASM is being used
 */
export function isUsingWasm(): boolean {
  return useWasm;
}
