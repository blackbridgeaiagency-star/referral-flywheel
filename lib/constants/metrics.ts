/**
 * ========================================
 * METRIC CONSTANTS
 * All hardcoded values centralized here
 * ========================================
 *
 * NO MAGIC NUMBERS allowed in the codebase!
 * All constants must be defined here.
 */

// ========================================
// COMMISSION RATES (NEVER CHANGE!)
// ========================================

/**
 * Commission split rates
 * CRITICAL: These are business rules and should NEVER be modified
 */
export const COMMISSION_RATES = {
  MEMBER: 0.10,     // 10% to referring member
  CREATOR: 0.70,    // 70% to creator
  PLATFORM: 0.20,   // 20% to platform
} as const;

// Validate rates sum to 100%
const totalRate = COMMISSION_RATES.MEMBER + COMMISSION_RATES.CREATOR + COMMISSION_RATES.PLATFORM;
if (totalRate !== 1.0) {
  throw new Error(`Commission rates must sum to 100%, got ${totalRate * 100}%`);
}

// ========================================
// TIME WINDOWS
// ========================================

export const TIME_WINDOWS = {
  ATTRIBUTION_WINDOW_DAYS: 30,
  DEFAULT_CHART_DAYS: 30,
  COOKIE_EXPIRY_DAYS: 30,
} as const;

// ========================================
// DISPLAY FORMATS
// ========================================

export const DISPLAY_FORMATS = {
  CURRENCY_DECIMALS: 2,
  PERCENTAGE_DECIMALS: 1,
  DEFAULT_LOCALE: 'en-US',
  DEFAULT_CURRENCY: 'USD',
} as const;

// ========================================
// EARNINGS POTENTIAL ASSUMPTIONS
// ========================================

/**
 * Assumptions for "potential earnings" calculations
 * These are ESTIMATES, not guarantees
 */
export const EARNINGS_ASSUMPTIONS = {
  // Average subscription price for estimates
  // NOTE: This is an ASSUMPTION and may not reflect actual prices
  ESTIMATED_AVG_SUBSCRIPTION: 49.99,

  // Retention assumption (what % of referrals stay subscribed)
  // NOTE: This is optimistic - actual may be lower
  ASSUMED_RETENTION_RATE: 1.0, // 100% (overly optimistic)

  // Member commission rate for calculations
  MEMBER_COMMISSION_RATE: COMMISSION_RATES.MEMBER,
} as const;

// ========================================
// PAGINATION & LIMITS
// ========================================

export const QUERY_LIMITS = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  TOP_PERFORMERS_LIMIT: 10,
  RECENT_REFERRALS_LIMIT: 10,
  LEADERBOARD_LIMIT: 100,
} as const;

// ========================================
// DEFAULT VALUES
// ========================================

export const DEFAULTS = {
  SUBSCRIPTION_PRICE: 0, // Default if not set
  MEMBER_TIER: 0,        // Default tier
  RANK: null,            // No rank if not calculated
} as const;

// ========================================
// VALIDATION RULES
// ========================================

export const VALIDATION = {
  MIN_SUBSCRIPTION_PRICE: 0.01,
  MAX_SUBSCRIPTION_PRICE: 999999.99,
  MIN_COMMISSION: 0,
  MAX_COMMISSION: 999999.99,
  REFERRAL_CODE_LENGTH: 6,
} as const;

// ========================================
// TIER THRESHOLDS
// ========================================

/**
 * Default tier thresholds (can be overridden by creator)
 */
export const DEFAULT_TIERS = {
  TIER_1: { count: 5, reward: '1 month free' },
  TIER_2: { count: 10, reward: '3 months free' },
  TIER_3: { count: 25, reward: '6 months free' },
  TIER_4: { count: 50, reward: 'Lifetime access' },
} as const;

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate potential monthly earnings
 * Uses centralized constants
 */
export function calculatePotentialEarnings(referralCount: number): number {
  const {
    ESTIMATED_AVG_SUBSCRIPTION,
    ASSUMED_RETENTION_RATE,
    MEMBER_COMMISSION_RATE,
  } = EARNINGS_ASSUMPTIONS;

  return Math.round(
    referralCount *
    ESTIMATED_AVG_SUBSCRIPTION *
    ASSUMED_RETENTION_RATE *
    MEMBER_COMMISSION_RATE
  );
}

/**
 * Format currency consistently
 *
 * NOTE: This is the SINGLE SOURCE OF TRUTH for currency formatting.
 * The duplicate in lib/utils/commission.ts re-exports this function.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(DISPLAY_FORMATS.DEFAULT_LOCALE, {
    style: 'currency',
    currency: DISPLAY_FORMATS.DEFAULT_CURRENCY,
    minimumFractionDigits: DISPLAY_FORMATS.CURRENCY_DECIMALS,
    maximumFractionDigits: DISPLAY_FORMATS.CURRENCY_DECIMALS,
  }).format(amount);
}

/**
 * Format percentage consistently
 */
export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(DISPLAY_FORMATS.PERCENTAGE_DECIMALS)}%`;
}

/**
 * Validate commission split
 * Ensures 10/70/20 split is enforced
 */
export function validateCommissionSplit(
  saleAmount: number,
  memberShare: number,
  creatorShare: number,
  platformShare: number
): boolean {
  const expectedMember = saleAmount * COMMISSION_RATES.MEMBER;
  const expectedCreator = saleAmount * COMMISSION_RATES.CREATOR;
  const expectedPlatform = saleAmount * COMMISSION_RATES.PLATFORM;

  const tolerance = 0.01; // Allow 1 cent rounding error

  return (
    Math.abs(memberShare - expectedMember) < tolerance &&
    Math.abs(creatorShare - expectedCreator) < tolerance &&
    Math.abs(platformShare - expectedPlatform) < tolerance &&
    Math.abs(memberShare + creatorShare + platformShare - saleAmount) < tolerance
  );
}
