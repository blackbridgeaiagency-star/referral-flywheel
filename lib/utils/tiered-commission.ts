// lib/utils/tiered-commission.ts

/**
 * Tiered Commission Calculator
 *
 * BUSINESS RULES (IMMUTABLE):
 * - Creator ALWAYS gets 70% (this never changes)
 * - Platform gives up part of its 20% to reward top performers
 * - Higher tiers = higher member commission, lower platform commission
 * - Tier upgrades require PAID referrals (1 full billing cycle)
 *
 * TIER STRUCTURE:
 * - Starter (0-49): 10% affiliate | 20% platform | 70% creator
 * - Ambassador (50+): 15% affiliate | 15% platform | 70% creator
 * - Elite (100+): 18% affiliate | 12% platform | 70% creator
 *
 * Creator manually upgrades affiliate rate in Whop when notified.
 * Platform fee is reduced to compensate for higher affiliate payout.
 */

export type CommissionTierName = 'starter' | 'ambassador' | 'elite';

export interface CommissionTierConfig {
  tierName: CommissionTierName;
  minReferrals: number;           // Minimum PAID referrals (1+ billing cycle)
  memberRate: number;              // What member earns (increases with tier)
  platformRate: number;            // What platform keeps (decreases with tier)
  creatorRate: number;             // ALWAYS 0.70 (70%)
  requiresPaidReferrals: boolean;  // Whether referrals must have paid 1+ month
}

// ========================================
// TIER CONFIGURATION (Source of Truth)
// ========================================
export const COMMISSION_TIERS: CommissionTierConfig[] = [
  {
    tierName: 'starter',
    minReferrals: 0,
    memberRate: 0.10,              // 10%
    platformRate: 0.20,            // 20%
    creatorRate: 0.70,             // 70%
    requiresPaidReferrals: false,
  },
  {
    tierName: 'ambassador',
    minReferrals: 50,
    memberRate: 0.15,              // 15% (+5%)
    platformRate: 0.15,            // 15% (-5%)
    creatorRate: 0.70,             // 70%
    requiresPaidReferrals: true,   // Must be 50 PAID referrals
  },
  {
    tierName: 'elite',
    minReferrals: 100,
    memberRate: 0.18,              // 18% (+8%)
    platformRate: 0.12,            // 12% (-8%)
    creatorRate: 0.70,             // 70%
    requiresPaidReferrals: true,   // Must be 100 PAID referrals
  },
];

// ========================================
// TIER LOOKUP FUNCTIONS
// ========================================

/**
 * Get commission tier based on total referral count
 * Returns the highest tier the member qualifies for
 */
export function getCommissionTier(totalReferrals: number): CommissionTierConfig {
  // Sort descending by minReferrals to find highest qualifying tier
  const sortedTiers = [...COMMISSION_TIERS].sort(
    (a, b) => b.minReferrals - a.minReferrals
  );

  for (const tier of sortedTiers) {
    if (totalReferrals >= tier.minReferrals) {
      return tier;
    }
  }

  // Default to bronze (should never reach here since bronze minReferrals is 0)
  return COMMISSION_TIERS[0];
}

/**
 * Get tier by name
 */
export function getTierByName(tierName: CommissionTierName): CommissionTierConfig {
  return COMMISSION_TIERS.find(t => t.tierName === tierName) || COMMISSION_TIERS[0];
}

/**
 * Get next tier info for progress display
 */
export function getNextTierInfo(totalReferrals: number): {
  currentTier: CommissionTierConfig;
  nextTier: CommissionTierConfig | null;
  referralsToNextTier: number;
  progressPercent: number;
} {
  const currentTier = getCommissionTier(totalReferrals);
  const currentIndex = COMMISSION_TIERS.findIndex(
    t => t.tierName === currentTier.tierName
  );

  const nextTier = COMMISSION_TIERS[currentIndex + 1] || null;

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      referralsToNextTier: 0,
      progressPercent: 100,
    };
  }

  const referralsToNextTier = nextTier.minReferrals - totalReferrals;
  const rangeSize = nextTier.minReferrals - currentTier.minReferrals;
  const progressInRange = totalReferrals - currentTier.minReferrals;
  const progressPercent = Math.round((progressInRange / rangeSize) * 100);

  return {
    currentTier,
    nextTier,
    referralsToNextTier,
    progressPercent: Math.max(0, Math.min(100, progressPercent)),
  };
}

// ========================================
// COMMISSION CALCULATION
// ========================================

export interface TieredCommissionResult {
  saleAmount: number;
  memberShare: number;
  creatorShare: number;
  platformShare: number;
  appliedTier: CommissionTierName;
  appliedMemberRate: number;
  appliedPlatformRate: number;
  appliedCreatorRate: number;
  total: number;
}

/**
 * Calculate commission with tiered rates
 *
 * @param saleAmount - Total sale amount
 * @param memberReferralCount - Total referrals by the REFERRER (determines their tier)
 * @returns Commission split with tier info
 */
