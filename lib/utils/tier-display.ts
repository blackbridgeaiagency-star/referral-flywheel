/**
 * Tier Display Utilities
 *
 * SSOT for tier display names and formatting.
 *
 * This file provides a CLEAR SEPARATION between:
 * 1. Commission Tiers (starter/ambassador/elite) - affects EARNINGS RATE
 * 2. Reward Tiers (unranked/bronze/silver/gold/platinum) - affects GAMIFICATION
 *
 * These are TWO DIFFERENT SYSTEMS:
 * - Commission Tiers: Based on PAID referrals, affects commission % (10% -> 15% -> 18%)
 * - Reward Tiers: Creator-customizable milestones for claiming rewards
 */

import { CommissionTierName, TIER_DISPLAY } from './tiered-commission';
import type { MemberTier } from './tier-calculator';

// ========================================
// TYPE DEFINITIONS
// ========================================

export type CommissionLevel = CommissionTierName;
export type RewardTier = MemberTier;

// ========================================
// COMMISSION TIER DISPLAY (Earnings Rate)
// ========================================

/**
 * Get display string for commission tier
 * Shows tier name with commission rate
 */
export function getCommissionLevelDisplay(level: CommissionLevel): string {
  const displays: Record<CommissionLevel, string> = {
    starter: 'Starter (10%)',
    ambassador: 'Ambassador (15%)',
    elite: 'Elite (18%)',
  };
  return displays[level];
}

/**
 * Get commission tier display info from tiered-commission.ts
 * Re-exports the TIER_DISPLAY constant for convenience
 */
export function getCommissionTierDisplay(tierName: CommissionLevel) {
  return TIER_DISPLAY[tierName];
}

/**
 * Get commission rate as formatted percentage string
 */
export function getCommissionRateDisplay(level: CommissionLevel): string {
  const rates: Record<CommissionLevel, string> = {
    starter: '10%',
    ambassador: '15%',
    elite: '18%',
  };
  return rates[level];
}

// ========================================
// REWARD TIER DISPLAY (Gamification)
// ========================================

/**
 * Get display string for reward tier
 * Used for gamification/milestones UI
 */
export function getRewardTierDisplay(tier: RewardTier): string {
  const displays: Record<RewardTier, string> = {
    Unranked: 'Unranked',
    Bronze: 'Bronze',
    Silver: 'Silver',
    Gold: 'Gold',
    Platinum: 'Platinum',
  };
  return displays[tier];
}

/**
 * Get reward tier color classes (Tailwind)
 */
export function getRewardTierColors(tier: RewardTier): {
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  const colors: Record<RewardTier, { bgClass: string; textClass: string; borderClass: string }> = {
    Unranked: {
      bgClass: 'bg-gray-600/20',
      textClass: 'text-gray-400',
      borderClass: 'border-gray-600',
    },
    Bronze: {
      bgClass: 'bg-amber-700/20',
      textClass: 'text-amber-300',
      borderClass: 'border-amber-700',
    },
    Silver: {
      bgClass: 'bg-gray-400/20',
      textClass: 'text-gray-300',
      borderClass: 'border-gray-400',
    },
    Gold: {
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-300',
      borderClass: 'border-yellow-500',
    },
    Platinum: {
      bgClass: 'bg-purple-500/20',
      textClass: 'text-purple-300',
      borderClass: 'border-purple-500',
    },
  };
  return colors[tier];
}

/**
 * Get reward tier emoji
 */
export function getRewardTierEmoji(tier: RewardTier): string {
  const emojis: Record<RewardTier, string> = {
    Unranked: '',
    Bronze: '',
    Silver: '',
    Gold: '',
    Platinum: '',
  };
  return emojis[tier];
}

// ========================================
// TIER COMPARISON HELPERS
// ========================================

/**
 * Map commission tier to equivalent reward tier for display
 * Used when you need to show commission tier in reward tier styling
 *
 * IMPORTANT: These are DIFFERENT systems! This is just for UI consistency.
 */
export function mapCommissionToRewardTier(commissionTier: CommissionLevel): RewardTier {
  const mapping: Record<CommissionLevel, RewardTier> = {
    starter: 'Bronze',
    ambassador: 'Gold',
    elite: 'Platinum',
  };
  return mapping[commissionTier];
}

/**
 * Check if two tier systems are "aligned"
 * Useful for progress indicators
 */
export function areTiersAligned(
  commissionTier: CommissionLevel,
  rewardTier: RewardTier
): boolean {
  const expectedRewardTier = mapCommissionToRewardTier(commissionTier);
  return expectedRewardTier === rewardTier;
}
