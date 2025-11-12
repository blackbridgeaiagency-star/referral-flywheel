// lib/cache/redis.ts
import { Redis } from 'ioredis';
import logger from '../logger';


// Redis client singleton
let redis: Redis | null = null;

// Cache configuration
const CACHE_CONFIG = {
  // TTL values in seconds
  TTL: {
    SHORT: 60,              // 1 minute
    MEDIUM: 300,            // 5 minutes
    LONG: 3600,            // 1 hour
    DAY: 86400,            // 24 hours
    WEEK: 604800,          // 7 days
  },

  // Cache key prefixes
  PREFIXES: {
    MEMBER: 'member:',
    CREATOR: 'creator:',
    LEADERBOARD: 'leaderboard:',
    STATS: 'stats:',
    EARNINGS: 'earnings:',
    REFERRALS: 'referrals:',
    COMMISSION: 'commission:',
    ANALYTICS: 'analytics:',
  },

  // Redis options
  OPTIONS: {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    reconnectOnError: (err: Error) => {
      logger.error('Redis reconnect error:', err);
      return true; // Always reconnect
    },
  }
};

/**
 * Initialize Redis connection (P1: Graceful degradation when Redis unavailable)
 */
export function initRedis(): Redis | null {
  // P1 FIX: Skip Redis if explicitly disabled or in development without Redis
  if (process.env.REDIS_DISABLED === 'true') {
    logger.warn(' Redis caching disabled via environment variable');
    return null;
  }

  if (!redis) {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      redis = new Redis(redisUrl, {
        ...CACHE_CONFIG.OPTIONS,
        // P1 FIX: Reduced retries for faster failure
        retryStrategy: (times) => {
          if (times > 3) {
            logger.error('❌ Redis: Max retry attempts reached, disabling cache');
            return null; // Stop retrying after 3 attempts
          }
          const delay = Math.min(times * 100, 500);
          return delay;
        },
      });

      redis.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      redis.on('error', (err) => {
        // P1 FIX: Silence ECONNREFUSED errors in development
        if (err.message.includes('ECONNREFUSED')) {
          logger.warn(' Redis unavailable, caching disabled (app will work without it)');
        } else {
          logger.error('❌ Redis error:', err.message);
        }
      });

      redis.on('close', () => {
        logger.info(' Redis connection closed');
      });

      redis.on('ready', () => {
        logger.info(' Redis ready for caching');
      });
    } catch (error: any) {
      logger.warn(' Failed to initialize Redis, proceeding without cache:', error.message);
      redis = null;
    }
  }

  return redis;
}

/**
 * Get Redis client (with fallback if Redis is unavailable)
 */
export function getRedis(): Redis | null {
  try {
    return initRedis();
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    return null;
  }
}

/**
 * Cache wrapper with automatic serialization
 */
export class CacheManager {
  private redis: Redis | null;

  constructor() {
    this.redis = getRedis();
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set<T>(key: string, value: T, ttl: number = CACHE_CONFIG.TTL.MEDIUM): Promise<void> {
    if (!this.redis) return;

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Cache wrapper function with automatic cache-aside pattern
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = CACHE_CONFIG.TTL.MEDIUM
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, execute function
    const result = await fn();

    // Store in cache for next time
    await this.set(key, result, ttl);

    return result;
  }

  /**
   * Invalidate all caches for a specific entity
   */
  async invalidateEntity(entityType: string, entityId: string): Promise<void> {
    const patterns = [
      `${entityType}:${entityId}:*`,
      `*:${entityType}:${entityId}:*`,
      `leaderboard:*`, // Always invalidate leaderboards on entity changes
      `stats:*`, // Always invalidate stats on entity changes
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    if (!this.redis) return null;

    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();

      return {
        info,
        dbSize,
        connected: this.redis.status === 'ready',
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Export cache configuration
export { CACHE_CONFIG };

/**
 * Decorator for caching method results
 */
export function Cacheable(ttl: number = CACHE_CONFIG.TTL.MEDIUM) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

      return cache.wrap(key, async () => {
        return originalMethod.apply(this, args);
      }, ttl);
    };

    return descriptor;
  };
}

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  /**
   * Invalidate member-related caches
   */
  async invalidateMember(memberId: string): Promise<void> {
    await cache.invalidateEntity('member', memberId);
  },

  /**
   * Invalidate creator-related caches
   */
  async invalidateCreator(creatorId: string): Promise<void> {
    await cache.invalidateEntity('creator', creatorId);
  },

  /**
   * Invalidate all leaderboard caches
   */
  async invalidateLeaderboards(): Promise<void> {
    await cache.deletePattern('leaderboard:*');
  },

  /**
   * Invalidate all stats caches
   */
  async invalidateStats(): Promise<void> {
    await cache.deletePattern('stats:*');
  },

  /**
   * Full cache flush (use with caution!)
   */
  async flushAll(): Promise<void> {
    const redis = getRedis();
    if (redis) {
      await redis.flushdb();
      logger.info('️ Cache flushed');
    }
  },
};