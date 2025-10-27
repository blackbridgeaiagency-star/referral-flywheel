// lib/utils/ip-hash.ts
import crypto from 'crypto';

/**
 * Hash an IP address for privacy-compliant storage
 * Uses SHA-256 with a salt for security
 */
export function hashIP(ip: string | null): string {
  if (!ip) return 'unknown';

  // Clean the IP (remove port if present)
  const cleanIP = ip.split(',')[0].trim().split(':')[0];

  // Use a consistent salt (in production, this should be an environment variable)
  const salt = process.env.IP_HASH_SALT || 'referral-flywheel-default-salt';

  // Create SHA-256 hash
  const hash = crypto
    .createHash('sha256')
    .update(cleanIP + salt)
    .digest('hex');

  // Return first 16 characters for reasonable uniqueness while saving space
  return hash.substring(0, 16);
}

/**
 * Extract real IP from various header formats
 * Handles X-Forwarded-For, X-Real-IP, etc.
 */
export function extractRealIP(request: Request): string | null {
  // Check various headers in order of preference
  const headers = [
    'x-forwarded-for',    // Standard proxy header
    'x-real-ip',          // Nginx
    'cf-connecting-ip',   // Cloudflare
    'x-client-ip',        // Some proxies
    'x-cluster-client-ip' // Some load balancers
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // X-Forwarded-For can contain multiple IPs, get the first one
      return value.split(',')[0].trim();
    }
  }

  // Fallback to remote address (not available in Edge runtime)
  return null;
}