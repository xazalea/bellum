/**
 * Rate Limiting Module
 * IP-based and user-based rate limiting
 */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  skipFailedRequests: false,
};

/**
 * In-Memory Rate Limiter
 */
class RateLimiter {
  private entries: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: number | null = null;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = window.setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check rate limit for an identifier
   */
  check(
    identifier: string,
    config: Partial<RateLimitConfig> = {}
  ): RateLimitResult {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const key = cfg.keyGenerator ? cfg.keyGenerator(identifier) : identifier;
    const now = Date.now();
    const resetTime = now + cfg.windowMs;

    let entry = this.entries.get(key);

    // Create new entry or reset expired entry
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime,
        blocked: false,
      };
      this.entries.set(key, entry);
    }

    // Check if blocked
    if (entry.blocked && entry.resetTime > now) {
      return {
        allowed: false,
        limit: cfg.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      };
    }

    // Increment count
    entry.count++;

    // Check limit
    const allowed = entry.count <= cfg.maxRequests;
    const remaining = Math.max(0, cfg.maxRequests - entry.count);

    if (!allowed) {
      entry.blocked = true;
    }

    return {
      allowed,
      limit: cfg.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  /**
   * Record a request (for tracking without blocking)
   */
  record(identifier: string, config: Partial<RateLimitConfig> = {}): void {
    this.check(identifier, config);
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.entries.delete(identifier);
  }

  /**
   * Get current status for an identifier
   */
  getStatus(identifier: string, config: Partial<RateLimitConfig> = {}): RateLimitResult {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const now = Date.now();
    const entry = this.entries.get(identifier);

    if (!entry || entry.resetTime <= now) {
      return {
        allowed: true,
        limit: cfg.maxRequests,
        remaining: cfg.maxRequests,
        resetTime: now + cfg.windowMs,
      };
    }

    return {
      allowed: entry.count < cfg.maxRequests,
      limit: cfg.maxRequests,
      remaining: Math.max(0, cfg.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.resetTime <= now) {
        this.entries.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.entries.clear();
  }
}

/**
 * Multi-tier Rate Limiter
 * Supports different limits for different endpoints/actions
 */
class MultiTierRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  /**
   * Register a rate limit tier
   */
  registerTier(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
    this.limiters.set(name, new RateLimiter());
  }

  /**
   * Check rate limit for a tier
   */
  check(tier: string, identifier: string): RateLimitResult {
    const limiter = this.limiters.get(tier);
    const config = this.configs.get(tier);

    if (!limiter || !config) {
      // Default to allowing if tier not found
      return {
        allowed: true,
        limit: 100,
        remaining: 100,
        resetTime: Date.now() + 60000,
      };
    }

    return limiter.check(identifier, config);
  }

  /**
   * Reset rate limit for a tier and identifier
   */
  reset(tier: string, identifier: string): void {
    const limiter = this.limiters.get(tier);
    if (limiter) {
      limiter.reset(identifier);
    }
  }

  /**
   * Destroy all limiters
   */
  destroy(): void {
    for (const limiter of this.limiters.values()) {
      limiter.destroy();
    }
    this.limiters.clear();
    this.configs.clear();
  }
}

// Pre-configured tiers
const DEFAULT_TIERS: Record<string, RateLimitConfig> = {
  // API rate limits
  'api:general': { windowMs: 60000, maxRequests: 100 },
  'api:auth': { windowMs: 900000, maxRequests: 10 }, // 15 min, 10 attempts
  'api:upload': { windowMs: 3600000, maxRequests: 20 }, // 1 hour, 20 uploads
  
  // User actions
  'user:login': { windowMs: 900000, maxRequests: 5 },
  'user:register': { windowMs: 3600000, maxRequests: 3 },
  'user:password-reset': { windowMs: 3600000, maxRequests: 3 },
  
  // IP-based limits
  'ip:global': { windowMs: 60000, maxRequests: 200 },
  'ip:strict': { windowMs: 60000, maxRequests: 30 },
};

// Singleton instances
export const rateLimiter = new RateLimiter();
export const multiTierRateLimiter = new MultiTierRateLimiter();

// Initialize default tiers
for (const [name, config] of Object.entries(DEFAULT_TIERS)) {
  multiTierRateLimiter.registerTier(name, config);
}

// Convenience functions
export function checkRateLimit(
  identifier: string,
  config?: Partial<RateLimitConfig>
): RateLimitResult {
  return rateLimiter.check(identifier, config);
}

export function checkTierRateLimit(
  tier: string,
  identifier: string
): RateLimitResult {
  return multiTierRateLimiter.check(tier, identifier);
}

export function resetRateLimit(identifier: string): void {
  rateLimiter.reset(identifier);
}

// Middleware factory for API routes
export function createRateLimitMiddleware(
  tier: string,
  getIdentifier: (req: Request) => string
) {
  return async (req: Request): Promise<Response | null> => {
    const identifier = getIdentifier(req);
    const result = multiTierRateLimiter.check(tier, identifier);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.resetTime),
            'Retry-After': String(result.retryAfter || 60),
          },
        }
      );
    }

    return null; // Continue to next handler
  };
}