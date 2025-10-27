// lib/utils/fingerprint.ts
import crypto from 'crypto';

/**
 * Generate visitor fingerprint (GDPR-safe, no PII)
 * Combines user agent + IP hash for uniqueness
 */
export function generateFingerprint(request: Request): string {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const data = `${userAgent}|${ip}`;

  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Hash IP address for GDPR compliance
 */
export function hashIP(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip)
    .digest('hex');
}
