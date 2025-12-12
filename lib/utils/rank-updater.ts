// lib/utils/rank-updater.ts
// Utility to update member rankings after commission changes
// Includes milestone detection and notification triggers

import { prisma } from '../db/prisma';
import logger from '../logger';
import {
  notifyRankChange,
  notifyMilestone,
} from '../whop/notifications';
import { sendRankChangeDM } from '../whop/graphql-messaging';

// Milestone thresholds for notifications
export const MILESTONES = [10, 25, 50, 100, 250, 500, 1000] as const;
export type MilestoneValue = typeof MILESTONES[number];

// Rank change thresholds for notifications (only notify on significant changes)
const SIGNIFICANT_RANK_CHANGE = 3; // Only notify if rank changes by 3+ positions
const TOP_RANK_THRESHOLD = 10; // Always notify for top 10 changes

/**
 * Result from updating rankings with detected changes
 */
export interface RankUpdateResult {
  memberId: string;
  previousRanks: {
    globalEarnings: number | null;
    globalReferrals: number | null;
    community: number | null;
  };
  newRanks: {
    globalEarnings: number;
    globalReferrals: number;
    community: number;
  };
  rankChanges: {
    globalEarnings: number;
    globalReferrals: number;
    community: number;
  };
  milestoneReached: MilestoneValue | null;
  enteredTop3: boolean;
}

/**
 * Update rankings for a specific member after their stats change
 * This is more efficient than recalculating all rankings
 *
 * Now also detects milestones and rank changes for notifications
 */
export async function updateMemberRankings(memberId: string): Promise<RankUpdateResult | null> {
  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        creator: {
          select: {
            companyId: true,
          }
        }
      }
    });

    if (!member) {
      logger.warn(`Member ${memberId} not found for rank update`);
      return null;
    }

    // Store previous ranks
    const previousRanks = {
      globalEarnings: member.globalEarningsRank,
      globalReferrals: member.globalReferralsRank,
      community: member.communityRank,
    };

    // Calculate all three ranks in parallel
    const [globalEarningsRank, globalReferralsRank, communityRank] = await Promise.all([
      calculateGlobalEarningsRank(memberId, member.createdAt),
      calculateGlobalReferralsRank(member.totalReferred, member.createdAt),
      calculateCommunityRank(member.creatorId, member.totalReferred, member.createdAt),
    ]);

    const newRanks = {
      globalEarnings: globalEarningsRank,
      globalReferrals: globalReferralsRank,
      community: communityRank,
    };

    // Calculate rank changes
    const rankChanges = {
      globalEarnings: (previousRanks.globalEarnings || globalEarningsRank) - globalEarningsRank,
      globalReferrals: (previousRanks.globalReferrals || globalReferralsRank) - globalReferralsRank,
      community: (previousRanks.community || communityRank) - communityRank,
    };

    // Check for milestone
    const milestoneReached = checkMilestone(member.totalReferred);

    // Check if entered top 3
    const enteredTop3 = (
      previousRanks.community !== null &&
      previousRanks.community > 3 &&
      communityRank <= 3
    );

    // Update member with new ranks
    await prisma.member.update({
      where: { id: memberId },
      data: {
        globalEarningsRank,
        globalReferralsRank,
        communityRank,
      }
    });

    const result: RankUpdateResult = {
      memberId,
      previousRanks,
      newRanks,
      rankChanges,
      milestoneReached,
      enteredTop3,
    };

    // Trigger notifications for significant changes (non-blocking)
    triggerRankNotifications(member, result).catch(err => {
      logger.error('Failed to trigger rank notifications:', err);
    });

    logger.debug(`Updated ranks for member ${memberId}: Global Earnings #${globalEarningsRank}, Global Referrals #${globalReferralsRank}, Community #${communityRank}`);

    return result;
  } catch (error) {
    logger.error('Error updating member rankings:', error);
    // Don't throw - rank updates are non-critical
    return null;
  }
}

/**
 * Check if a referral count hits a milestone
 */
export function checkMilestone(totalReferrals: number): MilestoneValue | null {
  // Return the milestone if totalReferrals exactly matches
  if (MILESTONES.includes(totalReferrals as MilestoneValue)) {
    return totalReferrals as MilestoneValue;
  }
  return null;
}

/**
 * Get the next milestone for a given referral count
 */
export function getNextMilestone(totalReferrals: number): {
  nextMilestone: MilestoneValue | null;
  referralsNeeded: number;
  progressPercent: number;
} {
  const nextMilestone = MILESTONES.find(m => m > totalReferrals) || null;

  if (!nextMilestone) {
    return {
      nextMilestone: null,
      referralsNeeded: 0,
      progressPercent: 100,
    };
  }

  // Find the previous milestone for progress calculation
  const prevMilestones = MILESTONES.filter(m => m <= totalReferrals);
  const prevMilestone = prevMilestones.length > 0
    ? prevMilestones[prevMilestones.length - 1]
    : 0;

  const range = nextMilestone - prevMilestone;
  const progress = totalReferrals - prevMilestone;
  const progressPercent = Math.round((progress / range) * 100);

  return {
    nextMilestone,
    referralsNeeded: nextMilestone - totalReferrals,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
  };
}

/**
 * Trigger notifications for rank changes and milestones
 * Non-blocking, catches its own errors
 */
