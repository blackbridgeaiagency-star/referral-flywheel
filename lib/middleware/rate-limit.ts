// lib/middleware/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse using token bucket algorithm
 * with sliding window rate limiting
 */

// Rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  // Webhook endpoint - higher limit for Whop
  webhook: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 100,            // 100 requests per minute
    message: 'Too many webhook requests',
  },
  // Public API endpoints
  public: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 30,             // 30 requests per minute
    message: 'Too many requests, please try again later',
  },
  // Authenticated member endpoints
  member: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 60,             // 60 requests per minute
    message: 'Too many requests from this member',
  },
  // Creator dashboard endpoints
  creator: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 100,            // 100 requests per minute
    message: 'Too many dashboard requests',
  },
  // Sensitive operations (e.g., reward claims)
  sensitive: {
    windowMs: 5 * 60 * 1000,    // 5 minutes
    maxRequests: 5,              // 5 requests per 5 minutes
    message: 'Too many attempts, please wait before trying again',
  },
  // Cron job endpoints
  cron: {
    windowMs: 60 * 60 * 1000,   // 1 hour
    maxRequests: 2,              // 2 requests per hour
    message: 'Cron endpoint rate limit exceeded',
  },
};

// Token bucket implementation
interface TokenBucket {
  tokens: number;
  lastRefill: number;
  requests: number[];
}

// Create separate caches for different rate limit types
const rateLimitCaches = new Map<string, LRUCache<string, TokenBucket>>();

/**
 * Get or create a rate limit cache for the given type
 */
function getRateLimitCache(type: keyof typeof RATE_LIMITS): LRUCache<string, TokenBucket> {
  if (!rateLimitCaches.has(type)) {
    const config = RATE_LIMITS[type];
    const cache = new LRUCache<string, TokenBucket>({
      max: 10000, // Store up to 10,000 unique IPs
      ttl: config.windowMs * 2, // Keep entries for 2x the window
    });
    rateLimitCaches.set(type, cache);
  }
  return rateLimitCaches.get(type)!;
}

/**
 * Extract identifier from request (IP address or user ID)
 */
function getIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const cloudflare = request.headers.get('cf-connecting-ip');

  // Use the first available IP
  const ip = forwarded?.split(',')[0].trim() || real || cloudflare || 'unknown';

  // If we have a user ID in headers (from auth), use that instead
  const userId = request.headers.get('x-user-id');

  return userId || ip;
}

/**
 * Check if request should be rate limited
 */
export async function checkRateLimit(
  request: NextRequest,
  type: keyof typeof RATE_LIMITS = 'public'
): Promise<{ limited: boolean; remaining: number; reset: Date }> {
  const config = RATE_LIMITS[type];
  const cache = getRateLimitCache(type);
  const identifier = getIdentifier(request);
  const now = Date.now();

  // Get or create bucket for this identifier
  let bucket = cache.get(identifier);

  if (!bucket) {
    bucket = {
      tokens: config.maxRequests,
      lastRefill: now,
      requests: [],
    };
  }

  // Remove old requests outside the window
  bucket.requests = bucket.requests.filter(
    timestamp => now - timestamp < config.windowMs
  );

  // Check if we're within limits
  const limited = bucket.requests.length >= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - bucket.requests.length);

  // Calculate when the oldest request will expire
  const oldestRequest = bucket.requests[0] || now;
  const reset = new Date(oldestRequest + config.windowMs);

  if (!limited) {
    // Add this request to the bucket
    bucket.requests.push(now);
    cache.set(identifier, bucket);
  }

  return { limited, remaining, reset };
}

/**
 * Rate limiting middleware for API routes
 */
export async function withRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: keyof typeof RATE_LIMITS = 'public'
): Promise<NextResponse> {
  const { limited, remaining, reset } = await checkRateLimit(request, type);

  if (limited) {
    const config = RATE_LIMITS[type];
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: config.message,
        retryAfter: reset.toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toISOString(),
          'Retry-After': Math.ceil((reset.getTime() - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Process the request and add rate limit headers to response
  const response = await handler(request);
  const config = RATE_LIMITS[type];

  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toISOString());

  return response;
}

/**
 * Express-style middleware wrapper for easier use
 */
export function rateLimit(type: keyof typeof RATE_LIMITS = 'public') {
  return (handler: (request: NextRequest) => Promise<NextResponse>) => {
    return (request: NextRequest) => withRateLimit(request, handler, type);
  };
}

/**
 * Clear rate limit for a specific identifier (useful for testing)
 */
export function clearRateLimit(identifier: string, type?: keyof typeof RATE_LIMITS): void {
  if (type) {
    const cache = getRateLimitCache(type);
    cache.delete(identifier);
  } else {
    // Clear from all caches
    const caches = Array.from(rateLimitCaches.values());
    for (const cache of caches) {
      cache.delete(identifier);
    }
  }
}

/**
 * Get current rate limit status for an identifier
 */
export function getRateLimitStatus(
  identifier: string,
  type: keyof typeof RATE_LIMITS = 'public'
): { used: number; remaining: number; reset: Date } | null {
  const config = RATE_LIMITS[type];
  const cache = getRateLimitCache(type);
  const bucket = cache.get(identifier);

  if (!bucket) {
    return {
      used: 0,
      remaining: config.maxRequests,
      reset: new Date(Date.now() + config.windowMs),
    };
  }

  const now = Date.now();
  const validRequests = bucket.requests.filter(
    timestamp => now - timestamp < config.windowMs
  );

  const oldestRequest = validRequests[0] || now;

  return {
    used: validRequests.length,
    remaining: Math.max(0, config.maxRequests - validRequests.length),
    reset: new Date(oldestRequest + config.windowMs),
  };
}