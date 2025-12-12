// lib/utils/custom-commission.ts
/**
 * Custom Commission Rate Management
 *
 * Allows creators to set custom commission rates for specific affiliates,
 * overriding the tier-based rates when desired.
 *
 * BUSINESS RULES:
 * - Custom rates can range from 10% to 25%
 * - Custom rates override tier-based rates when set
 * - Creator rate (70%) is ALWAYS preserved
 * - Platform absorbs the difference when custom rate > tier rate
 * - Requires Prisma schema changes (documented below)
 */

import { prisma } from '../db/prisma';
import { getCommissionTier, type CommissionTierConfig } from './tiered-commission';
import logger from '../logger';
import { sendCustomRateDM } from '../whop/graphql-messaging';
import { notifyCustomRateSet } from '../whop/notifications';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface EffectiveCommissionRate {
  rate: number;                    // The actual rate to use (0.10 - 0.25)
  source: 'custom' | 'tier';       // Where the rate came from
  tierName?: string;               // Tier name if source is 'tier'
  customReason?: string;           // Reason if source is 'custom'
}

export interface CustomRateInput {
  memberId: string;
  rate: number;                    // 0.10 to 0.25
  creatorId: string;
  reason?: string;
}

export interface CustomRateHistoryEntry {
  memberId: string;
  previousRate: number | null;
  newRate: number;
  setBy: string;
  setAt: Date;
  reason?: string;
}

// ========================================
// CONSTANTS
// ========================================

/**
 * CRITICAL BUSINESS RULES (NEVER MODIFY):
 *
 * 1. Platform ALWAYS gets 20% (never changes for custom rates)
 * 2. Custom rates come FROM the creator's 70%, NOT the platform's 20%
 * 3. Only tier upgrades (Starter→Ambassador→Elite) reduce platform's 20%
 * 4. Creator absorbs the cost of offering higher affiliate rates
 *
 * Example with 20% custom rate on $100 sale:
 * - Member: $20 (20% custom rate)
 * - Platform: $20 (ALWAYS 20%)
 * - Creator: $60 (70% - 10% extra given to member = 60%)
 *
 * This protects platform revenue while giving creators flexibility
 * to reward VIP affiliates from their own share.
 */
export const CUSTOM_RATE_LIMITS = {
  MIN_RATE: 0.10,   // 10% minimum (base tier rate)
  MAX_RATE: 0.30,   // 30% maximum (creator can give up to 30% from their 70%)
  BASE_RATE: 0.10,  // Standard tier rate (Starter)
  CREATOR_BASE: 0.70, // Creator's base share before custom deductions
  PLATFORM_RATE: 0.20, // Platform ALWAYS gets 20% (immutable for custom rates)
};

// ========================================
// CORE FUNCTIONS
// ========================================

/**
 * Get the effective commission rate for a member
 *
 * Priority:
 * 1. Custom rate (if set) - Creator-defined override
 * 2. Tier rate (based on referral count) - Automatic system
 *
 * @param member - Member with totalReferred and optional customCommissionRate
 * @returns EffectiveCommissionRate with rate and source info
 */
export function getEffectiveCommissionRate(member: {
  totalReferred: number;
  customCommissionRate?: number | null;
  customRateReason?: string | null;
}): EffectiveCommissionRate {
  // Check for custom rate first
  if (
    member.customCommissionRate !== null &&
    member.customCommissionRate !== undefined &&
    member.customCommissionRate >= CUSTOM_RATE_LIMITS.MIN_RATE &&
    member.customCommissionRate <= CUSTOM_RATE_LIMITS.MAX_RATE
  ) {
    return {
      rate: member.customCommissionRate,
      source: 'custom',
      customReason: member.customRateReason || undefined,
    };
  }

  // Fall back to tier-based rate
  const tier = getCommissionTier(member.totalReferred);
  return {
    rate: tier.memberRate,
    source: 'tier',
    tierName: tier.tierName,
  };
}

