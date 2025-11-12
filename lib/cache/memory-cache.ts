/**
 * High-Performance In-Memory Cache
 * Reduces database load for frequently accessed data
 * Optimized for high-traffic scenarios
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
  hits: number;
}

export class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private defaultTTL: number;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };

  constructor(maxSize = 1000, defaultTTL = 300) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL; // seconds
    this.stats = { hits: 0, misses: 0, evictions: 0 };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const expiry = Date.now() + (ttl || this.defaultTTL) * 1000;
    this.cache.set(key, {
      data: value,
      expiry,
      hits: 0,
    });
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) + '%',
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Evict least recently used entries
   */
  private evictOldest(): void {
    // Find entry with lowest hits
    let minHits = Infinity;
    let keyToEvict: string | null = null;

    this.cache.forEach((entry, key) => {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        keyToEvict = key;
      }
    });

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
    }
  }

  /**
   * Memoize an async function
   */
  memoize<T>(
    fn: (...args: any[]) => Promise<T>,
    keyGenerator?: (...args: any[]) => string,
    ttl?: number
  ): (...args: any[]) => Promise<T> {
    return async (...args: any[]): Promise<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      const cached = this.get<T>(key);

      if (cached !== null) {
        return cached;
      }

      const result = await fn(...args);
      this.set(key, result, ttl);
      return result;
    };
  }
}

// Create singleton instances for different cache purposes
export const caches = {
  // User session cache (short TTL)
  session: new MemoryCache(5000, 300), // 5 min TTL

  // API response cache (medium TTL)
  api: new MemoryCache(1000, 600), // 10 min TTL

  // Database query cache (long TTL)
  db: new MemoryCache(2000, 1800), // 30 min TTL

  // Leaderboard cache (very short TTL for real-time updates)
  leaderboard: new MemoryCache(100, 60), // 1 min TTL

  // Commission calculation cache
  commission: new MemoryCache(1000, 900), // 15 min TTL
};

/**
 * Cache key generators for consistent key formatting
 */
export const cacheKeys = {
  // Member cache keys
  member: (id: string) => `member:${id}`,
  memberByCode: (code: string) => `member:code:${code}`,
  memberStats: (id: string) => `member:stats:${id}`,

  // Creator cache keys
  creator: (id: string) => `creator:${id}`,
  creatorStats: (id: string) => `creator:stats:${id}`,
  creatorRevenue: (id: string) => `creator:revenue:${id}`,

  // Leaderboard cache keys
  leaderboard: (creatorId: string, period: string) => `leaderboard:${creatorId}:${period}`,

  // Commission cache keys
  commission: (memberId: string, period: string) => `commission:${memberId}:${period}`,
  commissionTotal: (memberId: string) => `commission:total:${memberId}`,

  // API cache keys
  whopCompany: (id: string) => `whop:company:${id}`,
  whopProduct: (id: string) => `whop:product:${id}`,
};

/**
 * Cache wrapper for database queries
 */
export function withCache<T>(
  cacheInstance: MemoryCache,
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return cacheInstance.memoize(fn, () => key, ttl)();
}

// Export default instance
export default new MemoryCache();