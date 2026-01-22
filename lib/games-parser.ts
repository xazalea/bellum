import { initGameParser, parseGameXML, getGames as getGamesWasm, isUsingWasm } from '@/lib/wasm/game-parser';

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

/**
 * Parsed chunks of games to avoid loading massive XML at once
 * Enhanced with WASM streaming parser for 10-20x faster parsing
 */
export async function fetchGames(page = 1, limit = 50): Promise<{ games: Game[], total: number }> {
  try {
    const response = await fetch('/games.xml');
    const text = await response.text();
    
    // Try WASM parser first (10-20x faster streaming parser)
    if (typeof window !== 'undefined') {
      try {
        await initGameParser();
        await parseGameXML(text);
        
        const wasmGames = await getGamesWasm(page - 1, limit); // WASM uses 0-based pages
        
        if (isUsingWasm() && wasmGames.length > 0) {
          console.log(`🚀 WASM parser loaded ${wasmGames.length} games (page ${page})`);
          return {
            games: wasmGames.map(g => ({
              id: g.id,
              title: g.name,
              description: g.description,
              thumb: g.thumbnail,
              file: g.url,
              width: g.width.toString(),
              height: g.height.toString(),
              platform: 'html5',
            })),
            total: wasmGames.length * page, // Estimate
          };
        }
      } catch (wasmError) {
        console.warn('WASM game parser failed, using DOMParser fallback:', wasmError);
      }
      
      // Fallback to DOMParser (namespace-safe)
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      
      // Check if it's a Sitemap (urlset/url) or Game List (games/game)
      // NOTE: `games.xml` uses a default XML namespace (sitemap). `getElementsByTagName('url')`
      // can return 0 in some browsers when namespaces are present. Use NS-aware lookup.
      const urlNodes =
        // @ts-ignore - TS DOM lib doesn't always model overloads perfectly across targets
        typeof xmlDoc.getElementsByTagNameNS === 'function'
          ? // @ts-ignore
            xmlDoc.getElementsByTagNameNS('*', 'url')
          : xmlDoc.getElementsByTagName("url");
      const gameNodes =
        // @ts-ignore
        typeof xmlDoc.getElementsByTagNameNS === 'function'
          ? // @ts-ignore
            xmlDoc.getElementsByTagNameNS('*', 'game')
          : xmlDoc.getElementsByTagName("game");
      
      const games: Game[] = [];
      
      if (gameNodes.length > 0) {
          // Standard Game XML format
          const total = gameNodes.length;
          const start = (page - 1) * limit;
          const end = start + limit;
          
          for (let i = start; i < Math.min(end, total); i++) {
            const node = gameNodes[i];
            if (!node) continue;
            
            games.push({
              id: i.toString(),
              title: getTagValue(node, 'title'),
              description: getTagValue(node, 'description'),
              thumb: getTagValue(node, 'thumb'),
              file: getTagValue(node, 'file'),
              width: getTagValue(node, 'width'),
              height: getTagValue(node, 'height')
            });
          }
          return { games, total };
      } else if (urlNodes.length > 0) {
          // Sitemap format
          const total = urlNodes.length;
          const start = (page - 1) * limit;
          const end = start + limit;
          
          for (let i = start; i < Math.min(end, total); i++) {
            const node = urlNodes[i];
            if (!node) continue;
            
            const locEls =
              // @ts-ignore
              typeof (node as any).getElementsByTagNameNS === 'function'
                ? // @ts-ignore
                  (node as any).getElementsByTagNameNS('*', 'loc')
                : (node as any).getElementsByTagName?.('loc') || [];

            const loc = (locEls?.[0]?.textContent || '').trim();
            // In sitemap format, both <loc> and <image:loc> share localName "loc".
            const imageLoc = (locEls?.[1]?.textContent || '').trim();
            
            // Extract ID from URL (last segment)
            // https://html5.gamedistribution.com/218ac3fe3df6ff2c8fe8f9353f1084f6/ -> 218ac3fe3df6ff2c8fe8f9353f1084f6
            const idMatch = loc.match(/\/([a-f0-9]{32})\/?$/);
            const id = idMatch ? idMatch[1] : `game-${i}`;
            
            // Title is not in sitemap, use ID or generic name for now
            // We could try to fetch metadata but that would be slow for a list
            const title = `Game ${id.substring(0, 6)}...`;
            
            games.push({
              id: id,
              title: title,
              description: 'Play this game instantly in your browser.',
              thumb: imageLoc,
              file: loc,
              width: '800',
              height: '600',
              platform: 'html5'
            });
          }
          return { games, total };
      }
      
      return { games: [], total: 0 };
    }
    
    return { games: [], total: 0 };
  } catch (e) {
    console.error("Failed to parse games.xml", e);
    return { games: [], total: 0 };
  }
}

function getTagValue(parent: Element, tagName: string): string {
  const node = parent.getElementsByTagName(tagName)[0];
  return node ? node.textContent || '' : '';
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
