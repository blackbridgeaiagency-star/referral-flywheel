/**
 * Advanced Rate Limiter for High-Load Production
 * Uses sliding window algorithm with token bucket for burst protection
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '../logger';

interface RateLimitConfig {
  windowMs: number;           // Time window in milliseconds
  maxRequests: number;        // Max requests per window
  burstAllowance: number;     // Additional burst capacity
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  tokens: number;
  resetTime: number;
  requests: number[];
}

// In-memory store for rate limit tracking
// In production, use Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  rateLimitStore.forEach((entry, key) => {
    if (entry.resetTime < now) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => rateLimitStore.delete(key));
}, 60000); // Clean every minute

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `ratelimit:${ip}`;
}

/**
 * Advanced rate limiter with burst protection
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    burstAllowance = Math.floor(maxRequests * 0.2), // 20% burst by default
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return async function rateLimiter(
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        tokens: maxRequests + burstAllowance,
        resetTime: now + windowMs,
        requests: [],
      };
      rateLimitStore.set(key, entry);
    }

    // Clean old requests from sliding window
    entry.requests = entry.requests.filter(time => time > now - windowMs);

    // Check if rate limit exceeded
    if (entry.requests.length >= maxRequests) {
      // Check burst allowance
      if (entry.tokens <= 0) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

        logger.warn(`Rate limit exceeded for ${key}`, {
          requests: entry.requests.length,
          maxRequests,
          retryAfter,
        });

        return new NextResponse(
          JSON.stringify({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
            },
          }
        );
      }

      // Use burst token
      entry.tokens--;
    }

    // Add current request
    entry.requests.push(now);

    // Calculate remaining requests
    const remaining = Math.max(0, maxRequests - entry.requests.length);

    try {
      // Execute handler
      const response = await handler();

      // Skip counting successful requests if configured
      if (skipSuccessfulRequests && response.status < 400) {
        entry.requests.pop(); // Remove this request from count
      }

      // Add rate limit headers to response
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', maxRequests.toString());
      headers.set('X-RateLimit-Remaining', remaining.toString());
      headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      // Skip counting failed requests if configured
      if (skipFailedRequests) {
        entry.requests.pop();
      }
      throw error;
    }
  };
}

/**
 * Pre-configured rate limiters for different endpoints
 */
export const rateLimiters = {
  // Standard API endpoints
  api: createRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,          // 100 requests per minute
    burstAllowance: 20,        // Allow 20 extra for bursts
  }),

  // Webhook endpoints (higher limit)
  webhook: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 500,          // 500 webhooks per minute
    burstAllowance: 100,
  }),

  // Auth endpoints (stricter)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 10,           // 10 attempts per 15 minutes
    burstAllowance: 2,
  }),

  // Public endpoints (very high limit)
  public: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 1000,         // 1000 requests per minute
    burstAllowance: 200,
  }),

  // Admin endpoints
  admin: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 50,
    burstAllowance: 10,
    keyGenerator: (req) => {
      // Rate limit by API key for admin
      const apiKey = req.headers.get('x-api-key');
      return apiKey ? `admin:${apiKey}` : 'admin:unknown';
    },
  }),
};

/**
 * Middleware helper for easy integration
 */
export function withRateLimit(
  limiterName: keyof typeof rateLimiters = 'api'
) {
  const limiter = rateLimiters[limiterName];

  return function middleware(handler: any) {
    return async function wrappedHandler(req: NextRequest, ...args: any[]) {
      return limiter(req, async () => {
        return handler(req, ...args);
      });
    };
  };
}

// Export types
export type { RateLimitConfig, RateLimitEntry };