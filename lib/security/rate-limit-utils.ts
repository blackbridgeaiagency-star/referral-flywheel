// lib/security/rate-limit-utils.ts
// Simplified rate limiting utilities - complex implementation removed for build compatibility

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (replace with Redis in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Apply rate limiting to a request
 * @param identifier - Unique identifier for the rate limit (IP, userId, etc.)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export async function applyRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const key = identifier;

  // Get or create rate limit data
  let rateLimit = requestCounts.get(key);

  // Reset if window has expired
  if (!rateLimit || rateLimit.resetAt <= now) {
    rateLimit = {
      count: 0,
      resetAt: now + windowMs
    };
  }

  // Check if limit exceeded
  if (rateLimit.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: rateLimit.resetAt
    };
  }

  // Increment count
  rateLimit.count++;
  requestCounts.set(key, rateLimit);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    Array.from(requestCounts.entries()).forEach(([k, v]) => {
      if (v.resetAt <= now) {
        requestCounts.delete(k);
      }
    });
  }

  return {
    success: true,
    remaining: maxRequests - rateLimit.count,
    resetAt: rateLimit.resetAt
  };
}

/**
 * Simple rate limiting middleware for Next.js routes
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  options: {
    identifier?: string;
    maxRequests?: number;
    windowMs?: number;
  } = {}
): Promise<NextResponse | null> {
  const identifier = options.identifier ||
    request.headers.get('x-forwarded-for') ||
    request.ip ||
    'anonymous';

  const result = await applyRateLimit(
    identifier,
    options.maxRequests || 10,
    options.windowMs || 60000
  );

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(options.maxRequests || 10),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000))
        }
      }
    );
  }

  return null; // Continue processing
}

/**
 * Get IP address from request
 */
export function getIpAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return request.ip || '0.0.0.0';
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
  api: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
  webhook: { maxRequests: 1000, windowMs: 60000 }, // 1000 requests per minute
  auth: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
  leaderboard: { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  referral: { maxRequests: 50, windowMs: 60000 }, // 50 requests per minute
};

// Legacy exports for compatibility with existing code
export async function withRateLimit(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
  config?: any
) {
  const response = await rateLimitMiddleware(req, config);
  if (response) return response;
  return handler();
}