/**
 * Calculate commission splits with custom rate support
 *
 * CRITICAL BUSINESS RULES (ENFORCED):
 * - Platform ALWAYS gets 20% (immutable for custom rates)
 * - Custom rates come FROM creator's 70%, NOT platform's 20%
 * - Only tier upgrades (Starter→Ambassador→Elite) reduce platform's share
 *
 * Example with 20% custom rate on $100 sale:
 * - Member: $20 (20% custom rate)
 * - Platform: $20 (ALWAYS 20% for custom rates)
 * - Creator: $60 (70% base - 10% extra to member = 60%)
 *
 * This incentivizes creators to be thoughtful about custom rates
 * since it comes from their own revenue, not the platform's.
 */
export function calculateCustomCommission(
  saleAmount: number,
  effectiveRate: EffectiveCommissionRate
): {
  memberShare: number;
  creatorShare: number;
  platformShare: number;
  appliedRate: number;
  source: 'custom' | 'tier';
  creatorRateAfterCustom: number; // New: shows what creator actually gets
  extraGivenToMember: number; // New: shows cost to creator
} {
  // Member gets their custom/tier rate
  const memberShare = Number((saleAmount * effectiveRate.rate).toFixed(2));

  // For CUSTOM rates: Platform ALWAYS gets 20%, creator absorbs the difference
  // For TIER rates: Use the tier's platform rate (which may be less than 20%)
  let platformShare: number;
  let creatorShare: number;
  let extraGivenToMember = 0;

  if (effectiveRate.source === 'custom') {
    // CUSTOM RATE: Platform gets full 20%, creator absorbs custom rate cost
    platformShare = Number((saleAmount * CUSTOM_RATE_LIMITS.PLATFORM_RATE).toFixed(2));

    // Creator gets: 70% base - (customRate - baseRate)
    // e.g., if custom rate is 20% and base is 10%, creator gives up 10%
    extraGivenToMember = Math.max(0, effectiveRate.rate - CUSTOM_RATE_LIMITS.BASE_RATE);
    const creatorRate = CUSTOM_RATE_LIMITS.CREATOR_BASE - extraGivenToMember;
    creatorShare = Number((saleAmount * creatorRate).toFixed(2));
  } else {
    // TIER RATE: Use the tier system's rates (platform may get less than 20%)
    // Import tier config to get correct platform rate for this tier
    const tierConfig = getCommissionTier(0); // Will be overridden by actual tier lookup
    // For tier-based, we use the standard split from tiered-commission.ts
    // This function is mainly for custom rate calculations
    // When source is 'tier', we should use calculateTieredCommission instead
    // But for compatibility, we'll calculate based on assumed tier rates
    const tierPlatformRate = 1 - effectiveRate.rate - CUSTOM_RATE_LIMITS.CREATOR_BASE;
    platformShare = Number((saleAmount * Math.max(0.12, tierPlatformRate)).toFixed(2));
    creatorShare = Number((saleAmount * CUSTOM_RATE_LIMITS.CREATOR_BASE).toFixed(2));
  }

  // Handle rounding - any difference goes to platform
  const total = memberShare + creatorShare + platformShare;
  const diff = Number((saleAmount - total).toFixed(2));
  platformShare = Number((platformShare + diff).toFixed(2));

  return {
    memberShare,
    creatorShare,
    platformShare: Math.max(0, platformShare),
    appliedRate: effectiveRate.rate,
    source: effectiveRate.source,
    creatorRateAfterCustom: creatorShare / saleAmount,
    extraGivenToMember,
  };
}

/**
 * Calculate the cost to creator for a custom rate
 * Shows exactly how much the creator gives up from their 70%
 */
