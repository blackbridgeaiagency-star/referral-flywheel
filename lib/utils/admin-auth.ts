/**
 * Admin Authentication Utility
 *
 * SECURITY: Admin tokens must NEVER be hardcoded in client components.
 * This utility provides secure methods for admin authentication.
 */

/**
 * Get admin token from environment variable.
 * This should only be used in server-side code or API routes.
 *
 * For client-side admin pages, use session-based authentication
 * or redirect through a secure API route.
 */
export function getAdminToken(): string {
  const token = process.env.ADMIN_API_KEY;

  if (!token) {
    throw new Error('ADMIN_API_KEY environment variable is not set');
  }

  return token;
}

/**
 * Verify admin token from request header.
 * Use this in API routes to validate admin access.
 */
export function verifyAdminToken(requestToken: string | null): boolean {
  if (!requestToken) {
    return false;
  }

  const validToken = process.env.ADMIN_API_KEY;

  if (!validToken) {
    console.error('ADMIN_API_KEY not configured');
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  if (requestToken.length !== validToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < requestToken.length; i++) {
    result |= requestToken.charCodeAt(i) ^ validToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get admin headers for server-side fetch requests.
 * ONLY use this in server components or API routes, NEVER in client components.
 */
export function getAdminHeaders(): Record<string, string> {
  return {
    'x-admin-token': getAdminToken(),
  };
}

/**
 * Admin API client configuration
 * Contains constants for admin endpoints
 */
export const ADMIN_API = {
  HEADER_NAME: 'x-admin-token',
} as const;
