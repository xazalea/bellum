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
 */
export async function fetchGames(page = 1, limit = 50): Promise<{ games: Game[], total: number }> {
  try {
    const response = await fetch('/games.xml');
    const text = await response.text();
    
    // Rudimentary XML parsing since we can't use extensive DOMParser on server 
    // but this runs on client (browser), so DOMParser is fine.
    // However, if the file is huge, text() might choke.
    // For now, let's assume we can handle the text in memory or slice it.
    
    if (typeof window !== 'undefined') {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const gameNodes = xmlDoc.getElementsByTagName("game");
      
      const total = gameNodes.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      
      const games: Game[] = [];
      
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
