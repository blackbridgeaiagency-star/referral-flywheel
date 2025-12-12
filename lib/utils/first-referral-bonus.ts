/**
 * First Referral Bonus System
 *
 * Handles the "first referral bonus" - an incentive for members to get their first referral.
 * This creates a milestone moment that encourages engagement.
 *
 * Bonus Types:
 * - fixed: A fixed dollar amount (e.g., $5)
 * - matched: Match the commission earned from the first referral
 * - percentage: A percentage of the first sale amount
 *
 * Status Workflow:
 * pending_confirmation -> confirmed (after 30-day hold) -> paid
 *                     -> revoked (if refunded within 30 days)
 */

import { prisma } from '../db/prisma';
import logger from '../logger';
import { addDays } from 'date-fns';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface FirstReferralBonusConfig {
  enabled: boolean;
  bonusAmount: number; // e.g., 5.00 for $5 bonus
  bonusType: 'fixed' | 'matched' | 'percentage';
}

export interface CheckBonusResult {
  qualifies: boolean;
  bonusAmount: number;
  alreadyClaimed: boolean;
  bonusId?: string;
  status?: string;
}

export interface ProcessBonusResult {
  bonusAwarded: boolean;
  bonusAmount: number;
  bonusId?: string;
  reason?: string;
}

// Default configuration (platform-wide default)
// NOTE: First referral bonus system is DISABLED - not using this feature
export const DEFAULT_BONUS_CONFIG: FirstReferralBonusConfig = {
  enabled: false, // DISABLED - scrapped feature
  bonusAmount: 0,
  bonusType: 'fixed',
};

// Bonus hold period in days (to prevent gaming via refunds)
export const BONUS_HOLD_PERIOD_DAYS = 30;

// ============================================
// CHECK ELIGIBILITY
// ============================================

/**
 * Check if a member qualifies for the first referral bonus.
 *
 * Conditions:
 * 1. Member must not have already received/claimed a first referral bonus
 * 2. Member must have exactly 1 referral (transitioning from 0 to 1)
 * 3. The referral must have made at least one paid commission
 *
 * @param memberId - The member's ID to check
 * @param currentReferralCount - Their current total referral count
 */
export async function checkFirstReferralBonus(
  memberId: string,
  currentReferralCount: number
): Promise<CheckBonusResult> {
  try {
    // Check if member already has a bonus record
    const existingBonus = await prisma.firstReferralBonus.findUnique({
      where: { memberId },
      select: {
        id: true,
        status: true,
        bonusAmount: true,
      },
    });

    if (existingBonus) {
      // Already has a bonus record (any status)
      return {
        qualifies: false,
        bonusAmount: existingBonus.bonusAmount,
        alreadyClaimed: true,
        bonusId: existingBonus.id,
        status: existingBonus.status,
      };
    }

    // Member has no existing bonus - check if they qualify
    // They qualify if they're at 1 referral (just got their first)
    const qualifies = currentReferralCount === 1;

    return {
      qualifies,
      bonusAmount: DEFAULT_BONUS_CONFIG.bonusAmount,
      alreadyClaimed: false,
    };
  } catch (error) {
    logger.error('Error checking first referral bonus eligibility:', error);

    // Return safe default on error
    return {
      qualifies: false,
      bonusAmount: 0,
      alreadyClaimed: false,
    };
  }
}

/**
 * Alternative check using member ID only (fetches referral count internally)
 */
export async function checkFirstReferralBonusById(memberId: string): Promise<CheckBonusResult> {
  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        totalReferred: true,
        firstReferralBonusEarned: true,
      },
    });

    if (!member) {
      return {
        qualifies: false,
        bonusAmount: 0,
        alreadyClaimed: false,
      };
    }

    return checkFirstReferralBonus(memberId, member.totalReferred);
  } catch (error) {
    logger.error('Error checking first referral bonus by ID:', error);

    return {
      qualifies: false,
      bonusAmount: 0,
      alreadyClaimed: false,
    };
  }
}

// ============================================
// PROCESS BONUS
// ============================================

/**
 * Process and award the first referral bonus.
 *
 * Called from the webhook handler when a referred member makes their first payment.
 * Creates a FirstReferralBonus record with 30-day hold before confirmation.
 *
 * @param memberId - The referring member who earned the bonus
 * @param saleAmount - The sale amount from the first referral's purchase
 * @param triggeringCommissionId - The commission ID that triggered this bonus
 * @param config - Bonus configuration (optional, uses defaults)
 */