export function calculateCreatorCostForCustomRate(
  customRate: number,
  monthlySalesVolume: number = 1000
): {
  customRate: number;
  baseRate: number;
  extraToMember: number;
  creatorShareReduction: number;
  creatorNewRate: number;
  monthlyCreatorCost: number;
  isValid: boolean;
  validationMessage: string;
} {
  const baseRate = CUSTOM_RATE_LIMITS.BASE_RATE;
  const extraToMember = Math.max(0, customRate - baseRate);
  const creatorNewRate = CUSTOM_RATE_LIMITS.CREATOR_BASE - extraToMember;

  // Validate: Creator must keep at least 40% (70% - 30% max custom)
  const minCreatorRate = CUSTOM_RATE_LIMITS.CREATOR_BASE - (CUSTOM_RATE_LIMITS.MAX_RATE - baseRate);
  const isValid = creatorNewRate >= minCreatorRate && customRate <= CUSTOM_RATE_LIMITS.MAX_RATE;

  let validationMessage = '';
  if (!isValid) {
    if (customRate > CUSTOM_RATE_LIMITS.MAX_RATE) {
      validationMessage = `Maximum custom rate is ${CUSTOM_RATE_LIMITS.MAX_RATE * 100}%. Higher rates would reduce creator share below sustainable levels.`;
    } else {
      validationMessage = `This rate is not valid. Creator must retain at least ${minCreatorRate * 100}% share.`;
    }
  }

  return {
    customRate,
    baseRate,
    extraToMember,
    creatorShareReduction: extraToMember,
    creatorNewRate,
    monthlyCreatorCost: monthlySalesVolume * extraToMember,
    isValid,
    validationMessage,
  };
}

/**
 * Set a custom commission rate for a member
 *
 * This allows creators to reward specific high-performing affiliates
 * with higher commission rates than the default tier system provides.
 *
 * IMPORTANT: Custom rates come from the CREATOR's 70%, not the platform's 20%.
 * Platform always keeps 20% on custom rate commissions.
 *
 * After setting the rate, this function sends notifications to the member:
 * 1. GraphQL DM (primary) - A detailed, personalized message
 * 2. Push notification (fallback) - Ensures visibility if DM fails
 *
 * @param input - CustomRateInput with memberId, rate, creatorId, and optional reason
 * @throws Error if rate is outside allowed range or member not found
 */
