/**
 * ========================================
 * ATTRIBUTION WINDOW CONSTANTS
 * SINGLE SOURCE OF TRUTH
 * ========================================
 *
 * ALL attribution-related constants MUST be defined here.
 * The 30-day window is a CRITICAL business rule.
 */

// ========================================
// ATTRIBUTION WINDOW
// ========================================

/** Attribution window in days */
export const ATTRIBUTION_WINDOW_DAYS = 30;

/** Attribution window in milliseconds (for Date math) */
export const ATTRIBUTION_WINDOW_MS = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Attribution window in hours */
export const ATTRIBUTION_WINDOW_HOURS = ATTRIBUTION_WINDOW_DAYS * 24;

/** Attribution window in seconds */
export const ATTRIBUTION_WINDOW_SECONDS = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60;

// ========================================
// COOKIE SETTINGS
// ========================================

/** Cookie expiry (same as attribution window) */
export const COOKIE_EXPIRY_DAYS = ATTRIBUTION_WINDOW_DAYS;

/** Cookie name for referral tracking */
export const REFERRAL_COOKIE_NAME = 'ref_code';

/** Cookie name for fingerprint */
export const FINGERPRINT_COOKIE_NAME = 'fp_hash';

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate expiry date from now
 * @returns Date when attribution expires
 */
export function getAttributionExpiryDate(fromDate: Date = new Date()): Date {
  return new Date(fromDate.getTime() + ATTRIBUTION_WINDOW_MS);
}

/**
 * Check if an attribution click is still valid
 * @param clickDate - When the click occurred
 * @returns true if within attribution window
 */
export function isAttributionValid(clickDate: Date): boolean {
  const now = new Date();
  const expiryDate = getAttributionExpiryDate(clickDate);
  return now < expiryDate;
}

/**
 * Get days remaining in attribution window
 * @param clickDate - When the click occurred
 * @returns Number of days remaining (0 if expired)
 */
export function getDaysRemainingInWindow(clickDate: Date): number {
  const now = new Date();
  const expiryDate = getAttributionExpiryDate(clickDate);
  const msRemaining = expiryDate.getTime() - now.getTime();
  if (msRemaining <= 0) return 0;
  return Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
}
