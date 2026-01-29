import { GamesCatalog, readGamesCatalog, writeGamesCatalog, getCatalogAgeMs } from '@/lib/games/cache-manager';

export interface Game {
  id: string;
  title: string;
  description: string;
  thumb: string;
  file: string;
  width?: string;
  height?: string;
  platform?: string; // e.g. 'flash', 'html5'
}

// In-memory cache for parsed catalog
let cachedCatalog: GamesCatalog | null = null;
let isLoading = false;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const BACKGROUND_REFRESH_MS = 60 * 60 * 1000; // 1 hour

function getNodeText(parent: Element, tagName: string): string {
  const nsGetter = (parent as any).getElementsByTagNameNS;
  const els =
    typeof nsGetter === 'function'
      ? nsGetter.call(parent, '*', tagName)
      : parent.getElementsByTagName(tagName);
  return (els?.[0]?.textContent || '').trim();
}

function parseGamesXml(xmlText: string): { games: Game[]; total: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const urlNodes =
    typeof doc.getElementsByTagNameNS === 'function'
      ? doc.getElementsByTagNameNS('*', 'url')
      : doc.getElementsByTagName('url');
  const gameNodes =
    typeof doc.getElementsByTagNameNS === 'function'
      ? doc.getElementsByTagNameNS('*', 'game')
      : doc.getElementsByTagName('game');

  if (gameNodes.length > 0) {
    const total = gameNodes.length;
    const games: Game[] = [];
    for (let i = 0; i < total; i++) {
      const node = gameNodes[i];
      if (!node) continue;
      games.push({
        id: i.toString(),
        title: getNodeText(node, 'title'),
        description: getNodeText(node, 'description'),
        thumb: getNodeText(node, 'thumb'),
        file: getNodeText(node, 'file'),
        width: getNodeText(node, 'width'),
        height: getNodeText(node, 'height'),
      });
    }
    return { games, total };
  }

  if (urlNodes.length > 0) {
    const total = urlNodes.length;
    const games: Game[] = [];
    for (let i = 0; i < total; i++) {
      const node = urlNodes[i];
      if (!node) continue;
      const loc = getNodeText(node, 'loc');
      const imageLoc = (() => {
        const nsGetter = (node as any).getElementsByTagNameNS;
        const els =
          typeof nsGetter === 'function'
            ? nsGetter.call(node, '*', 'loc')
            : (node as any).getElementsByTagName?.('loc') || [];
        return (els?.[1]?.textContent || '').trim();
      })();
      const idMatch = loc.match(/\/([a-f0-9]{32})\/?$/);
      const id = idMatch ? idMatch[1] : `game-${i}`;
      const title = `HTML5 Game ${id.substring(0, 8)}`;
      games.push({
        id,
        title,
        description: 'Play this HTML5 game instantly in your browser. No downloads required!',
        thumb: imageLoc,
        file: loc,
        width: '800',
        height: '600',
        platform: 'html5',
      });
    }
    return { games, total };
  }

  return { games: [], total: 0 };
}

async function parseGamesXmlAsync(xmlText: string): Promise<{ games: Game[]; total: number }> {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return parseGamesXml(xmlText);
  }
  return new Promise((resolve) => {
    try {
      const worker = new Worker(new URL('../workers/games-parser.worker.ts', import.meta.url));
      const cleanup = () => worker.terminate();
      worker.onmessage = (event: MessageEvent<{ games: Game[]; total: number }>) => {
        cleanup();
        resolve(event.data);
      };
      worker.onerror = () => {
        cleanup();
        resolve(parseGamesXml(xmlText));
      };
      worker.postMessage({ xmlText });
    } catch (error) {
      console.warn('[GamesParser] Worker unavailable, parsing on main thread', error);
      resolve(parseGamesXml(xmlText));
    }
  });
}

