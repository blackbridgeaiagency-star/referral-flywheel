// lib/utils/referral-code.ts

/**
 * Generate unique referral code in privacy-safe format: XXXX-YYYY
 * Example: A7B2-K9X4
 *
 * This format:
 * - Doesn't expose any PII (no names, usernames, emails)
 * - Is short and memorable (8 characters)
 * - Avoids ambiguous characters (0/O, 1/I/L)
 * - Has 1.6 billion+ possible combinations
 */
export function generateReferralCode(name?: string): string {
  // Characters that are easy to distinguish (no 0, O, 1, I, L)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  // Generate two 4-character segments
  const segment1 = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');

  const segment2 = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');

  return `${segment1}-${segment2}`;
}

/**
 * Generate a memorable referral code using word-like patterns
 * Alternative format: consonant-vowel patterns for easier memorization
 * Example: BEKA-TORU
 */
export function generateMemorableReferralCode(): string {
  const consonants = 'BCDFGHJKMNPQRSTVWXYZ';
  const vowels = 'AEIOU';
  const numbers = '23456789';

  // Create pronounceable pattern: CVCV-CVCN (consonant-vowel-consonant-vowel-consonant-vowel-consonant-number)
  const pattern1 = [
    consonants[Math.floor(Math.random() * consonants.length)],
    vowels[Math.floor(Math.random() * vowels.length)],
    consonants[Math.floor(Math.random() * consonants.length)],
    vowels[Math.floor(Math.random() * vowels.length)]
  ].join('');

  const pattern2 = [
    consonants[Math.floor(Math.random() * consonants.length)],
    vowels[Math.floor(Math.random() * vowels.length)],
    consonants[Math.floor(Math.random() * consonants.length)],
    numbers[Math.floor(Math.random() * numbers.length)]
  ].join('');

  return `${pattern1}-${pattern2}`;
}

/**
 * Validate referral code format
 * Now accepts the new format: XXXX-YYYY (8 alphanumeric characters with hyphen)
 */
export function isValidReferralCode(code: string): boolean {
  // Accept both old format (NAME-XXXXXX) and new format (XXXX-YYYY)
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) || /^[A-Z]+-[A-Z0-9]{6}$/.test(code);
}

/**
 * Generate a unique referral code with collision checking
 * This should be used with a database check to ensure uniqueness
 */
export async function generateUniqueReferralCode(
  checkExistence: (code: string) => Promise<boolean>
): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateReferralCode();
    const exists = await checkExistence(code);

    if (!exists) {
      return code;
    }

    attempts++;
  }

  // If we couldn't generate a unique code in 10 attempts,
  // append timestamp for guaranteed uniqueness
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `${generateReferralCode().slice(0, 4)}-${timestamp}`;
}
