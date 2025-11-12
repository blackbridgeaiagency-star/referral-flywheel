import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';


async function verify10Members() {
  const members = await prisma.member.findMany({
    take: 10,
    orderBy: { totalReferred: 'desc' }
  });

  logger.info(' VERIFYING TOP 10 MEMBERS WITH REFERRALS:\n');

  let issuesFound = 0;

  for (const member of members) {
    // Count actual referrals
    const actualReferrals = await prisma.member.count({
      where: { referredBy: member.referralCode }
    });

    // Count commissions
    const commissions = await prisma.commission.aggregate({
      where: { memberId: member.id, status: 'paid' },
      _sum: { memberShare: true },
      _count: true
    });

    const dbEarnings = commissions._sum.memberShare || 0;
    const earningsDiff = Math.abs(dbEarnings - member.lifetimeEarnings);

    logger.debug(`${member.username}:`);
    logger.debug(`  DB totalReferred: ${member.totalReferred}`);
    logger.debug(`  Actual referrals: ${actualReferrals}`);
    logger.debug(`  DB earnings: $${member.lifetimeEarnings.toFixed(2)}`);
    logger.debug(`  Calculated earnings: $${dbEarnings.toFixed(2)}`);
    logger.debug(`  Commissions: ${commissions._count} records`);

    // Validate
    if (dbEarnings > 0 && actualReferrals === 0) {
      logger.debug(`  ❌ ISSUE: Has earnings but no referrals!\n`);
      issuesFound++;
    } else if (actualReferrals !== member.totalReferred) {
      logger.debug(`  ❌ ISSUE: Referral count mismatch!\n`);
      issuesFound++;
    } else if (earningsDiff > 0.01) {
      logger.debug(`  ❌ ISSUE: Earnings mismatch!\n`);
      issuesFound++;
    } else {
      logger.debug(`  ✅ PERFECT DATA INTEGRITY\n`);
    }
  }

  logger.debug('='.repeat(60));
  if (issuesFound === 0) {
    logger.info(' ALL 10 MEMBERS HAVE PERFECT DATA INTEGRITY!');
  } else {
    logger.error('Found ${issuesFound} issues');
  }

  await prisma.$disconnect();
}

verify10Members();
