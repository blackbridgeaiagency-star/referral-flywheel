/**
 * Origin Validation Utility
 *
 * SECURITY: Validates request origins to prevent CSRF attacks.
 * This is particularly important for state-changing endpoints
 * that are accessed via forms or AJAX requests.
 *
 * Note: This complements (not replaces) other security measures like:
 * - CSRF tokens for forms
 * - Authentication checks
 * - Rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '../logger';

/**
 * Get the list of allowed origins for the application
 */
function getAllowedOrigins(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const allowedOrigins = [
    // Application's own domain
    appUrl,

    // Whop domains (for iframe embedding)
    'https://whop.com',
    'https://dash.whop.com',
    'https://api.whop.com',

    // Development origins
    ...(process.env.NODE_ENV !== 'production'
      ? [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'https://localhost:3000',
        ]
      : []),
  ].filter((origin): origin is string => Boolean(origin));

  return allowedOrigins;
}

/**
 * Validate if the request origin is allowed
 *
 * @param request - The incoming NextRequest
 * @returns true if origin is valid or absent (same-origin), false otherwise
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');

  // If no Origin header (same-origin requests typically don't send it)
  // Fall back to checking Referer header
  if (!origin) {
    // No Origin and no Referer is typically a same-origin request
    if (!referer) {
      return true;
    }

    // Check if Referer is from an allowed origin
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      return isOriginAllowed(refererOrigin);
    } catch {
      // Invalid Referer URL - reject
      logger.warn('[SECURITY] Invalid Referer header', { referer });
      return false;
    }
  }

  return isOriginAllowed(origin);
}

/**
 * Check if a specific origin is in the allowed list
 */
function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = getAllowedOrigins();

  // Direct match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Subdomain matching for whop.com
  if (origin.endsWith('.whop.com')) {
    return true;
  }

  // Check if origin starts with any allowed origin (handles protocol variations)
  const isAllowed = allowedOrigins.some((allowed) => {
    if (!allowed) return false;
    return origin === allowed || origin.startsWith(allowed + '/');
  });

  if (!isAllowed) {
    logger.warn('[SECURITY] Request from disallowed origin', {
      origin,
      allowedOrigins: allowedOrigins.slice(0, 5), // Log first 5 for brevity
    });
  }

  return isAllowed;
}

/**
 * Middleware helper for origin validation
 *
 * Use this to protect state-changing endpoints from CSRF attacks
 *
 * @param request - The incoming NextRequest
 * @returns NextResponse with 403 if origin invalid, null if valid
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const originError = checkOrigin(request);
 *   if (originError) return originError;
 *
 *   // ... rest of handler
 * }
 * ```
 */
export function checkOrigin(request: NextRequest): NextResponse | null {
  if (!validateOrigin(request)) {
    logger.warn('[SECURITY] CSRF protection: Invalid origin', {
      url: request.url,
      method: request.method,
      origin: request.headers.get('Origin'),
      referer: request.headers.get('Referer'),
    });

    return NextResponse.json(
      { error: 'Invalid request origin' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Higher-order function to wrap handlers with origin validation
 *
 * @example
 * ```typescript
 * export const POST = withOriginValidation(async (request) => {
 *   // Handler code here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withOriginValidation(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const originError = checkOrigin(request);
    if (originError) return originError;

    return handler(request);
  };
}

/**
 * Get CORS headers for responses
 *
 * Use this when you need to explicitly set CORS headers
 * (e.g., for API routes that need cross-origin access)
 */
export function getCorsHeaders(origin?: string | null): HeadersInit {
  const allowedOrigins = getAllowedOrigins();
  const responseOrigin = origin && isOriginAllowed(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': responseOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}
