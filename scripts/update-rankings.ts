// scripts/update-rankings.ts
// Recalculate all member rankings with proper tie-breaking
import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';


const prisma = new PrismaClient();

async function updateRankings() {
  logger.info(' Recalculating all member rankings with tie-breaking...\n');

  // Get all creators
  const creators = await prisma.creator.findMany({
    select: { id: true, companyName: true }
  });

  // === GLOBAL RANKINGS (BY REFERRALS) ===
  logger.info(' Calculating global referral rankings...');
  const allMembersByReferrals = await prisma.member.findMany({
    orderBy: [
      { totalReferred: 'desc' },
      { createdAt: 'asc' } // Tiebreaker: who reached it first
    ],
    select: {
      id: true,
      username: true,
      totalReferred: true,
      createdAt: true
    }
  });

  let currentRank = 1;
  let previousReferrals = null;
  let membersAtCurrentRank = 0;

  for (const member of allMembersByReferrals) {
    // If this member has same referrals as previous, give them same rank
    if (previousReferrals === member.totalReferred) {
      // Keep same rank (tied)
      membersAtCurrentRank++;
    } else {
      // New rank - skip ranks if there were ties
      currentRank += membersAtCurrentRank;
      membersAtCurrentRank = 1;
      previousReferrals = member.totalReferred;
    }

    await prisma.member.update({
      where: { id: member.id },
      data: { globalReferralsRank: currentRank }
    });
  }

  logger.info('Updated ${allMembersByReferrals.length} global referral rankings');

  // === GLOBAL RANKINGS (BY EARNINGS) ===
  logger.info(' Calculating global earnings rankings...');
  const allMembersByEarnings = await prisma.member.findMany({
    orderBy: [
      { lifetimeEarnings: 'desc' },
      { createdAt: 'asc' } // Tiebreaker
    ],
    select: {
      id: true,
      username: true,
      lifetimeEarnings: true,
      createdAt: true
    }
  });

  currentRank = 1;
  let previousEarnings = null;
  membersAtCurrentRank = 0;

  for (const member of allMembersByEarnings) {
    if (previousEarnings === member.lifetimeEarnings) {
      membersAtCurrentRank++;
    } else {
      currentRank += membersAtCurrentRank;
      membersAtCurrentRank = 1;
      previousEarnings = member.lifetimeEarnings;
    }

    await prisma.member.update({
      where: { id: member.id },
      data: { globalEarningsRank: currentRank }
    });
  }

  logger.info('Updated ${allMembersByEarnings.length} global earnings rankings\n');

  // === COMMUNITY RANKINGS ===
  for (const creator of creators) {
    logger.info(' Calculating community rankings for ${creator.companyName}...');

    const communityMembers = await prisma.member.findMany({
      where: { creatorId: creator.id },
      orderBy: [
        { totalReferred: 'desc' },
        { createdAt: 'asc' }
      ],
      select: {
        id: true,
        username: true,
        totalReferred: true,
        createdAt: true
      }
    });

    currentRank = 1;
    previousReferrals = null;
    membersAtCurrentRank = 0;

    for (const member of communityMembers) {
      if (previousReferrals === member.totalReferred) {
        membersAtCurrentRank++;
      } else {
        currentRank += membersAtCurrentRank;
        membersAtCurrentRank = 1;
        previousReferrals = member.totalReferred;
      }

      await prisma.member.update({
        where: { id: member.id },
        data: { communityRank: currentRank }
      });
    }

    logger.info('Updated ${communityMembers.length} community rankings for ${creator.companyName}');
  }

  logger.debug('\n🎉 All rankings updated successfully with tie-breaking!');
}

updateRankings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
