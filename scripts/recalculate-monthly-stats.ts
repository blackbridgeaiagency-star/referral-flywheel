import { prisma } from '@/lib/db/prisma';
import { startOfMonth } from 'date-fns';
import logger from '../lib/logger';


async function recalculateMonthlyStats() {
  logger.info(' RECALCULATING MONTHLY STATS FROM DATABASE\n');
  logger.debug('This script recalculates monthlyReferred and monthlyEarnings from the database.');
  logger.debug('Use this if data gets out of sync.\n');

  const currentMonthStart = startOfMonth(new Date());
  logger.debug(`Current month start: ${currentMonthStart.toISOString()}\n`);

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

  logger.debug(`Found ${members.length} members to recalculate.\n`);
  logger.debug('Processing...\n');

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
        logger.info(' Updating ${member.username}:');
        logger.debug(`   monthlyReferred: ${member.monthlyReferred} → ${actualMonthlyReferrals}`);
        logger.debug(`   monthlyEarnings: $${member.monthlyEarnings.toFixed(2)} → $${actualMonthlyEarnings.toFixed(2)}`);

        // Validation: actualMonthlyReferrals should never exceed totalReferred
        if (actualMonthlyReferrals > member.totalReferred) {
          errors.push(
            `${member.username}: actualMonthlyReferrals (${actualMonthlyReferrals}) > ` +
            `totalReferred (${member.totalReferred}). Skipping update.`
          );
          logger.debug(`   ⚠️  SKIPPED: Monthly > Total (data integrity issue)`);
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
      logger.debug(`   ❌ ERROR: ${error}`);
    }
  }

  logger.debug('\n═══════════════════════════════════════');
  logger.info(' RECALCULATION SUMMARY:');
  logger.debug('═══════════════════════════════════════');
  logger.debug(`Total members: ${members.length}`);
  logger.debug(`Updated: ${updated}`);
  logger.debug(`Unchanged: ${unchanged}`);
  logger.debug(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    logger.debug('\n❌ ERRORS:');
    errors.forEach(e => logger.debug(`  - ${e}`));
  }

  // Verification: Check consistency
  logger.debug('\n🔍 VERIFICATION:');

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
  logger.debug(`  Sum of monthlyReferred (${sumMonthlyReferred._sum.monthlyReferred}) = ` +
    `Actual monthly referrals (${actualMonthlyReferrals})? ${sumMatches ? '✅' : '❌'}`);

  logger.debug('\n═══════════════════════════════════════');
  logger.debug(errors.length === 0 && sumMatches ? '✅ RECALCULATION COMPLETE' : '⚠️  RECALCULATION COMPLETE WITH WARNINGS');
  logger.debug('═══════════════════════════════════════\n');

  await prisma.$disconnect();
}

recalculateMonthlyStats().catch(console.error);