export async function setCustomCommissionRate(
  input: CustomRateInput
): Promise<{
  success: boolean;
  previousRate: number | null;
  newRate: number;
  creatorCost: {
    extraToMember: number;
    creatorNewRate: number;
  };
  member: {
    id: string;
    username: string;
    referralCode: string;
  };
  notifications: {
    dmSent: boolean;
    pushSent: boolean;
    dmError?: string;
    pushError?: string;
  };
}> {
  const { memberId, rate, creatorId, reason } = input;

  // Validate rate
  if (rate < CUSTOM_RATE_LIMITS.MIN_RATE || rate > CUSTOM_RATE_LIMITS.MAX_RATE) {
    throw new Error(
      `Custom rate must be between ${CUSTOM_RATE_LIMITS.MIN_RATE * 100}% and ${CUSTOM_RATE_LIMITS.MAX_RATE * 100}%`
    );
  }

  // Calculate cost to creator for transparency
  const costAnalysis = calculateCreatorCostForCustomRate(rate);
  if (!costAnalysis.isValid) {
    throw new Error(costAnalysis.validationMessage);
  }

  // Find member and verify they belong to this creator
  // Also fetch creator info for notification personalization
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      userId: true,
      username: true,
      referralCode: true,
      creatorId: true,
      customCommissionRate: true,
      totalReferred: true,
      creator: {
        select: {
          id: true,
          companyId: true,
          companyName: true,
        },
      },
    },
  });

  if (!member) {
    throw new Error('Member not found');
  }

  if (member.creatorId !== creatorId) {
    throw new Error('Member does not belong to this creator');
  }

  const previousRate = member.customCommissionRate;

  // Get the tier rate for comparison in notifications
  const tierInfo = getCommissionTier(member.totalReferred);
  const tierRatePercent = tierInfo.memberRate * 100;
  const newRatePercent = rate * 100;

  // Update member with custom rate
  await prisma.member.update({
    where: { id: memberId },
    data: {
      customCommissionRate: rate,
      customRateSetBy: creatorId,
      customRateSetAt: new Date(),
      customRateReason: reason || null,
    },
  });

  logger.info(`Custom rate set: ${member.username} now earns ${rate * 100}% (was ${previousRate ? previousRate * 100 + '%' : 'tier-based'}). Creator absorbs ${costAnalysis.extraToMember * 100}% extra.`, {
    memberId,
    creatorId,
    previousRate,
    newRate: rate,
    creatorCost: costAnalysis.extraToMember,
    reason,
  });

  // ========================================
  // SEND NOTIFICATIONS TO MEMBER
  // ========================================
  // This is a reward - make the member feel special!
  // Primary: GraphQL DM (detailed, personalized message)
  // Fallback: Push notification (ensures visibility)

  const notifications = {
    dmSent: false,
    pushSent: false,
    dmError: undefined as string | undefined,
    pushError: undefined as string | undefined,
  };

  // 1. Try GraphQL DM first (primary channel)
  try {
    const dmResult = await sendCustomRateDM(
      member.userId,
      member.username,
      member.creator.companyName,
      newRatePercent,
      tierRatePercent,
      reason
    );

    if (dmResult.success) {
      notifications.dmSent = true;
      logger.info(`Custom rate DM sent to ${member.username}`, {
        memberId,
        userId: member.userId,
        newRate: newRatePercent,
      });
    } else {
      notifications.dmError = dmResult.error;
      logger.warn(`Custom rate DM failed for ${member.username}: ${dmResult.error}`, {
        memberId,
        userId: member.userId,
      });
    }
  } catch (error) {
    notifications.dmError = error instanceof Error ? error.message : 'Unknown DM error';
    logger.error(`Custom rate DM error for ${member.username}:`, error);
  }

  // 2. Send push notification as fallback (or additional channel if DM failed)
  // Always send push for important updates like rate changes
  try {
    const pushResult = await notifyCustomRateSet(
      member.creator.companyId,
      member.userId,
      member.creator.companyName,
      newRatePercent,
      tierRatePercent
    );

    if (pushResult.success) {
      notifications.pushSent = true;
      logger.info(`Custom rate push notification sent to ${member.username}`, {
        memberId,
        userId: member.userId,
      });
    } else {
      notifications.pushError = pushResult.error;
      logger.warn(`Custom rate push notification failed for ${member.username}: ${pushResult.error}`, {
        memberId,
        userId: member.userId,
      });
    }
  } catch (error) {
    notifications.pushError = error instanceof Error ? error.message : 'Unknown push error';
    logger.error(`Custom rate push notification error for ${member.username}:`, error);
  }

  // Log notification summary
  if (!notifications.dmSent && !notifications.pushSent) {
    logger.warn(`No notifications sent for custom rate change for ${member.username}. Member may not be aware of their new rate.`, {
      memberId,
      dmError: notifications.dmError,
      pushError: notifications.pushError,
    });
  }

  return {
    success: true,
    previousRate,
    newRate: rate,
    creatorCost: {
      extraToMember: costAnalysis.extraToMember,
      creatorNewRate: costAnalysis.creatorNewRate,
    },
    member: {
      id: member.id,
      username: member.username,
      referralCode: member.referralCode,
    },
    notifications,
  };
}

/**
 * Remove custom commission rate (revert to tier-based)
 *
 * @param memberId - The member to remove custom rate from
 * @param creatorId - The creator performing this action (for verification)
 */
export async function removeCustomCommissionRate(
  memberId: string,
  creatorId: string
): Promise<{
  success: boolean;
  previousRate: number | null;
  newSource: 'tier';
  tierName: string;
  tierRate: number;
}> {
  // Find member and verify ownership
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      username: true,
      creatorId: true,
      customCommissionRate: true,
      totalReferred: true,
    },
  });

  if (!member) {
    throw new Error('Member not found');
  }

  if (member.creatorId !== creatorId) {
    throw new Error('Member does not belong to this creator');
  }

  const previousRate = member.customCommissionRate;
  const tier = getCommissionTier(member.totalReferred);

  // Remove custom rate
  await prisma.member.update({
    where: { id: memberId },
    data: {
      customCommissionRate: null,
      customRateSetBy: null,
      customRateSetAt: null,
      customRateReason: null,
    },
  });

  logger.info(`Custom rate removed: ${member.username} reverted to ${tier.tierName} tier (${tier.memberRate * 100}%)`, {
    memberId,
    creatorId,
    previousRate,
    newTier: tier.tierName,
    newRate: tier.memberRate,
  });

  return {
    success: true,
    previousRate,
    newSource: 'tier',
    tierName: tier.tierName,
    tierRate: tier.memberRate,
  };
}