async function refreshCatalog(force = false): Promise<GamesCatalog | null> {
  if (isLoading) {
    return cachedCatalog;
  }
  if (!force && cachedCatalog && getCatalogAgeMs(cachedCatalog) < BACKGROUND_REFRESH_MS) {
    return cachedCatalog;
  }

  isLoading = true;
  try {
    const headers: Record<string, string> = {};
    if (cachedCatalog?.etag) headers['If-None-Match'] = cachedCatalog.etag;
    if (cachedCatalog?.lastModified) headers['If-Modified-Since'] = cachedCatalog.lastModified;
    
    // Try JSON first (much faster to parse), fallback to XML
    console.log('[GamesParser] Attempting to load games.json...');
    let response = await fetch('/games.json', { headers });
    let useJson = response.ok;
    
    if (!response.ok) {
      console.log('[GamesParser] games.json not found, falling back to games.xml');
      response = await fetch('/games.xml', { headers });
      useJson = false;
    }
    
    if (!response.ok && response.status !== 304) {
      console.error('[GamesParser] Failed to fetch games catalog:', response.status, response.statusText);
      throw new Error(`Failed to fetch games catalog: ${response.status}`);
    }
    
    if (response.status === 304 && cachedCatalog) {
      console.log('[GamesParser] Using cached catalog (304)');
      const updated: GamesCatalog = {
        ...cachedCatalog,
        cachedAt: Date.now(),
      };
      cachedCatalog = updated;
      await writeGamesCatalog(updated);
      return updated;
    }
    
    const text = await response.text();
    console.log(`[GamesParser] Received ${useJson ? 'JSON' : 'XML'} (${(text.length / 1024).toFixed(0)}KB), parsing...`);
    
    if (!text || text.length < 100) {
      console.error('[GamesParser] File is too short or empty');
      throw new Error('Games file is empty or invalid');
    }
    
    let games: Game[];
    let total: number;
    
    if (useJson) {
      // Parse JSON (much faster)
      const startTime = performance.now();
      const data = JSON.parse(text);
      games = data.games || [];
      total = data.total || games.length;
      console.log(`[GamesParser] Parsed ${total} games from JSON in ${(performance.now() - startTime).toFixed(0)}ms`);
    } else {
      // Parse XML (slower)
      const startTime = performance.now();
      const parsed = await parseGamesXmlAsync(text);
      games = parsed.games;
      total = parsed.total;
      console.log(`[GamesParser] Parsed ${total} games from XML in ${(performance.now() - startTime).toFixed(0)}ms`);
    }
    
    if (total === 0) {
      console.warn('[GamesParser] No games found');
    }
    
    const catalog: GamesCatalog = {
      id: 'games',
      games,
      total,
      cachedAt: Date.now(),
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
    };
    cachedCatalog = catalog;
    await writeGamesCatalog(catalog);
    return catalog;
  } catch (error) {
    console.error('[GamesParser] Failed to refresh games catalog:', error);
    return cachedCatalog;
  } finally {
    isLoading = false;
  }
}

async function getCatalog(): Promise<GamesCatalog | null> {
  if (cachedCatalog) {
    if (getCatalogAgeMs(cachedCatalog) > CACHE_DURATION) {
      void refreshCatalog(false);
    }
    return cachedCatalog;
  }
  const stored = await readGamesCatalog();
  if (stored) {
    cachedCatalog = stored;
    if (getCatalogAgeMs(stored) > CACHE_DURATION) {
      void refreshCatalog(false);
    }
    return stored;
  }
  return refreshCatalog(true);
}

/**
 * Fetch games from API (server-side parsing for better performance)
 * Falls back to client-side parsing if API fails
 */
export async function fetchGames(page = 1, limit = 50): Promise<{ games: Game[], total: number }> {
  try {
    // Try API first (server-side parsing is much faster)
    console.log(`[GamesParser] Fetching games from API (page ${page}, limit ${limit})`);
    const apiUrl = `/api/games?page=${page}&limit=${limit}`;
    const response = await fetch(apiUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[GamesParser] Loaded ${data.games.length} games from API`);
      return {
        games: data.games,
        total: data.total
      };
    }
    
    console.warn('[GamesParser] API failed, falling back to client-side parsing');
    
    // Fallback to client-side catalog
    const catalog = await getCatalog();
    if (!catalog) {
      return { games: [], total: 0 };
    }
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      games: catalog.games.slice(start, end),
      total: catalog.total,
    };
  } catch (e) {
    console.error("[GamesParser] Failed to fetch games:", e);
    return { games: [], total: 0 };
  }
}

/**
 * Proxies a game URL using the Nacho Proxy strategy
 */
export function getProxiedGameUrl(originalUrl: string): string {
  // If we had a dedicated proxy endpoint: return `/api/proxy?url=${encodeURIComponent(originalUrl)}`;
  // For now, we rely on the Service Worker intercepting fetch requests with 'X-Nacho-Proxy' header.
  // But for an iframe src, we can't easily add headers.
  // We might need a rewrite URL if the SW intercepts matching patterns.
  
  // Checking nacho-proxy-sw.js:
  // It intercepts fetch if X-Nacho-Proxy header OR if hostname matches specific domains.
  // For iframes, we can't set headers.
  // Does it have a URL-based trigger?
  // "shouldProxy" checks hostname includes gamedistribution, cloudflare, etc.
  
  // If we really need to force proxy, we might need a wrapper page that fetches blob and serves it,
  // or a backend route.
  
  // Let's assume direct URL works if SW is active and domain matches.
  return originalUrl;
}
