// scripts/spread-monthly-referrals.ts
// Spread October 2025 referrals across top 20 performers

import { PrismaClient } from '@prisma/client';
import { generateReferralCode } from '../lib/utils/referral-code';

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
  console.log('📅 Spreading October 2025 referrals across top performers...\n');

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

  console.log(`Found ${topPerformers.length} top performers\n`);

  let totalMembersCreated = 0;

  for (const performer of topPerformers) {
    // Each top performer gets 2-8 referrals this month (randomized for natural distribution)
    const monthlyReferrals = Math.floor(Math.random() * 7) + 2; // 2-8 referrals

    console.log(`Creating ${monthlyReferrals} October referrals for ${performer.username}...`);

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

    console.log(`   ✅ Updated ${performer.username}: monthlyReferred = ${monthlyReferrals}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ October referrals distributed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • Top performers updated: ${topPerformers.length}`);
  console.log(`   • New October members created: ${totalMembersCreated}`);
  console.log('\n🎯 Your Creator Dashboard "Top Referrers" table should now show:');
  console.log('   ✅ "This Month" column populated for top 20 performers');
  console.log('   ✅ Natural distribution: 2-8 referrals per performer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
