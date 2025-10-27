// lib/security/rate-limit-utils.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, RateLimitPresets, RateLimitConfig } from './rate-limiter';

/**
 * Apply rate limiting to Next.js API route
 */
export async function withRateLimit(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
  config?: Partial<RateLimitConfig> | keyof typeof RateLimitPresets
) {
  // Determine config
  const limitConfig = typeof config === 'string'
    ? RateLimitPresets[config]
    : { ...RateLimitPresets.STANDARD, ...config };

  // Get identifier (IP address or user ID from headers)
  const identifier = req.headers.get('x-user-id') ||
                    req.headers.get('x-forwarded-for') ||
                    req.ip ||
                    'unknown';

  // Check rate limit
  const result = await rateLimiter.checkLimit({
    ...limitConfig,
    identifier,
    namespace: new URL(req.url).pathname,
  });

  // Create headers
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetAt.toISOString());

  // If rate limit exceeded
  if (!result.allowed) {
    headers.set('Retry-After', Math.ceil((result.retryAfter || 0) / 1000).toString());

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
        resetAt: result.resetAt,
      },
      {
        status: 429,
        headers
      }
    );
  }

  // Execute handler and add rate limit headers to response
  const response = await handler();

  // Add rate limit headers to successful response
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Rate limit decorator for class methods
 */
export function RateLimit(
  config?: Partial<RateLimitConfig> | keyof typeof RateLimitPresets
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [req] = args;

      if (req instanceof NextRequest) {
        return withRateLimit(req, async () => {
          return originalMethod.apply(this, args);
        }, config);
      }

      // If not a NextRequest, execute normally
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * IP-based rate limiting
 */
export async function checkIpRateLimit(
  ip: string,
  namespace: string = 'ip',
  config: Partial<RateLimitConfig> = {}
) {
  return rateLimiter.checkLimit({
    ...RateLimitPresets.STANDARD,
    ...config,
    identifier: ip,
    namespace,
  });
}

/**
 * User-based rate limiting
 */
export async function checkUserRateLimit(
  userId: string,
  namespace: string = 'user',
  config: Partial<RateLimitConfig> = {}
) {
  return rateLimiter.checkLimit({
    ...RateLimitPresets.RELAXED,
    ...config,
    identifier: userId,
    namespace,
  });
}

/**
 * API key-based rate limiting
 */
export async function checkApiKeyRateLimit(
  apiKey: string,
  namespace: string = 'api',
  config: Partial<RateLimitConfig> = {}
) {
  return rateLimiter.checkLimit({
    windowMs: 60000,
    maxRequests: 1000, // Higher limit for API keys
    ...config,
    identifier: apiKey,
    namespace,
  });
}

/**
 * Dynamic rate limiting based on user tier
 */
export async function checkTierBasedRateLimit(
  userId: string,
  userTier: 'free' | 'pro' | 'enterprise',
  namespace: string = 'tier'
) {
  const tierLimits = {
    free: { windowMs: 60000, maxRequests: 10 },
    pro: { windowMs: 60000, maxRequests: 100 },
    enterprise: { windowMs: 60000, maxRequests: 1000 },
  };

  return rateLimiter.checkLimit({
    ...tierLimits[userTier],
    identifier: `${userTier}:${userId}`,
    namespace,
  });
}

/**
 * Distributed rate limiting for multiple servers
 */
export class DistributedRateLimiter {
  private serverId: string;

  constructor(serverId: string = process.env.SERVER_ID || 'default') {
    this.serverId = serverId;
  }

  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ) {
    // Add server ID to namespace for distributed tracking
    const distributedConfig = {
      ...config,
      namespace: `${config.namespace}:distributed`,
      identifier: `${this.serverId}:${identifier}`,
    };

    return rateLimiter.checkLimit(distributedConfig);
  }

  async getGlobalUsage(identifier: string, namespace: string = 'default') {
    // This would aggregate usage across all servers
    // For now, return local usage
    return rateLimiter.checkLimit({
      windowMs: 60000,
      maxRequests: 100,
      identifier,
      namespace: `${namespace}:distributed`,
    });
  }
}

/**
 * Cost-based rate limiting for expensive operations
 */
export class CostBasedRateLimiter {
  private costMap: Map<string, number> = new Map();

  constructor(operations?: Record<string, number>) {
    if (operations) {
      Object.entries(operations).forEach(([op, cost]) => {
        this.costMap.set(op, cost);
      });
    }

    // Default costs for common operations
    this.costMap.set('read', 1);
    this.costMap.set('write', 5);
    this.costMap.set('delete', 3);
    this.costMap.set('export', 10);
    this.costMap.set('webhook', 2);
    this.costMap.set('ai_request', 20);
  }

  async checkCostLimit(
    identifier: string,
    operation: string,
    maxCost: number = 100,
    windowMs: number = 60000
  ) {
    const cost = this.costMap.get(operation) || 1;
    const adjustedMax = Math.floor(maxCost / cost);

    return rateLimiter.checkLimit({
      windowMs,
      maxRequests: adjustedMax,
      identifier: `${identifier}:${operation}`,
      namespace: 'cost',
    });
  }
}

/**
 * Adaptive rate limiting that adjusts based on system load
 */
export class AdaptiveRateLimiter {
  private loadThresholds = {
    low: 1.0,     // Normal limits
    medium: 0.7,  // 70% of normal
    high: 0.5,    // 50% of normal
    critical: 0.2 // 20% of normal
  };

  async checkLimit(
    identifier: string,
    baseConfig: RateLimitConfig,
    systemLoad: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ) {
    const multiplier = this.loadThresholds[systemLoad];
    const adjustedConfig = {
      ...baseConfig,
      maxRequests: Math.floor(baseConfig.maxRequests * multiplier),
    };

    return rateLimiter.checkLimit(adjustedConfig);
  }

  getSystemLoad(): 'low' | 'medium' | 'high' | 'critical' {
    // In production, this would check actual system metrics
    // For now, return 'low'
    return 'low';
  }
}

/**
 * Burst-allowing rate limiter
 */
export class BurstRateLimiter {
  async checkLimit(
    identifier: string,
    config: {
      sustained: RateLimitConfig;
      burst: RateLimitConfig;
    }
  ) {
    // Check burst limit first
    const burstResult = await rateLimiter.checkLimit({
      ...config.burst,
      identifier,
      namespace: 'burst',
    });

    if (!burstResult.allowed) {
      return burstResult;
    }

    // Then check sustained limit
    const sustainedResult = await rateLimiter.checkLimit({
      ...config.sustained,
      identifier,
      namespace: 'sustained',
    });

    // Return the more restrictive result
    return {
      ...sustainedResult,
      remaining: Math.min(burstResult.remaining, sustainedResult.remaining),
    };
  }
}

// Export instances
export const distributedRateLimiter = new DistributedRateLimiter();
export const costBasedRateLimiter = new CostBasedRateLimiter();
export const adaptiveRateLimiter = new AdaptiveRateLimiter();
export const burstRateLimiter = new BurstRateLimiter();