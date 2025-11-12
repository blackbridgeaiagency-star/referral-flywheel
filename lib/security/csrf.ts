// P2: CSRF Protection Implementation
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import logger from '../logger';


const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now();
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${token}:${timestamp}`)
    .digest('hex');

  return `${token}:${timestamp}:${signature}`;
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string): boolean {
  if (!token) return false;

  try {
    const [tokenPart, timestampStr, providedSignature] = token.split(':');

    if (!tokenPart || !timestampStr || !providedSignature) {
      return false;
    }

    const timestamp = parseInt(timestampStr, 10);

    // Check if token is expired (1 hour)
    const tokenAge = Date.now() - timestamp;
    if (tokenAge > 3600000) {
      return false;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(`${tokenPart}:${timestampStr}`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('CSRF validation error:', error);
    return false;
  }
}

/**
 * CSRF middleware for Next.js API routes
 */
export async function withCsrfProtection(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const method = request.method;

  // Only check CSRF for state-changing operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // Get token from header
    const headerToken = request.headers.get(CSRF_TOKEN_HEADER);

    // Get token from cookie
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

    // Both must exist and match
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return NextResponse.json(
        {
          error: 'CSRF token validation failed',
          message: 'Invalid or missing CSRF token',
        },
        { status: 403 }
      );
    }

    // Validate token signature
    if (!validateCsrfToken(headerToken)) {
      return NextResponse.json(
        {
          error: 'CSRF token validation failed',
          message: 'Invalid or expired CSRF token',
        },
        { status: 403 }
      );
    }
  }

  // Execute handler
  const response = await handler();

  // For GET requests, set/refresh CSRF token
  if (method === 'GET') {
    const token = generateCsrfToken();

    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600, // 1 hour
    });

    // Also include token in response header for client-side access
    response.headers.set(CSRF_TOKEN_HEADER, token);
  }

  return response;
}

/**
 * Get CSRF token for client-side use
 */
export async function getCsrfToken(request: NextRequest): Promise<NextResponse> {
  const token = generateCsrfToken();

  const response = NextResponse.json({ token });

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 3600,
  });

  return response;
}

/**
 * Verify CSRF token from request
 */
export function verifyCsrfToken(request: NextRequest): boolean {
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return false;
  }

  return validateCsrfToken(headerToken);
}

/**
 * CSRF configuration options
 */
export interface CsrfConfig {
  excludePaths?: string[];
  customSecret?: string;
  tokenExpiry?: number;
}

/**
 * Advanced CSRF protection with configuration
 */
export class CsrfProtection {
  private config: CsrfConfig;

  constructor(config: CsrfConfig = {}) {
    this.config = {
      excludePaths: [],
      tokenExpiry: 3600000, // 1 hour default
      ...config,
    };
  }

  shouldCheckCsrf(request: NextRequest): boolean {
    const pathname = new URL(request.url).pathname;

    // Check if path is excluded
    if (this.config.excludePaths?.some(path => pathname.startsWith(path))) {
      return false;
    }

    // Only check for state-changing methods
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
  }

  async protect(
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    if (this.shouldCheckCsrf(request)) {
      if (!verifyCsrfToken(request)) {
        return NextResponse.json(
          {
            error: 'CSRF validation failed',
            message: 'Request rejected due to invalid CSRF token',
          },
          { status: 403 }
        );
      }
    }

    const response = await handler();

    // Refresh token on GET requests
    if (request.method === 'GET') {
      const token = generateCsrfToken();
      response.cookies.set(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: Math.floor((this.config.tokenExpiry || 3600000) / 1000),
      });
    }

    return response;
  }
}

// Export default instance
export const csrfProtection = new CsrfProtection({
  excludePaths: [
    '/api/webhooks', // Webhooks have their own signature validation
    '/api/health',
    '/api/metrics',
  ],
});
