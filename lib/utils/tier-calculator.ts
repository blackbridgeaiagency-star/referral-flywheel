/**
 * Tier Calculator Utility
 *
 * Provides consistent tier calculation across the entire application.
 * Tiers are based on total referral count and creator-defined thresholds.
 *
 * Tier Ranges:
 * - Bronze: 0 to tier2Count (default: 0-10)
 * - Silver: tier2Count to tier3Count (default: 10-25)
 * - Gold: tier3Count to tier4Count (default: 25-100)
 * - Platinum: tier4Count+ (default: 100+)
 */

export type MemberTier = 'Unranked' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface TierThresholds {
  tier1Count: number; // Bronze threshold (not really used for calculation)
  tier2Count: number; // Silver threshold
  tier3Count: number; // Gold threshold
  tier4Count: number; // Platinum threshold
}

/**
 * Calculate member tier based on total referrals and creator thresholds
 *
 * @param totalReferred - Number of successful referrals made by the member
 * @param thresholds - Creator's tier threshold configuration
 * @returns The appropriate tier name
 *
 * @example
 * calculateMemberTier(176, { tier1Count: 5, tier2Count: 10, tier3Count: 25, tier4Count: 100 })
 * // Returns: 'Platinum' (176 >= 100)
 *
 * Tier Ranges (using example: tier1=3, tier2=5, tier3=10, tier4=25):
 * - Unranked: 0-2 (below tier1Count)
 * - Bronze: 3-4 (tier1Count to tier2Count-1)
 * - Silver: 5-9 (tier2Count to tier3Count-1)
 * - Gold: 10-24 (tier3Count to tier4Count-1)
 * - Platinum: 25+ (tier4Count+)
 */
export function calculateMemberTier(
  totalReferred: number,
  thresholds: TierThresholds
): MemberTier {
  // Platinum: At or above tier4Count threshold
  if (totalReferred >= thresholds.tier4Count) {
    return 'Platinum';
  }

  // Gold: At tier3Count but below tier4Count
  if (totalReferred >= thresholds.tier3Count) {
    return 'Gold';
  }

  // Silver: At tier2Count but below tier3Count
  if (totalReferred >= thresholds.tier2Count) {
    return 'Silver';
  }

  // Bronze: At tier1Count but below tier2Count
  if (totalReferred >= thresholds.tier1Count) {
    return 'Bronze';
  }

  // Unranked: Below tier1Count
  return 'Unranked';
}

/**
 * Get tier color for UI display
 * Returns Tailwind-compatible color classes
 */
export function getTierColor(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'platinum':
    case 'diamond': // Support legacy naming
      return 'bg-purple-500/20 text-purple-300';
    case 'gold':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'silver':
      return 'bg-gray-400/20 text-gray-300';
    case 'bronze':
      return 'bg-amber-700/20 text-amber-300';
    case 'unranked':
    default:
      return 'bg-gray-600/20 text-gray-400';
  }
}

/**
 * Get tier emoji icon
 */
export function getTierEmoji(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'platinum':
      return '💎';
    case 'gold':
      return '🥇';
    case 'silver':
      return '🥈';
    case 'bronze':
      return '🥉';
    case 'unranked':
    default:
      return '❓';
  }
}

/**
 * Get next tier and referrals needed
 * Useful for progress displays
 */
export function getNextTierInfo(
  totalReferred: number,
  thresholds: TierThresholds
): {
  currentTier: MemberTier;
  nextTier: MemberTier | null;
  referralsNeeded: number;
} {
  const currentTier = calculateMemberTier(totalReferred, thresholds);

  if (totalReferred >= thresholds.tier4Count) {
    // Already at max tier
    return {
      currentTier,
      nextTier: null,
      referralsNeeded: 0,
    };
  }

  if (totalReferred >= thresholds.tier3Count) {
    // Gold → Platinum
    return {
      currentTier,
      nextTier: 'Platinum',
      referralsNeeded: thresholds.tier4Count - totalReferred,
    };
  }

  if (totalReferred >= thresholds.tier2Count) {
    // Silver → Gold
    return {
      currentTier,
      nextTier: 'Gold',
      referralsNeeded: thresholds.tier3Count - totalReferred,
    };
  }

  if (totalReferred >= thresholds.tier1Count) {
    // Bronze → Silver
    return {
      currentTier,
      nextTier: 'Silver',
      referralsNeeded: thresholds.tier2Count - totalReferred,
    };
  }

  // Unranked → Bronze
  return {
    currentTier,
    nextTier: 'Bronze',
    referralsNeeded: thresholds.tier1Count - totalReferred,
  };
}
