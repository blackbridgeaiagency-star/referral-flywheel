// scripts/spread-monthly-referrals.ts
// Spread October 2025 referrals across top 20 performers

import { PrismaClient } from '@prisma/client';
import { generateReferralCode } from '../lib/utils/referral-code';
import logger from '../lib/logger';


const prisma = new PrismaClient();

// Generate October 2025 date
function octoberDate() {
  const date = new Date();
  date.setDate(Math.floor(Math.random() * 29) + 1);
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
}

async function main() {
  logger.info(' Spreading October 2025 referrals across top performers...\n');

  // Get top 20 performers (excluding hero who already has October data)
  const topPerformers = await prisma.member.findMany({
    where: {
      userId: { startsWith: 'top_earner_' }, // Only top earners from seed
    },
    orderBy: {
      totalReferred: 'desc',
    },
    select: {
      id: true,
      userId: true,
      username: true,
      referralCode: true,
      totalReferred: true,
      monthlyReferred: true,
      creatorId: true,
    },
    take: 20,
  });

  logger.debug(`Found ${topPerformers.length} top performers\n`);

  let totalMembersCreated = 0;

  for (const performer of topPerformers) {
    // Each top performer gets 2-8 referrals this month (randomized for natural distribution)
    const monthlyReferrals = Math.floor(Math.random() * 7) + 2; // 2-8 referrals

    logger.debug(`Creating ${monthlyReferrals} October referrals for ${performer.username}...`);

    for (let i = 0; i < monthlyReferrals; i++) {
      const username = `OctRef_${performer.username}_${i + 1}`;
      const userId = `oct_ref_${performer.userId}_${i + 1}`;
      const email = `${userId}@demo.com`;
      const createdAt = octoberDate();

      await prisma.member.create({
        data: {
          userId,
          membershipId: `mem_${userId}_${Date.now()}`,
          username,
          email,
          referralCode: generateReferralCode(username),
          creatorId: performer.creatorId,
          subscriptionPrice: 49.99,
          referredBy: performer.referralCode, // ✅ Referred by this performer
          memberOrigin: 'referred',
          totalReferred: 0,
          monthlyReferred: 0,
          lifetimeEarnings: 0,
          monthlyEarnings: 0,
          currentTier: 'bronze',
          createdAt,
          updatedAt: createdAt,
        },
      });

      totalMembersCreated++;
    }

    // Update performer's monthlyReferred field
    await prisma.member.update({
      where: { id: performer.id },
      data: {
        monthlyReferred: monthlyReferrals,
        totalReferred: performer.totalReferred + monthlyReferrals,
      },
    });

    logger.debug(`   ✅ Updated ${performer.username}: monthlyReferred = ${monthlyReferrals}\n`);
  }

  logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('October referrals distributed successfully!\n');
  logger.info(' Summary:');
  logger.debug(`   • Top performers updated: ${topPerformers.length}`);
  logger.debug(`   • New October members created: ${totalMembersCreated}`);
  logger.debug('\n🎯 Your Creator Dashboard "Top Referrers" table should now show:');
  logger.debug('   ✅ "This Month" column populated for top 20 performers');
  logger.debug('   ✅ Natural distribution: 2-8 referrals per performer');
  logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