async function triggerRankNotifications(
  member: {
    id: string;
    userId: string;
    username: string;
    totalReferred: number;
    creator: { companyId: string };
  },
  result: RankUpdateResult
): Promise<void> {
  const companyId = member.creator.companyId;
  const userId = member.userId;

  // 1. Notify on community rank changes (most relevant to users)
  const communityRankChange = result.rankChanges.community;
  const newCommunityRank = result.newRanks.community;

  // Notify if:
  // - Rank changed by SIGNIFICANT_RANK_CHANGE or more
  // - OR moved into/within top 10
  // - OR entered top 3
  const shouldNotifyRank = (
    Math.abs(communityRankChange) >= SIGNIFICANT_RANK_CHANGE ||
    (newCommunityRank <= TOP_RANK_THRESHOLD && communityRankChange !== 0) ||
    result.enteredTop3
  );

  if (shouldNotifyRank && communityRankChange !== 0) {
    const direction = communityRankChange > 0 ? 'up' : 'down';
    const positionsChanged = Math.abs(communityRankChange);

    // Special notification for top 3
    if (result.enteredTop3) {
      logger.info(`🏆 Member ${member.username} entered TOP 3 at rank #${newCommunityRank}!`);
    }

    // Push notification
    await notifyRankChange(companyId, userId, newCommunityRank, direction);

    // DM for more personal touch (especially for significant changes)
    await sendRankChangeDM(
      userId,
      member.username,
      newCommunityRank,
      direction,
      positionsChanged
    ).catch(err => logger.error('Failed to send rank change DM:', err));

    logger.info(`Sent rank ${direction} notification to ${member.username}: now #${newCommunityRank} (moved ${positionsChanged} spots)`);
  }

  // 2. Notify on milestones
  if (result.milestoneReached) {
    // Get milestone-specific reward if any (could be configured by creator)
    const milestoneReward = getMilestoneReward(result.milestoneReached);

    await notifyMilestone(
      companyId,
      userId,
      result.milestoneReached,
      milestoneReward
    );

    logger.info(`Sent milestone notification to ${member.username}: ${result.milestoneReached} referrals!`);
  }
}

/**
 * Get reward text for a milestone (could be extended to read from creator settings)
 */
function getMilestoneReward(milestone: MilestoneValue): string | undefined {
  const rewards: Partial<Record<MilestoneValue, string>> = {
    10: 'Keep it up!',
    25: 'Rising star!',
    50: 'Ambassador status unlocked!',
    100: 'Elite status unlocked!',
    250: 'Legend status!',
    500: 'Top performer!',
    1000: 'Hall of Fame!',
  };

  return rewards[milestone];
}

/**
 * Calculate global earnings rank for a member
 */
async function calculateGlobalEarningsRank(memberId: string, createdAt: Date): Promise<number> {
  // Get this member's total earnings
  const memberEarnings = await prisma.commission.aggregate({
    where: {
      memberId,
      status: 'paid'
    },
    _sum: {
      memberShare: true
    }
  });
  const myEarnings = memberEarnings._sum.memberShare || 0;

  // Get all real members (exclude test data)
  const realMembers = await prisma.member.findMany({
    where: {
      creator: {
        companyId: {
          not: {
            contains: '_test'
          }
        }
      }
    },
    select: { id: true }
  });
  const realMemberIds = realMembers.map(m => m.id);

  // Count members with higher earnings
  const higherEarners = await prisma.commission.groupBy({
    by: ['memberId'],
    where: {
      status: 'paid',
      memberId: {
        in: realMemberIds
      }
    },
    having: {
      memberShare: {
        _sum: {
          gt: myEarnings
        }
      }
    },
    _sum: {
      memberShare: true
    }
  });

  // Count ties with earlier created date
  const tiesWithEarlierDate = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::int as count
    FROM "Member" m
    WHERE m.id IN (
      SELECT c."memberId"
      FROM "Commission" c
      WHERE c.status = 'paid'
      GROUP BY c."memberId"
      HAVING SUM(c."memberShare") = ${myEarnings}
    )
    AND m."createdAt" < ${createdAt}
  `;

  const tieBreakers = tiesWithEarlierDate[0] ? Number(tiesWithEarlierDate[0].count) : 0;
  return higherEarners.length + tieBreakers + 1;
}

/**
 * Calculate global referrals rank for a member
 */
async function calculateGlobalReferralsRank(totalReferred: number, createdAt: Date): Promise<number> {
  const higherReferrers = await prisma.member.count({
    where: {
      creator: {
        companyId: {
          not: {
            contains: '_test'
          }
        }
      },
      OR: [
        { totalReferred: { gt: totalReferred } },
        {
          totalReferred: totalReferred,
          createdAt: { lt: createdAt }
        }
      ]
    }
  });

  return higherReferrers + 1;
}

/**
 * Calculate community rank for a member
 */
async function calculateCommunityRank(creatorId: string, totalReferred: number, createdAt: Date): Promise<number> {
  const higherReferrers = await prisma.member.count({
    where: {
      creatorId,
      creator: {
        companyId: {
          not: {
            contains: '_test'
          }
        }
      },
      OR: [
        { totalReferred: { gt: totalReferred } },
        {
          totalReferred: totalReferred,
          createdAt: { lt: createdAt }
        }
      ]
    }
  });

  return higherReferrers + 1;
}

/**
 * Batch update rankings for multiple members
 * More efficient when multiple members need updates
 */
export async function batchUpdateMemberRankings(memberIds: string[]): Promise<void> {
  logger.debug(`📊 Batch updating rankings for ${memberIds.length} members...`);

  await Promise.all(
    memberIds.map(memberId => updateMemberRankings(memberId))
  );

  logger.debug(`✅ Batch rank update complete for ${memberIds.length} members`);
}
