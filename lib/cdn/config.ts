/**
 * CDN Configuration for Game Assets
 * Uses jsDelivr as the primary CDN for GitHub-hosted assets
 * 
 * jsDelivr provides free CDN for:
 * - GitHub repositories: https://cdn.jsdelivr.net/gh/user/repo@version/path
 * - npm packages: https://cdn.jsdelivr.net/npm/pkg@version/path
 */

import { JSDELIVR_CDN } from '@/lib/config/constants';

export interface CDNConfig {
  // Primary CDN URL
  baseUrl: string;
  
  // Asset URLs by type
  assets: {
    games: string;
    thumbnails: string;
    emulators: string;
    saves: string;
    roms: string;
  };
  
  // Cache settings
  cache: {
    maxAge: number;
    staleWhileRevalidate: number;
  };
  
  // Retry configuration
  retry: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export const cdnConfig: CDNConfig = {
  // Use jsDelivr as primary CDN
  baseUrl: process.env.CDN_URL || JSDELIVR_CDN.baseUrl,
  
  assets: {
    // jsDelivr URLs for game assets from GitHub repo
    games: process.env.CDN_GAMES_URL || JSDELIVR_CDN.gamesUrl,
    thumbnails: process.env.CDN_THUMBNAILS_URL || JSDELIVR_CDN.thumbnailsUrl,
    emulators: process.env.CDN_EMULATORS_URL || JSDELIVR_CDN.emulatorsUrl,
    saves: process.env.CDN_SAVES_URL || `${JSDELIVR_CDN.baseUrl}/gh/xazalea/bellum/saves`,
    roms: process.env.CDN_ROMS_URL || `${JSDELIVR_CDN.baseUrl}/gh/xazalea/bellum/roms`,
  },
  
  cache: {
    // jsDelivr has excellent caching - 7 days for tags, 12 hours for branches
    maxAge: 86400, // 24 hours
    staleWhileRevalidate: 3600, // 1 hour
  },
  
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
};

/**
 * Get jsDelivr URL for a GitHub asset
 */
export function getJsDelivrUrl(repo: string, path: string, version: string = 'main'): string {
  return JSDELIVR_CDN.github(repo, path, version);
}

/**
 * Get jsDelivr URL for an npm package
 */
export function getNpmUrl(pkg: string, path: string, version: string = 'latest'): string {
  return JSDELIVR_CDN.npm(pkg, path, version);
}

/**
 * Get CDN URL for a game asset
 */
export function getGameAssetUrl(gameId: string, assetType: 'thumbnail' | 'rom' | 'save'): string {
  const base = cdnConfig.baseUrl;
  
  switch (assetType) {
    case 'thumbnail':
      return `${cdnConfig.assets.thumbnails}/${gameId}.webp`;
    case 'rom':
      return `${cdnConfig.assets.roms}/${gameId}.rom`;
    case 'save':
      return `${cdnConfig.assets.saves}/${gameId}.sav`;
    default:
      return `${base}/${gameId}`;
  }
}

/**
 * Get emulator asset URL
 */
export function getEmulatorAssetUrl(emulator: string, file: string): string {
  return `${cdnConfig.assets.emulators}/${emulator}/${file}`;
}

/**
 * Fetch with CDN fallback and retry
 */
export async function fetchWithCDN(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const urls = [
    `${cdnConfig.baseUrl}${path}`,
    path, // Fallback to origin
  ];
  
  let lastError: Error | null = null;
  
  for (const url of urls) {
    for (let attempt = 0; attempt < cdnConfig.retry.maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            'Cache-Control': `max-age=${cdnConfig.cache.maxAge}`,
          },
        });
        
        if (response.ok) {
          return response;
        }
        
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error as Error;
        
        // Wait before retry
        if (attempt < cdnConfig.retry.maxAttempts - 1) {
          await new Promise((resolve) => 
            setTimeout(resolve, cdnConfig.retry.backoffMs * (attempt + 1))
          );
        }
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch from CDN');
}

/**
 * Preload game assets
 */
export function preloadGameAssets(gameId: string): void {
  const thumbnailUrl = getGameAssetUrl(gameId, 'thumbnail');
  
  // Preload thumbnail
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = thumbnailUrl;
  document.head.appendChild(link);
}

/**
 * Purge CDN cache for a path
 */
export async function purgeCDNCache(path: string): Promise<boolean> {
  const purgeUrl = process.env.CDN_PURGE_URL;
  const purgeToken = process.env.CDN_PURGE_TOKEN;
  
  if (!purgeUrl || !purgeToken) {
    console.warn('CDN purge not configured');
    return false;
  }
  
  try {
    const response = await fetch(purgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${purgeToken}`,
      },
      body: JSON.stringify({ path }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to purge CDN cache:', error);
    return false;
  }
}

/**
 * Get CDN health status
 */
export async function checkCDNHealth(): Promise<{
  healthy: boolean;
  latency: number;
  region: string;
}> {
  const start = Date.now();
  
  try {
    const response = await fetch(`${cdnConfig.baseUrl}/health`, {
      method: 'HEAD',
      cache: 'no-cache',
    });
    
    const latency = Date.now() - start;
    
    return {
      healthy: response.ok,
      latency,
      region: response.headers.get('cf-ray')?.split('-')[1] || 'unknown',
    };
  } catch {
    return {
      healthy: false,
      latency: Date.now() - start,
      region: 'unknown',
    };
  }
}