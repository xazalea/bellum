/**
 * Rate Limiter
 * Handle rate limits gracefully for Google compute
 */

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

export interface RateLimitStatus {
  limited: boolean;
  remainingRequests: number;
  resetTime: number;
  backoffLevel: number;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private requestTimestamps: number[] = [];
  private backoffLevel: number = 0;
  private backoffUntil: number = 0;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequestsPerMinute: config.maxRequestsPerMinute ?? 60,
      maxRequestsPerHour: config.maxRequestsPerHour ?? 1000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      maxBackoffMs: config.maxBackoffMs ?? 300000, // 5 minutes
    };
  }

  /**
   * Check if request is allowed
   */
  canMakeRequest(): boolean {
    const now = Date.now();

    // Check if in backoff period
    if (this.backoffUntil > now) {
      return false;
    }

    // Clean old timestamps
    this._cleanOldTimestamps();

    // Check minute limit
    const minuteAgo = now - 60000;
    const recentRequests = this.requestTimestamps.filter((t) => t > minuteAgo);
    if (recentRequests.length >= this.config.maxRequestsPerMinute) {
      return false;
    }

    // Check hour limit
    const hourAgo = now - 3600000;
    const hourRequests = this.requestTimestamps.filter((t) => t > hourAgo);
    if (hourRequests.length >= this.config.maxRequestsPerHour) {
      return false;
    }

    return true;
  }

  /**
   * Record request
   */
  recordRequest(): void {
    this.requestTimestamps.push(Date.now());
    this._cleanOldTimestamps();
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(): void {
    const backoffMs = this._calculateBackoff();
    this.backoffUntil = Date.now() + backoffMs;
    this.backoffLevel++;

    console.warn(
      `[RateLimiter] Rate limit hit. Backing off for ${backoffMs}ms (level ${this.backoffLevel})`
    );
  }

  /**
   * Reset backoff
   */
  resetBackoff(): void {
    this.backoffLevel = 0;
    this.backoffUntil = 0;
  }

  /**
   * Get status
   */
  getStatus(): RateLimitStatus {
    const now = Date.now();
    const minuteAgo = now - 60000;
    const hourAgo = now - 3600000;

    const recentRequests = this.requestTimestamps.filter((t) => t > minuteAgo).length;
    const hourRequests = this.requestTimestamps.filter((t) => t > hourAgo).length;

    const remainingMinute = Math.max(
      0,
      this.config.maxRequestsPerMinute - recentRequests
    );
    const remainingHour = Math.max(0, this.config.maxRequestsPerHour - hourRequests);

    return {
      limited: !this.canMakeRequest(),
      remainingRequests: Math.min(remainingMinute, remainingHour),
      resetTime: this.backoffUntil,
      backoffLevel: this.backoffLevel,
    };
  }

  /**
   * Wait until request can be made
   */
  async waitForSlot(): Promise<void> {
    while (!this.canMakeRequest()) {
      const status = this.getStatus();
      const waitTime = Math.max(100, status.resetTime - Date.now());
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Calculate backoff duration
   */
  private _calculateBackoff(): number {
    const baseBackoff = 1000; // 1 second
    const backoff = baseBackoff * Math.pow(this.config.backoffMultiplier, this.backoffLevel);
    return Math.min(backoff, this.config.maxBackoffMs);
  }

  /**
   * Clean old timestamps
   */
  private _cleanOldTimestamps(): void {
    const hourAgo = Date.now() - 3600000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > hourAgo);
  }

  /**
   * Get request count
   */
  getRequestCount(windowMs: number = 60000): number {
    const cutoff = Date.now() - windowMs;
    return this.requestTimestamps.filter((t) => t > cutoff).length;
  }

  /**
   * Clear history
   */
  clear(): void {
    this.requestTimestamps = [];
    this.backoffLevel = 0;
    this.backoffUntil = 0;
  }
}

// Singleton instance
let instance: RateLimiter | null = null;

export function getRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
  if (!instance) {
    instance = new RateLimiter(config);
  }
  return instance;
}
