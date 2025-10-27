// lib/utils/referral-code.ts

/**
 * Generate unique referral code in format: FIRSTNAME-ABC123
 * Example: MIKE-A2X9K7
 */
export function generateReferralCode(name: string): string {
  // Extract first name (everything before space or @)
  const firstName = name
    .split(/[\s@]/)[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 10);
  
  // Generate random alphanumeric suffix
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars
  const suffix = Array.from({ length: 6 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  
  return `${firstName || 'USER'}-${suffix}`;
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
  return /^[A-Z]+-[A-Z0-9]{6}$/.test(code);
}