export async function processFirstReferralBonus(
  memberId: string,
  saleAmount: number,
  triggeringCommissionId?: string,
  config: FirstReferralBonusConfig = DEFAULT_BONUS_CONFIG
): Promise<ProcessBonusResult> {
  try {
    // Skip if bonus system is disabled
    if (!config.enabled) {
      return {
        bonusAwarded: false,
        bonusAmount: 0,
        reason: 'Bonus system disabled',
      };
    }

    // Check if member already has a bonus
    const existingBonus = await prisma.firstReferralBonus.findUnique({
      where: { memberId },
    });

    if (existingBonus) {
      logger.info(`Member ${memberId} already has first referral bonus (status: ${existingBonus.status})`);
      return {
        bonusAwarded: false,
        bonusAmount: 0,
        reason: 'Bonus already exists',
        bonusId: existingBonus.id,
      };
    }

    // Calculate bonus amount based on type
    let bonusAmount: number;

    switch (config.bonusType) {
      case 'fixed':
        bonusAmount = config.bonusAmount;
        break;

      case 'matched':
        // Match the commission earned (10% of sale by default)
        bonusAmount = saleAmount * 0.1;
        break;

      case 'percentage':
        // Percentage of the sale amount
        bonusAmount = saleAmount * (config.bonusAmount / 100);
        break;

      default:
        bonusAmount = config.bonusAmount;
    }

    // Round to 2 decimal places
    bonusAmount = Math.round(bonusAmount * 100) / 100;

    // Calculate dates
    const now = new Date();
    const confirmAt = addDays(now, BONUS_HOLD_PERIOD_DAYS);

    // Create the bonus record
    const bonus = await prisma.firstReferralBonus.create({
      data: {
        memberId,
        triggeringCommissionId,
        bonusAmount,
        bonusType: config.bonusType,
        status: 'pending_confirmation',
        eligibleAt: now,
        confirmAt,
      },
    });

    // Update member's flag
    await prisma.member.update({
      where: { id: memberId },
      data: { firstReferralBonusEarned: true },
    });

    logger.info(`First referral bonus awarded to ${memberId}: $${bonusAmount} (confirms: ${confirmAt.toISOString()})`);

    return {
      bonusAwarded: true,
      bonusAmount,
      bonusId: bonus.id,
    };
  } catch (error) {
    logger.error('Error processing first referral bonus:', error);

    return {
      bonusAwarded: false,
      bonusAmount: 0,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// BONUS LIFECYCLE MANAGEMENT
// ============================================

/**
 * Confirm bonuses that have passed the hold period.
 * Should be run by a cron job daily.
 */
export async function confirmEligibleBonuses(): Promise<number> {
  try {
    const now = new Date();

    const result = await prisma.firstReferralBonus.updateMany({
      where: {
        status: 'pending_confirmation',
        confirmAt: { lte: now },
      },
      data: {
        status: 'confirmed',
      },
    });

    if (result.count > 0) {
      logger.info(`Confirmed ${result.count} first referral bonuses`);
    }

    return result.count;
  } catch (error) {
    logger.error('Error confirming bonuses:', error);
    return 0;
  }
}

/**
 * Revoke a bonus (e.g., due to refund of the triggering purchase).
 *
 * @param memberId - The member whose bonus to revoke
 * @param reason - The reason for revocation
 */
export async function revokeFirstReferralBonus(
  memberId: string,
  reason: string
): Promise<boolean> {
  try {
    const bonus = await prisma.firstReferralBonus.findUnique({
      where: { memberId },
    });

    if (!bonus) {
      logger.warn(`No bonus found to revoke for member ${memberId}`);
      return false;
    }

    // Only revoke if not already paid
    if (bonus.status === 'paid') {
      logger.warn(`Cannot revoke paid bonus for member ${memberId}`);
      return false;
    }

    await prisma.firstReferralBonus.update({
      where: { memberId },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });

    // Update member flag
    await prisma.member.update({
      where: { id: memberId },
      data: { firstReferralBonusEarned: false },
    });

    logger.info(`Revoked first referral bonus for ${memberId}: ${reason}`);

    return true;
  } catch (error) {
    logger.error('Error revoking first referral bonus:', error);
    return false;
  }
}

/**
 * Mark a confirmed bonus as paid.
 *
 * @param memberId - The member whose bonus was paid
 */
export async function markBonusPaid(memberId: string): Promise<boolean> {
  try {
    const bonus = await prisma.firstReferralBonus.findUnique({
      where: { memberId },
    });

    if (!bonus || bonus.status !== 'confirmed') {
      logger.warn(`Cannot mark bonus as paid - invalid status for member ${memberId}`);
      return false;
    }

    await prisma.firstReferralBonus.update({
      where: { memberId },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    logger.info(`Marked first referral bonus as paid for ${memberId}`);

    return true;
  } catch (error) {
    logger.error('Error marking bonus as paid:', error);
    return false;
  }
}

// ============================================
// QUERIES
// ============================================

/**
 * Get a member's first referral bonus status.
 */
export async function getMemberBonusStatus(memberId: string) {
  try {
    const bonus = await prisma.firstReferralBonus.findUnique({
      where: { memberId },
      select: {
        id: true,
        bonusAmount: true,
        bonusType: true,
        status: true,
        eligibleAt: true,
        confirmAt: true,
        paidAt: true,
        revokedAt: true,
        revokeReason: true,
      },
    });

    if (!bonus) {
      return null;
    }

    // Calculate progress toward confirmation
    const now = new Date();
    const daysRemaining = bonus.status === 'pending_confirmation'
      ? Math.max(0, Math.ceil((bonus.confirmAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      ...bonus,
      daysRemaining,
      isConfirmed: bonus.status === 'confirmed' || bonus.status === 'paid',
      isPaid: bonus.status === 'paid',
      isRevoked: bonus.status === 'revoked',
    };
  } catch (error) {
    logger.error('Error fetching member bonus status:', error);
    return null;
  }
}

/**
 * Get all pending bonuses that need confirmation (for cron job).
 */
export async function getPendingBonuses() {
  try {
    const now = new Date();

    return prisma.firstReferralBonus.findMany({
      where: {
        status: 'pending_confirmation',
        confirmAt: { lte: now },
      },
      include: {
        member: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching pending bonuses:', error);
    return [];
  }
}

/**
 * Get confirmed bonuses ready for payout.
 */
export async function getConfirmedBonusesForPayout() {
  try {
    return prisma.firstReferralBonus.findMany({
      where: { status: 'confirmed' },
      include: {
        member: {
          select: {
            id: true,
            username: true,
            email: true,
            referralCode: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching confirmed bonuses:', error);
    return [];
  }
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Get first referral bonus analytics for a creator.
 */
export async function getBonusAnalytics(creatorId: string) {
  try {
    const [total, pending, confirmed, paid, revoked] = await Promise.all([
      prisma.firstReferralBonus.count({
        where: { member: { creatorId } },
      }),
      prisma.firstReferralBonus.count({
        where: {
          member: { creatorId },
          status: 'pending_confirmation',
        },
      }),
      prisma.firstReferralBonus.count({
        where: {
          member: { creatorId },
          status: 'confirmed',
        },
      }),
      prisma.firstReferralBonus.count({
        where: {
          member: { creatorId },
          status: 'paid',
        },
      }),
      prisma.firstReferralBonus.count({
        where: {
          member: { creatorId },
          status: 'revoked',
        },
      }),
    ]);

    // Calculate total bonus value
    const bonusSum = await prisma.firstReferralBonus.aggregate({
      where: {
        member: { creatorId },
        status: { in: ['confirmed', 'paid'] },
      },
      _sum: { bonusAmount: true },
    });

    return {
      total,
      pending,
      confirmed,
      paid,
      revoked,
      totalBonusValue: bonusSum._sum.bonusAmount || 0,
      conversionRate: total > 0 ? ((paid / total) * 100).toFixed(1) : '0',
    };
  } catch (error) {
    logger.error('Error fetching bonus analytics:', error);
    return {
      total: 0,
      pending: 0,
      confirmed: 0,
      paid: 0,
      revoked: 0,
      totalBonusValue: 0,
      conversionRate: '0',
    };
  }
}

export default {
  checkFirstReferralBonus,
  checkFirstReferralBonusById,
  processFirstReferralBonus,
  confirmEligibleBonuses,
  revokeFirstReferralBonus,
  markBonusPaid,
  getMemberBonusStatus,
  getPendingBonuses,
  getConfirmedBonusesForPayout,
  getBonusAnalytics,
  DEFAULT_BONUS_CONFIG,
  BONUS_HOLD_PERIOD_DAYS,
};
