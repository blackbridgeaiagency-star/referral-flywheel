// lib/services/first-referral-bonus-service.ts

import { prisma } from '@/lib/db/prisma';
import {
  calculateFirstReferralBonus,
  getConfirmationDate,
  FIRST_REFERRAL_BONUS_CONFIG,
  type BonusStatus,
  type FirstReferralBonusResult,
} from '@/lib/utils/first-referral-bonus';

/**
 * Check if member is eligible for first referral bonus
 * Called BEFORE incrementing totalReferred
 */
export async function checkFirstReferralEligibility(
  memberId: string
): Promise<boolean> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      totalReferred: true,
      firstReferralBonusEarned: true,
    },
  });

  if (!member) return false;

  // Eligible if: no previous referrals AND haven't earned bonus before
  return member.totalReferred === 0 && !member.firstReferralBonusEarned;
}

/**
 * Create first referral bonus for member
 * Called during processCommission when first referral converts
 */
export async function createFirstReferralBonus(
  memberId: string,
  commissionId: string,
  commissionAmount: number
): Promise<FirstReferralBonusResult | null> {
  try {
    // Double-check eligibility
    const isEligible = await checkFirstReferralEligibility(memberId);

    if (!isEligible) {
      return {
        bonusAmount: 0,
        bonusType: 'none',
        status: 'ineligible',
        confirmAt: new Date(),
        message: 'Not eligible for first referral bonus',
      };
    }

    // Check minimum commission threshold
    if (commissionAmount < FIRST_REFERRAL_BONUS_CONFIG.MIN_COMMISSION_TO_QUALIFY) {
      return {
        bonusAmount: 0,
        bonusType: 'none',
        status: 'ineligible',
        confirmAt: new Date(),
        message: 'Commission too small to qualify',
      };
    }

    const bonusAmount = calculateFirstReferralBonus(commissionAmount);
    const confirmAt = getConfirmationDate();

    // Create bonus record and update member in transaction
    await prisma.$transaction(async (tx) => {
      // Create bonus
      await tx.firstReferralBonus.create({
        data: {
          memberId,
          triggeringCommissionId: commissionId,
          bonusAmount: Number(bonusAmount.toFixed(2)),
          bonusType: FIRST_REFERRAL_BONUS_CONFIG.BONUS_TYPE,
          status: 'pending_confirmation',
          eligibleAt: new Date(),
          confirmAt,
        },
      });

      // Mark member as having earned bonus
      await tx.member.update({
        where: { id: memberId },
        data: { firstReferralBonusEarned: true },
      });
    });

    console.log(`First referral bonus created: $${bonusAmount} for member ${memberId}`);

    return {
      bonusAmount,
      bonusType: FIRST_REFERRAL_BONUS_CONFIG.BONUS_TYPE,
      status: 'pending_confirmation',
      confirmAt,
      message: `$${bonusAmount.toFixed(2)} bonus pending! Confirms in 30 days.`,
    };

  } catch (error) {
    console.error('Failed to create first referral bonus:', error);
    return null;
  }
}

/**
 * Revoke first referral bonus (called when referral refunds)
 */
export async function revokeFirstReferralBonus(
  commissionId: string,
  reason: string = 'referral_refunded'
): Promise<boolean> {
  try {
    const bonus = await prisma.firstReferralBonus.findUnique({
      where: { triggeringCommissionId: commissionId },
    });

    if (!bonus) {
      return true; // No bonus to revoke
    }

    // Only revoke if not already paid
    if (bonus.status === 'paid') {
      console.warn(`Cannot revoke already-paid bonus ${bonus.id}`);
      return false;
    }

    await prisma.firstReferralBonus.update({
      where: { id: bonus.id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });

    console.log(`First referral bonus ${bonus.id} revoked: ${reason}`);
    return true;

  } catch (error) {
    console.error('Failed to revoke first referral bonus:', error);
    return false;
  }
}

/**
 * Confirm pending bonuses (run daily via cron)
 * Confirms bonuses where confirmAt has passed
 */
export async function confirmPendingBonuses(): Promise<number> {
  try {
    const result = await prisma.firstReferralBonus.updateMany({
      where: {
        status: 'pending_confirmation',
        confirmAt: { lte: new Date() },
      },
      data: {
        status: 'confirmed',
      },
    });

    console.log(`Confirmed ${result.count} first referral bonuses`);
    return result.count;

  } catch (error) {
    console.error('Failed to confirm pending bonuses:', error);
    return 0;
  }
}

/**
 * Get member's first referral bonus status
 */
export async function getFirstReferralBonusStatus(
  memberId: string
): Promise<{
  hasBonus: boolean;
  bonus: any | null;
  eligibleForBonus: boolean;
  potentialAmount: number;
}> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      totalReferred: true,
      firstReferralBonusEarned: true,
      firstReferralBonus: true,
    },
  });

  if (!member) {
    return {
      hasBonus: false,
      bonus: null,
      eligibleForBonus: false,
      potentialAmount: 0,
    };
  }

  return {
    hasBonus: !!member.firstReferralBonus,
    bonus: member.firstReferralBonus,
    eligibleForBonus: member.totalReferred === 0 && !member.firstReferralBonusEarned,
    potentialAmount: FIRST_REFERRAL_BONUS_CONFIG.FIXED_AMOUNT,
  };
}

/**
 * Pay out confirmed bonuses
 * This would integrate with your payment system
 */
export async function payConfirmedBonuses(): Promise<number> {
  try {
    // Find all confirmed bonuses ready for payment
    const bonuses = await prisma.firstReferralBonus.findMany({
      where: { status: 'confirmed' },
      include: { member: true },
    });

    let paidCount = 0;

    for (const bonus of bonuses) {
      // TODO: Integrate with actual payment system
      // For now, just mark as paid and update member earnings

      await prisma.$transaction(async (tx) => {
        // Update bonus status
        await tx.firstReferralBonus.update({
          where: { id: bonus.id },
          data: {
            status: 'paid',
            paidAt: new Date(),
          },
        });

        // Add bonus to member's earnings
        await tx.member.update({
          where: { id: bonus.memberId },
          data: {
            lifetimeEarnings: { increment: bonus.bonusAmount },
            monthlyEarnings: { increment: bonus.bonusAmount },
          },
        });
      });

      paidCount++;
      console.log(`Paid first referral bonus: $${bonus.bonusAmount} to ${bonus.member.username}`);
    }

    return paidCount;

  } catch (error) {
    console.error('Failed to pay confirmed bonuses:', error);
    return 0;
  }
}
