import { prisma } from '@/lib/db/prisma';
import { startOfMonth } from 'date-fns';
import logger from '../lib/logger';


async function diagnose() {
  const octoberStart = new Date('2025-10-01T00:00:00Z');
  const now = new Date();

  logger.info(' DIAGNOSING OCTOBER 2025 DATA\n');
  logger.debug(`Current date: ${now.toISOString()}`);
  logger.debug(`October start: ${octoberStart.toISOString()}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITICAL CHECK 1: How many NEW referrals in October?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const newReferralsInOctober = await prisma.member.count({
    where: {
      memberOrigin: 'referred',
      createdAt: { gte: octoberStart, lte: now },
    },
  });

  logger.info(' New Referrals in October: ${newReferralsInOctober}');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITICAL CHECK 2: October commissions breakdown
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const octoberCommissions = await prisma.commission.groupBy({
    by: ['paymentType'],
    where: {
      createdAt: { gte: octoberStart, lte: now },
    },
    _count: true,
    _sum: { saleAmount: true },
  });

  logger.debug('\n💰 October Commissions:');
  if (octoberCommissions.length === 0) {
    logger.debug('  (No commissions in October)');
  } else {
    octoberCommissions.forEach(c => {
      logger.debug(`  - ${c.paymentType}: ${c._count} payments, $${c._sum.saleAmount?.toFixed(2) || 0}`);
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITICAL CHECK 3: Top 10 members - field vs reality
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const topMembers = await prisma.member.findMany({
    orderBy: { totalReferred: 'desc' },
    take: 10,
    select: {
      id: true,
      username: true,
      referralCode: true,
      totalReferred: true,
      monthlyReferred: true, // What the field says
      monthlyEarnings: true,
      lifetimeEarnings: true,
    },
  });

  logger.debug('\n👥 Top 10 Members:');
  logger.debug('Username         | Total | Monthly Field | Actual Oct Refs | Monthly Earnings | Status');
  logger.debug('─'.repeat(90));

  const mismatches: string[] = [];

  for (const member of topMembers) {
    // Calculate ACTUAL October referrals for this member
    const actualOctoberReferrals = await prisma.member.count({
      where: {
        referredBy: member.referralCode,
        createdAt: { gte: octoberStart, lte: now },
      },
    });

    // Calculate ACTUAL October earnings
    const actualOctoberEarnings = await prisma.commission.aggregate({
      where: {
        memberId: member.id,
        createdAt: { gte: octoberStart, lte: now },
      },
      _sum: { memberShare: true },
    });

    const actualEarnings = actualOctoberEarnings._sum.memberShare || 0;

    const referralsMatch = member.monthlyReferred === actualOctoberReferrals;
    const earningsMatch = Math.abs(member.monthlyEarnings - actualEarnings) < 0.01;
    const match = referralsMatch && earningsMatch ? '✅' : '❌';

    if (!referralsMatch || !earningsMatch) {
      mismatches.push(member.username);
    }

    logger.debug(
      `${member.username.padEnd(16)} | ${member.totalReferred.toString().padEnd(5)} | ` +
      `${member.monthlyReferred.toString().padEnd(13)} | ` +
      `${actualOctoberReferrals.toString().padEnd(15)} | ` +
      `$${member.monthlyEarnings.toFixed(2).padEnd(15)} | ${match}`
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITICAL CHECK 4: Logical consistency
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.debug('\n🔍 LOGICAL VALIDATION:');

  // Check: sum of all monthlyReferred should equal newReferralsInOctober
  const sumMonthlyReferred = await prisma.member.aggregate({
    _sum: { monthlyReferred: true },
  });

  const sumMatches = sumMonthlyReferred._sum.monthlyReferred === newReferralsInOctober;
  logger.debug(`  Sum of monthlyReferred (${sumMonthlyReferred._sum.monthlyReferred}) = ` +
    `New referrals (${newReferralsInOctober})? ${sumMatches ? '✅' : '❌ MISMATCH!'}`);

  // Check: No member has monthlyReferred > totalReferred
  const invalidMonthly = await prisma.member.findMany({
    where: {
      monthlyReferred: { gt: prisma.member.fields.totalReferred },
    },
    select: { username: true, monthlyReferred: true, totalReferred: true },
  });

  logger.debug(`  Members with monthly > total: ${invalidMonthly.length} ${invalidMonthly.length === 0 ? '✅' : '❌'}`);
  if (invalidMonthly.length > 0) {
    invalidMonthly.forEach(m => {
      logger.debug(`    - ${m.username}: monthly=${m.monthlyReferred}, total=${m.totalReferred}`);
    });
  }

  // Check: No negative values
  const negativeMonthly = await prisma.member.count({
    where: { monthlyReferred: { lt: 0 } },
  });
  const negativeEarnings = await prisma.member.count({
    where: { monthlyEarnings: { lt: 0 } },
  });

  logger.debug(`  Members with negative monthlyReferred: ${negativeMonthly} ${negativeMonthly === 0 ? '✅' : '❌'}`);
  logger.debug(`  Members with negative monthlyEarnings: ${negativeEarnings} ${negativeEarnings === 0 ? '✅' : '❌'}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VERDICT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.debug('\n═══════════════════════════════════════');
  logger.info(' DIAGNOSIS SUMMARY:');
  logger.debug('═══════════════════════════════════════');

  if (newReferralsInOctober === 0) {
    logger.info('FINDING: Zero new referrals in October');
    logger.info(''This Month" = 0 is CORRECT');
    logger.info('October earnings are from RECURRING payments only');
    logger.debug('\n⚠️  ACTION NEEDED: Create test data to verify tracking works');
  } else {
    logger.warn('  FINDING: ${newReferralsInOctober} new referrals in October');
    if (sumMatches) {
      logger.info('monthlyReferred fields are accurate');
    } else {
      logger.error('CRITICAL: monthlyReferred out of sync!');
      logger.debug('   → Need to recalculate from database');
    }
  }

  if (mismatches.length > 0) {
    logger.debug(`\n❌ ${mismatches.length} members have mismatched data: ${mismatches.join(', ')}`);
    logger.debug('   → Run recalculation script to fix');
  } else {
    logger.debug('\n✅ All top 10 members have accurate data');
  }

  const hasErrors = !sumMatches || invalidMonthly.length > 0 || negativeMonthly > 0 || negativeEarnings > 0;

  logger.debug('\n═══════════════════════════════════════');
  logger.debug(hasErrors ? '❌ ERRORS DETECTED - NEEDS ATTENTION' : '✅ ALL CHECKS PASSED');
  logger.debug('═══════════════════════════════════════\n');

  await prisma.$disconnect();
}

diagnose().catch(console.error);