export function calculateTieredCommission(
  saleAmount: number,
  memberReferralCount: number
): TieredCommissionResult {
  // Input validation
  if (saleAmount < 0) {
    throw new Error('Sale amount cannot be negative');
  }
  if (saleAmount > 1000000) {
    throw new Error('Sale amount exceeds maximum allowed ($1,000,000)');
  }
  if (!Number.isFinite(saleAmount)) {
    throw new Error('Sale amount must be a valid number');
  }

  // Get tier based on referrer's total referrals
  const tier = getCommissionTier(memberReferralCount);

  // Calculate shares
  const memberShare = Number((saleAmount * tier.memberRate).toFixed(2));
  const creatorShare = Number((saleAmount * tier.creatorRate).toFixed(2));
  const platformShare = Number((saleAmount * tier.platformRate).toFixed(2));

  // Ensure no cents are lost due to rounding
  const total = memberShare + creatorShare + platformShare;
  const diff = Number((saleAmount - total).toFixed(2));

  // Adjust platform share for any rounding difference (platform absorbs rounding)
  const adjustedPlatformShare = Number((platformShare + diff).toFixed(2));

  return {
    saleAmount,
    memberShare,
    creatorShare,
    platformShare: adjustedPlatformShare,
    appliedTier: tier.tierName,
    appliedMemberRate: tier.memberRate,
    appliedPlatformRate: tier.platformRate,
    appliedCreatorRate: tier.creatorRate,
    total: memberShare + creatorShare + adjustedPlatformShare,
  };
}

// ========================================
// TIER UPGRADE DETECTION
// ========================================

/**
 * Check if member should be upgraded to a new tier
 * Returns upgrade info if applicable
 */
export function checkTierUpgrade(
  currentTierName: CommissionTierName,
  totalReferrals: number
): {
  shouldUpgrade: boolean;
  newTier: CommissionTierConfig | null;
  rateIncrease: number;
} {
  const newTierConfig = getCommissionTier(totalReferrals);

  if (newTierConfig.tierName === currentTierName) {
    return {
      shouldUpgrade: false,
      newTier: null,
      rateIncrease: 0,
    };
  }

  const currentTierConfig = COMMISSION_TIERS.find(t => t.tierName === currentTierName);
  const rateIncrease = newTierConfig.memberRate - (currentTierConfig?.memberRate || 0.10);

  return {
    shouldUpgrade: true,
    newTier: newTierConfig,
    rateIncrease,
  };
}

// ========================================
// DISPLAY UTILITIES
// ========================================

export const TIER_DISPLAY = {
  starter: {
    name: 'Starter',
    icon: '🚀',
    color: 'blue',
    bgClass: 'bg-blue-500/20',
    textClass: 'text-blue-300',
    borderClass: 'border-blue-500',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-400',
    description: 'Starting your referral journey',
  },
  ambassador: {
    name: 'Ambassador',
    icon: '⭐',
    color: 'yellow',
    bgClass: 'bg-yellow-500/20',
    textClass: 'text-yellow-300',
    borderClass: 'border-yellow-500',
    gradientFrom: 'from-yellow-600',
    gradientTo: 'to-yellow-400',
    description: 'Proven performer with 50+ paid referrals',
  },
  elite: {
    name: 'Elite',
    icon: '👑',
    color: 'purple',
    bgClass: 'bg-purple-500/20',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-500',
    gradientFrom: 'from-purple-600',
    gradientTo: 'to-purple-400',
    description: 'Top performer with 100+ paid referrals',
  },
} as const;

/**
 * Format rate as percentage for display
 */
export function formatRateAsPercent(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/**
 * Get tier benefits description
 */
export function getTierBenefits(tierName: CommissionTierName): string[] {
  const benefits: Record<CommissionTierName, string[]> = {
    starter: [
      '10% commission on all referrals',
      'Lifetime recurring earnings',
      'Access to leaderboards',
      'Unique referral link',
    ],
    ambassador: [
      '15% commission (+5% boost)',
      'Lifetime recurring earnings',
      'Featured in top performers',
      'Ambassador badge on profile',
      'Priority support',
    ],
    elite: [
      '18% commission (+8% boost)',
      'Maximum earning potential',
      'Top performer spotlight',
      'Elite badge on profile',
      'VIP status & exclusive rewards',
      'Direct creator access',
    ],
  };

  return benefits[tierName];
}

/**
 * Get requirements to reach a tier
 */
export function getTierRequirements(tierName: CommissionTierName): {
  referrals: number;
  mustBePaid: boolean;
  description: string;
} {
  const requirements: Record<CommissionTierName, { referrals: number; mustBePaid: boolean; description: string }> = {
    starter: {
      referrals: 0,
      mustBePaid: false,
      description: 'Everyone starts here',
    },
    ambassador: {
      referrals: 50,
      mustBePaid: true,
      description: '50 referrals who paid for 1+ billing cycle',
    },
    elite: {
      referrals: 100,
      mustBePaid: true,
      description: '100 referrals who paid for 1+ billing cycle',
    },
  };

  return requirements[tierName];
}
