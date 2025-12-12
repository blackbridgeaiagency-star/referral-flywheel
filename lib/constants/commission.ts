/**
 * ========================================
 * COMMISSION RATE CONSTANTS
 * SINGLE SOURCE OF TRUTH
 * ========================================
 *
 * ALL commission rates and tier thresholds MUST be defined here.
 * NO magic numbers allowed in the codebase!
 *
 * BUSINESS MODEL:
 * - Creator ALWAYS gets 70% (immutable)
 * - Platform gives up part of its 20% to reward top performers
 * - Higher tiers = higher member commission, lower platform commission
 */

// ========================================
// BASE COMMISSION RATES (Starter Tier)
// CRITICAL: These are business rules
// ========================================

export const BASE_RATES = {
  /** 10% to referring member (lifetime recurring) */
  MEMBER: 0.10,
  /** 70% to creator (NEVER CHANGES) */
  CREATOR: 0.70,
  /** 20% to platform */
  PLATFORM: 0.20,
} as const;

// Validate rates sum to 100%
const baseTotal = BASE_RATES.MEMBER + BASE_RATES.CREATOR + BASE_RATES.PLATFORM;
if (Math.abs(baseTotal - 1.0) > 0.001) {
  throw new Error(`Base commission rates must sum to 100%, got ${baseTotal * 100}%`);
}

// ========================================
// TIERED COMMISSION RATES
// Higher tiers = higher member cut, lower platform cut
// Creator ALWAYS gets 70%
// ========================================

export const COMMISSION_RATES = {
  /** Starter tier (0-49 referrals): Standard rates */
  STARTER: {
    member: 0.10,
    creator: 0.70,
    platform: 0.20,
  },
  /** Ambassador tier (50-99 referrals): +5% to member, -5% from platform */
  AMBASSADOR: {
    member: 0.15,
    creator: 0.70,
    platform: 0.15,
  },
  /** Elite tier (100+ referrals): +8% to member, -8% from platform */
  ELITE: {
    member: 0.18,
    creator: 0.70,
    platform: 0.12,
  },
} as const;

// Validate all tier rates sum to 100%
Object.entries(COMMISSION_RATES).forEach(([tierName, rates]) => {
  const total = rates.member + rates.creator + rates.platform;
  if (Math.abs(total - 1.0) > 0.001) {
    throw new Error(`${tierName} commission rates must sum to 100%, got ${total * 100}%`);
  }
  if (rates.creator !== BASE_RATES.CREATOR) {
    throw new Error(`${tierName} creator rate must be ${BASE_RATES.CREATOR * 100}%, got ${rates.creator * 100}%`);
  }
});

// ========================================
// TIER THRESHOLDS (Default Values)
// These can be overridden per-creator in the database
// ========================================

export const DEFAULT_TIER_THRESHOLDS = {
  /** Minimum PAID referrals to reach Ambassador tier */
  AMBASSADOR_MIN_REFERRALS: 50,
  /** Minimum PAID referrals to reach Elite tier */
  ELITE_MIN_REFERRALS: 100,
} as const;

// ========================================
// COMMISSION LIMITS & VALIDATION
// ========================================

export const COMMISSION_LIMITS = {
  /** Minimum sale amount allowed */
  MIN_SALE_AMOUNT: 0.01,
  /** Maximum sale amount allowed (safety limit) */
  MAX_SALE_AMOUNT: 1_000_000,
  /** Minimum commission payout */
  MIN_COMMISSION: 0,
  /** Maximum commission payout (safety limit) */
  MAX_COMMISSION: 999_999.99,
  /** Allowed rounding tolerance for validation */
  ROUNDING_TOLERANCE: 0.01,
} as const;

// ========================================
// CUSTOM COMMISSION RATE LIMITS
// For VIP affiliates set by creators
// ========================================

export const CUSTOM_RATE_LIMITS = {
  /** Minimum custom rate a creator can set */
  MIN_RATE: 0.10,
  /** Maximum custom rate a creator can set */
  MAX_RATE: 0.25,
} as const;

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get commission rates for a specific tier
 */
export function getRatesForTier(tierName: 'starter' | 'ambassador' | 'elite') {
  const mapping = {
    starter: COMMISSION_RATES.STARTER,
    ambassador: COMMISSION_RATES.AMBASSADOR,
    elite: COMMISSION_RATES.ELITE,
  };
  return mapping[tierName];
}

/**
 * Validate that a custom rate is within allowed bounds
 */
export function isValidCustomRate(rate: number): boolean {
  return rate >= CUSTOM_RATE_LIMITS.MIN_RATE && rate <= CUSTOM_RATE_LIMITS.MAX_RATE;
}

/**
 * Calculate the platform rate given a custom member rate
 * Creator always gets 70%, so platform = 1 - creator - member
 */
export function calculatePlatformRate(memberRate: number): number {
  return 1 - BASE_RATES.CREATOR - memberRate;
}
