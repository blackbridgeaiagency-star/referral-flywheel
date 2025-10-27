import { prisma } from '@/lib/db/prisma';
import { startOfMonth } from 'date-fns';

async function recalculateMonthlyStats() {
  console.log('🔧 RECALCULATING MONTHLY STATS FROM DATABASE\n');
  console.log('This script recalculates monthlyReferred and monthlyEarnings from the database.');
  console.log('Use this if data gets out of sync.\n');

  const currentMonthStart = startOfMonth(new Date());
  console.log(`Current month start: ${currentMonthStart.toISOString()}\n`);

  // Get all members
  const members = await prisma.member.findMany({
    select: {
      id: true,
      username: true,
      referralCode: true,
      totalReferred: true,
      monthlyReferred: true,
      lifetimeEarnings: true,
      monthlyEarnings: true,
    },
  });

  console.log(`Found ${members.length} members to recalculate.\n`);
  console.log('Processing...\n');

  let updated = 0;
  let unchanged = 0;
  const errors: string[] = [];

  for (const member of members) {
    try {
      // Calculate ACTUAL monthly referrals from database
      const actualMonthlyReferrals = await prisma.member.count({
        where: {
          referredBy: member.referralCode,
          createdAt: { gte: currentMonthStart },
        },
      });

      // Calculate ACTUAL monthly earnings from database
      const monthlyCommissions = await prisma.commission.aggregate({
        where: {
          memberId: member.id,
          createdAt: { gte: currentMonthStart },
        },
        _sum: { memberShare: true },
      });

      const actualMonthlyEarnings = monthlyCommissions._sum.memberShare || 0;

      // Check if update needed
      const referralsMismatch = member.monthlyReferred !== actualMonthlyReferrals;
      const earningsMismatch = Math.abs(member.monthlyEarnings - actualMonthlyEarnings) > 0.01;

      if (referralsMismatch || earningsMismatch) {
        console.log(`📝 Updating ${member.username}:`);
        console.log(`   monthlyReferred: ${member.monthlyReferred} → ${actualMonthlyReferrals}`);
        console.log(`   monthlyEarnings: $${member.monthlyEarnings.toFixed(2)} → $${actualMonthlyEarnings.toFixed(2)}`);

        // Validation: actualMonthlyReferrals should never exceed totalReferred
        if (actualMonthlyReferrals > member.totalReferred) {
          errors.push(
            `${member.username}: actualMonthlyReferrals (${actualMonthlyReferrals}) > ` +
            `totalReferred (${member.totalReferred}). Skipping update.`
          );
          console.log(`   ⚠️  SKIPPED: Monthly > Total (data integrity issue)`);
          continue;
        }

        await prisma.member.update({
          where: { id: member.id },
          data: {
            monthlyReferred: actualMonthlyReferrals,
            monthlyEarnings: actualMonthlyEarnings,
          },
        });

        updated++;
      } else {
        unchanged++;
      }
    } catch (error) {
      errors.push(`${member.username}: ${error}`);
      console.log(`   ❌ ERROR: ${error}`);
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📋 RECALCULATION SUMMARY:');
  console.log('═══════════════════════════════════════');
  console.log(`Total members: ${members.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(e => console.log(`  - ${e}`));
  }

  // Verification: Check consistency
  console.log('\n🔍 VERIFICATION:');

  const sumMonthlyReferred = await prisma.member.aggregate({
    _sum: { monthlyReferred: true },
  });

  const actualMonthlyReferrals = await prisma.member.count({
    where: {
      memberOrigin: 'referred',
      createdAt: { gte: currentMonthStart },
    },
  });

  const sumMatches = sumMonthlyReferred._sum.monthlyReferred === actualMonthlyReferrals;
  console.log(`  Sum of monthlyReferred (${sumMonthlyReferred._sum.monthlyReferred}) = ` +
    `Actual monthly referrals (${actualMonthlyReferrals})? ${sumMatches ? '✅' : '❌'}`);

  console.log('\n═══════════════════════════════════════');
  console.log(errors.length === 0 && sumMatches ? '✅ RECALCULATION COMPLETE' : '⚠️  RECALCULATION COMPLETE WITH WARNINGS');
  console.log('═══════════════════════════════════════\n');

  await prisma.$disconnect();
}

recalculateMonthlyStats().catch(console.error);
