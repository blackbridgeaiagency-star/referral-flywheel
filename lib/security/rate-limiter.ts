// lib/security/rate-limiter.ts
import { Redis } from 'ioredis';
import { getRedis } from '@/lib/cache/redis';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests in the window
  identifier: string;    // Key identifier (IP, userId, etc.)
  namespace?: string;    // Optional namespace for different endpoints
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean;     // Don't count failed requests
  keyGenerator?: (req: any) => string; // Custom key generator
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Milliseconds until next request allowed
}

/**
 * Rate limiter strategies
 */
export enum RateLimitStrategy {
  SLIDING_WINDOW = 'sliding_window',
  FIXED_WINDOW = 'fixed_window',
  TOKEN_BUCKET = 'token_bucket',
  LEAKY_BUCKET = 'leaky_bucket',
}

/**
 * Core rate limiter class
 */
export class RateLimiter {
  private redis: Redis | null;
  private strategy: RateLimitStrategy;

  constructor(strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW) {
    this.redis = getRedis();
    this.strategy = strategy;
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    if (!this.redis) {
      // If Redis is unavailable, allow the request but log warning
      console.warn('Rate limiter: Redis unavailable, allowing request');
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: new Date(Date.now() + config.windowMs),
      };
    }

    switch (this.strategy) {
      case RateLimitStrategy.SLIDING_WINDOW:
        return this.slidingWindow(config);
      case RateLimitStrategy.FIXED_WINDOW:
        return this.fixedWindow(config);
      case RateLimitStrategy.TOKEN_BUCKET:
        return this.tokenBucket(config);
      case RateLimitStrategy.LEAKY_BUCKET:
        return this.leakyBucket(config);
      default:
        return this.slidingWindow(config);
    }
  }

  /**
   * Sliding window rate limiting (most accurate)
   */
  private async slidingWindow(config: RateLimitConfig): Promise<RateLimitResult> {
    const key = this.getKey(config);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis sorted set for sliding window
      const pipeline = this.redis!.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, '-inf', windowStart);

      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Count requests in window
      pipeline.zcard(key);

      // Set expiry
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();
      const count = results?.[2]?.[1] as number || 0;

      if (count > config.maxRequests) {
        // Get the oldest entry that would need to expire
        const oldestEntries = await this.redis!.zrange(key, 0, 0, 'WITHSCORES');
        const oldestTimestamp = oldestEntries?.[1] ? parseInt(oldestEntries[1]) : now;
        const resetAt = new Date(oldestTimestamp + config.windowMs);
        const retryAfter = resetAt.getTime() - now;

        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetAt,
          retryAfter: Math.max(0, retryAfter),
        };
      }

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - count),
        resetAt: new Date(now + config.windowMs),
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow the request
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowMs),
      };
    }
  }

  /**
   * Fixed window rate limiting (simple but less accurate)
   */
  private async fixedWindow(config: RateLimitConfig): Promise<RateLimitResult> {
    const key = this.getKey(config);
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const windowKey = `${key}:${windowStart}`;

    try {
      const pipeline = this.redis!.pipeline();
      pipeline.incr(windowKey);
      pipeline.expire(windowKey, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();
      const count = results?.[0]?.[1] as number || 0;

      const resetAt = new Date(windowStart + config.windowMs);
      const remaining = Math.max(0, config.maxRequests - count);

      return {
        allowed: count <= config.maxRequests,
        limit: config.maxRequests,
        remaining,
        resetAt,
        retryAfter: count > config.maxRequests ? resetAt.getTime() - now : undefined,
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowMs),
      };
    }
  }

  /**
   * Token bucket rate limiting
   */
  private async tokenBucket(config: RateLimitConfig): Promise<RateLimitResult> {
    const key = this.getKey(config);
    const now = Date.now();
    const refillRate = config.maxRequests / config.windowMs; // Tokens per ms

    try {
      // Get current bucket state
      const bucketData = await this.redis!.get(`${key}:bucket`);
      let tokens = config.maxRequests;
      let lastRefill = now;

      if (bucketData) {
        const parsed = JSON.parse(bucketData);
        tokens = parsed.tokens;
        lastRefill = parsed.lastRefill;

        // Calculate tokens to add based on time passed
        const timePassed = now - lastRefill;
        const tokensToAdd = timePassed * refillRate;
        tokens = Math.min(config.maxRequests, tokens + tokensToAdd);
      }

      if (tokens >= 1) {
        // Consume a token
        tokens -= 1;

        await this.redis!.setex(
          `${key}:bucket`,
          Math.ceil(config.windowMs / 1000),
          JSON.stringify({ tokens, lastRefill: now })
        );

        return {
          allowed: true,
          limit: config.maxRequests,
          remaining: Math.floor(tokens),
          resetAt: new Date(now + config.windowMs),
        };
      } else {
        // Calculate when next token will be available
        const timeToNextToken = (1 - tokens) / refillRate;

        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetAt: new Date(now + timeToNextToken),
          retryAfter: Math.ceil(timeToNextToken),
        };
      }
    } catch (error) {
      console.error('Rate limiter error:', error);
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowMs),
      };
    }
  }

  /**
   * Leaky bucket rate limiting
   */
  private async leakyBucket(config: RateLimitConfig): Promise<RateLimitResult> {
    const key = this.getKey(config);
    const now = Date.now();
    const leakRate = config.windowMs / config.maxRequests; // ms per request

    try {
      const queueKey = `${key}:queue`;
      const lastLeakKey = `${key}:leak`;

      // Get last leak time
      const lastLeak = await this.redis!.get(lastLeakKey);
      const lastLeakTime = lastLeak ? parseInt(lastLeak) : now;

      // Calculate how many requests have leaked
      const timeSinceLastLeak = now - lastLeakTime;
      const requestsLeaked = Math.floor(timeSinceLastLeak / leakRate);

      if (requestsLeaked > 0) {
        // Remove leaked requests from queue
        await this.redis!.pipeline()
          .ltrim(queueKey, requestsLeaked, -1)
          .set(lastLeakKey, now)
          .expire(lastLeakKey, Math.ceil(config.windowMs / 1000))
          .exec();
      }

      // Check queue size
      const queueSize = await this.redis!.llen(queueKey);

      if (queueSize < config.maxRequests) {
        // Add to queue
        await this.redis!.pipeline()
          .rpush(queueKey, now)
          .expire(queueKey, Math.ceil(config.windowMs / 1000))
          .exec();

        return {
          allowed: true,
          limit: config.maxRequests,
          remaining: Math.max(0, config.maxRequests - queueSize - 1),
          resetAt: new Date(now + config.windowMs),
        };
      } else {
        // Queue is full
        const nextLeakTime = lastLeakTime + (leakRate * (queueSize - config.maxRequests + 1));

        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetAt: new Date(nextLeakTime),
          retryAfter: Math.max(0, nextLeakTime - now),
        };
      }
    } catch (error) {
      console.error('Rate limiter error:', error);
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowMs),
      };
    }
  }

  /**
   * Generate cache key
   */
  private getKey(config: RateLimitConfig): string {
    const namespace = config.namespace || 'default';
    return `ratelimit:${namespace}:${config.identifier}`;
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string, namespace?: string): Promise<void> {
    if (!this.redis) return;

    const key = `ratelimit:${namespace || 'default'}:${identifier}`;

    try {
      await this.redis.del(key, `${key}:*`);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  // API endpoints
  STRICT: { windowMs: 60000, maxRequests: 10 },      // 10 per minute
  STANDARD: { windowMs: 60000, maxRequests: 60 },    // 60 per minute
  RELAXED: { windowMs: 60000, maxRequests: 120 },    // 120 per minute

  // Specific operations
  LOGIN: { windowMs: 900000, maxRequests: 5 },       // 5 per 15 minutes
  SIGNUP: { windowMs: 3600000, maxRequests: 3 },     // 3 per hour
  PASSWORD_RESET: { windowMs: 3600000, maxRequests: 3 }, // 3 per hour
  WEBHOOK: { windowMs: 1000, maxRequests: 10 },      // 10 per second
  COMMISSION: { windowMs: 60000, maxRequests: 30 },  // 30 per minute
  EXPORT: { windowMs: 300000, maxRequests: 5 },      // 5 per 5 minutes
};

/**
 * Express/Next.js middleware
 */
export function rateLimitMiddleware(
  preset: keyof typeof RateLimitPresets | RateLimitConfig,
  options?: Partial<RateLimitConfig>
) {
  const limiter = new RateLimiter(RateLimitStrategy.SLIDING_WINDOW);
  const config = typeof preset === 'string'
    ? { ...RateLimitPresets[preset], ...options }
    : { ...preset, ...options };

  return async (req: any, res: any, next?: any) => {
    // Generate identifier (IP by default)
    const identifier = config.identifier ||
                      config.keyGenerator?.(req) ||
                      req.ip ||
                      req.headers['x-forwarded-for'] ||
                      'unknown';

    const result = await limiter.checkLimit({
      ...config,
      identifier,
      namespace: config.namespace || req.path,
    });

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil((result.retryAfter || 0) / 1000));

      if (res.status) {
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Please try again later',
          retryAfter: result.retryAfter,
          resetAt: result.resetAt,
        });
      }

      return new Response(JSON.stringify({
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: result.retryAfter,
        resetAt: result.resetAt,
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toISOString(),
          'Retry-After': Math.ceil((result.retryAfter || 0) / 1000).toString(),
        },
      });
    }

    if (next) {
      next();
    }
  };
}

/**
 * Rate limit by user ID
 */
export function userRateLimiter(userId: string, namespace?: string) {
  return rateLimitMiddleware(RateLimitPresets.STANDARD, {
    identifier: userId,
    namespace: namespace || 'user',
  });
}

/**
 * Rate limit by API key
 */
export function apiKeyRateLimiter(apiKey: string, limit: number = 1000, windowMs: number = 60000) {
  return rateLimitMiddleware({
    windowMs,
    maxRequests: limit,
    identifier: apiKey,
    namespace: 'api',
  });
}

// Export singleton instance
export const rateLimiter = new RateLimiter();