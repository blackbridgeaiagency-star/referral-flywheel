// lib/utils/rank-updater.ts
// Utility to update member rankings after commission changes

import { prisma } from '../db/prisma';
import logger from '../logger';

/**
 * Update rankings for a specific member after their stats change
 * This is more efficient than recalculating all rankings
 */
export async function updateMemberRankings(memberId: string): Promise<void> {
  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        totalReferred: true,
        creatorId: true,
        createdAt: true,
      }
    });

    if (!member) {
      logger.warn(`⚠️ Member ${memberId} not found for rank update`);
      return;
    }

    // Calculate all three ranks in parallel
    const [globalEarningsRank, globalReferralsRank, communityRank] = await Promise.all([
      calculateGlobalEarningsRank(memberId, member.createdAt),
      calculateGlobalReferralsRank(member.totalReferred, member.createdAt),
      calculateCommunityRank(member.creatorId, member.totalReferred, member.createdAt),
    ]);

    // Update member with new ranks
    await prisma.member.update({
      where: { id: memberId },
      data: {
        globalEarningsRank,
        globalReferralsRank,
        communityRank,
      }
    });

    logger.debug(`✅ Updated ranks for member ${memberId}: Global Earnings #${globalEarningsRank}, Global Referrals #${globalReferralsRank}, Community #${communityRank}`);
  } catch (error) {
    logger.error('❌ Error updating member rankings:', error);
    // Don't throw - rank updates are non-critical
  }
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
