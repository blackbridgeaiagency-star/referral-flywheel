/**
 * Caching layer for Referral Flywheel
 *
 * Strategies:
 * 1. In-memory cache for development (Node.js Map)
 * 2. Next.js unstable_cache for production (Vercel)
 * 3. Optional Redis integration (future enhancement)
 *
 * TTL (Time To Live):
 * - Leaderboards: 5 minutes
 * - Member stats: 1 minute
 * - Creator analytics: 10 minutes
 * - Conversion metrics: 5 minutes
 */

import { unstable_cache } from 'next/cache';

// In-memory cache for development
const memoryCache = new Map<string, { value: any; expires: number }>();

export interface CacheOptions {
  ttl: number; // seconds
  tags?: string[]; // for cache invalidation
}

/**
 * Cache key generator
 */
export function cacheKey(namespace: string, ...args: (string | number)[]): string {
  return `${namespace}:${args.join(':')}`;
}

/**
 * Get from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  // Check in-memory cache first
  const cached = memoryCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value as T;
  }

  // Clean up expired entry
  if (cached) {
    memoryCache.delete(key);
  }

  return null;
}

/**
 * Set cache value
 */
export async function setCache<T>(key: string, value: T, options: CacheOptions): Promise<void> {
  const expires = Date.now() + (options.ttl * 1000);
  memoryCache.set(key, { value, expires });

  // Auto-cleanup after TTL + 1 minute
  setTimeout(() => {
    memoryCache.delete(key);
  }, (options.ttl + 60) * 1000);
}

/**
 * Delete cache entry
 */
export async function deleteCache(key: string): Promise<void> {
  memoryCache.delete(key);
}

/**
 * Delete cache entries by pattern
 */
export async function deleteCacheByPattern(pattern: string): Promise<void> {
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  const keys = Array.from(memoryCache.keys());
  for (const key of keys) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<void> {
  memoryCache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
  hitRate?: number;
} {
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys()),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HIGHER-ORDER CACHING FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Wrap a function with caching
 * Usage:
 *   const getCachedLeaderboard = withCache(
 *     getLeaderboard,
 *     'leaderboard',
 *     { ttl: 300 }
 *   );
 */
export function withCache<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  namespace: string,
  options: CacheOptions
) {
  return async (...args: TArgs): Promise<TReturn> => {
    const key = cacheKey(namespace, ...args.map(String));

    // Try to get from cache
    const cached = await getCache<TReturn>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    await setCache(key, result, options);

    return result;
  };
}

/**
 * Next.js production cache wrapper
 * Uses Next.js unstable_cache for Vercel deployment
 */
export function withNextCache<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  namespace: string,
  options: CacheOptions
) {
  if (process.env.NODE_ENV === 'production') {
    return unstable_cache(fn, [namespace], {
      revalidate: options.ttl,
      tags: options.tags,
    });
  }

  // Development: use in-memory cache
  return withCache(fn, namespace, options);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CACHE INVALIDATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Invalidate member-related caches
 * Call this when a member's data changes (new referral, commission paid, etc.)
 */
export async function invalidateMemberCache(memberId: string, creatorId?: string): Promise<void> {
  await deleteCacheByPattern(`member:${memberId}:*`);
  await deleteCacheByPattern(`member-stats:${memberId}`);

  if (creatorId) {
    await deleteCacheByPattern(`creator:${creatorId}:*`);
    await deleteCacheByPattern(`leaderboard:${creatorId}:*`);
  }

  // Invalidate global leaderboards
  await deleteCacheByPattern('leaderboard:global:*');
}

/**
 * Invalidate creator-related caches
 * Call this when a creator's data changes (new member, new commission, etc.)
 */
export async function invalidateCreatorCache(creatorId: string): Promise<void> {
  await deleteCacheByPattern(`creator:${creatorId}:*`);
  await deleteCacheByPattern(`creator-analytics:${creatorId}`);
  await deleteCacheByPattern(`leaderboard:${creatorId}:*`);
}

/**
 * Invalidate leaderboard caches
 * Call this after rankings change
 */
export async function invalidateLeaderboardCache(creatorId?: string): Promise<void> {
  if (creatorId) {
    await deleteCacheByPattern(`leaderboard:${creatorId}:*`);
  } else {
    await deleteCacheByPattern('leaderboard:*');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRE-CONFIGURED CACHE WRAPPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CACHE_CONFIG = {
  // Short TTL for frequently changing data
  SHORT: { ttl: 60 }, // 1 minute

  // Medium TTL for semi-static data
  MEDIUM: { ttl: 300 }, // 5 minutes

  // Long TTL for rarely changing data
  LONG: { ttl: 600 }, // 10 minutes

  // Very long TTL for static data
  STATIC: { ttl: 3600 }, // 1 hour
} as const;

/**
 * Cache helper for member stats (1 min TTL)
 */
export function cacheMemberStats<T>(
  fn: (userId: string) => Promise<T>
) {
  return withNextCache(fn, 'member-stats', CACHE_CONFIG.SHORT);
}

/**
 * Cache helper for leaderboards (5 min TTL)
 */
export function cacheLeaderboard<T>(
  fn: (creatorId: string, type: string, limit: number) => Promise<T>
) {
  return withNextCache(fn, 'leaderboard', CACHE_CONFIG.MEDIUM);
}

/**
 * Cache helper for creator analytics (10 min TTL)
 */
export function cacheCreatorAnalytics<T>(
  fn: (creatorId: string) => Promise<T>
) {
  return withNextCache(fn, 'creator-analytics', CACHE_CONFIG.LONG);
}

/**
 * Cache helper for conversion metrics (5 min TTL)
 */
export function cacheConversionMetrics<T>(
  fn: (creatorId: string, days: number) => Promise<T>
) {
  return withNextCache(fn, 'conversion-metrics', CACHE_CONFIG.MEDIUM);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STALE-WHILE-REVALIDATE HELPER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SWROptions extends CacheOptions {
  staleTime: number; // seconds before considering data stale
}

/**
 * Stale-while-revalidate pattern
 * Returns cached data immediately, revalidates in background
 */
export function withSWR<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  namespace: string,
  options: SWROptions
) {
  return async (...args: TArgs): Promise<TReturn> => {
    const key = cacheKey(namespace, ...args.map(String));
    const cached = memoryCache.get(key);

    // Return stale data immediately if available
    if (cached) {
      const isStale = cached.expires - Date.now() < options.staleTime * 1000;

      if (isStale) {
        // Revalidate in background (don't await)
        fn(...args).then(result => {
          setCache(key, result, options);
        });
      }

      return cached.value as TReturn;
    }

    // No cache, fetch and cache
    const result = await fn(...args);
    await setCache(key, result, options);
    return result;
  };
}