/**
 * Get all members with custom rates for a creator
 */
export async function getMembersWithCustomRates(creatorId: string): Promise<Array<{
  id: string;
  username: string;
  referralCode: string;
  customRate: number;
  setAt: Date;
  reason: string | null;
  totalReferred: number;
  lifetimeEarnings: number;
}>> {
  const members = await prisma.member.findMany({
    where: {
      creatorId,
      customCommissionRate: { not: null },
    },
    select: {
      id: true,
      username: true,
      referralCode: true,
      customCommissionRate: true,
      customRateSetAt: true,
      customRateReason: true,
      totalReferred: true,
      lifetimeEarnings: true,
    },
    orderBy: {
      customRateSetAt: 'desc',
    },
  });

  return members.map(m => ({
    id: m.id,
    username: m.username,
    referralCode: m.referralCode,
    customRate: m.customCommissionRate!,
    setAt: m.customRateSetAt!,
    reason: m.customRateReason,
    totalReferred: m.totalReferred,
    lifetimeEarnings: m.lifetimeEarnings,
  }));
}

/**
 * Get custom rate comparison for a member
 * Shows what they'd earn with custom vs tier rate AND what it costs the creator
 *
 * IMPORTANT: This shows the TRUE cost to creator, not platform.
 * Custom rates are funded from creator's 70%, platform keeps 20%.
 */
export function getCustomRateComparison(
  totalReferred: number,
  customRate: number,
  monthlySales: number
): {
  tierName: string;
  tierRate: number;
  customRate: number;
  tierEarnings: number;
  customEarnings: number;
  difference: number;
  differencePercent: number;
  // NEW: Show impact on creator's share
  creatorCost: {
    tierCreatorShare: number;      // What creator gets with tier rate
    customCreatorShare: number;    // What creator gets with custom rate
    monthlyCreatorCost: number;    // How much creator gives up monthly
    platformShare: number;         // Platform ALWAYS gets this (20%)
  };
} {
  const tier = getCommissionTier(totalReferred);

  const tierEarnings = monthlySales * tier.memberRate;
  const customEarnings = monthlySales * customRate;
  const difference = customEarnings - tierEarnings;
  const differencePercent = tierEarnings > 0
    ? (difference / tierEarnings) * 100
    : customEarnings > 0 ? 100 : 0;

  // Calculate creator impact
  // With tier rate: Creator gets 70%
  // With custom rate: Creator gets 70% minus the extra given to member
  const extraToMember = Math.max(0, customRate - CUSTOM_RATE_LIMITS.BASE_RATE);
  const tierCreatorShare = monthlySales * CUSTOM_RATE_LIMITS.CREATOR_BASE;
  const customCreatorShare = monthlySales * (CUSTOM_RATE_LIMITS.CREATOR_BASE - extraToMember);
  const platformShare = monthlySales * CUSTOM_RATE_LIMITS.PLATFORM_RATE;

  return {
    tierName: tier.tierName,
    tierRate: tier.memberRate,
    customRate,
    tierEarnings: Number(tierEarnings.toFixed(2)),
    customEarnings: Number(customEarnings.toFixed(2)),
    difference: Number(difference.toFixed(2)),
    differencePercent: Number(differencePercent.toFixed(1)),
    creatorCost: {
      tierCreatorShare: Number(tierCreatorShare.toFixed(2)),
      customCreatorShare: Number(customCreatorShare.toFixed(2)),
      monthlyCreatorCost: Number((tierCreatorShare - customCreatorShare).toFixed(2)),
      platformShare: Number(platformShare.toFixed(2)),
    },
  };
}

// ========================================
// PRISMA SCHEMA CHANGES REQUIRED
// ========================================
/**
 * Add these fields to the Member model in prisma/schema.prisma:
 *
 * // CUSTOM COMMISSION RATES (Creator-set overrides)
 * customCommissionRate  Float?    // Override rate (0.10 to 0.25)
 * customRateSetBy       String?   // Creator ID who set it
 * customRateSetAt       DateTime? // When the custom rate was set
 * customRateReason      String?   // Why they got special rate
 *
 * After adding, run:
 * npx prisma db push
 */
