import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';


async function checkLinda() {
  const member = await prisma.member.findFirst({
    where: { membershipId: 'mem_techwhop_1' }
  });

  if (!member) {
    logger.debug('Member not found!');
    return;
  }

  logger.debug('MEMBER:', member.username);
  logger.debug('Referral Code:', member.referralCode);
  logger.debug('Total Referred (DB field):', member.totalReferred);
  logger.debug('Lifetime Earnings (DB field):', member.lifetimeEarnings);

  // Count actual referrals
  const referrals = await prisma.member.findMany({
    where: { referredBy: member.referralCode }
  });

  logger.debug('\nACTUAL REFERRALS:', referrals.length);
  referrals.forEach((r, i) => {
    logger.debug(`  ${i + 1}. ${r.username} (${r.membershipId})`);
  });

  // Count commissions
  const commissions = await prisma.commission.findMany({
    where: { memberId: member.id }
  });

  logger.debug('\nCOMMISSIONS:', commissions.length);
  const totalEarned = commissions.reduce((sum, c) => sum + c.memberShare, 0);
  logger.debug('Total Earned:', totalEarned);

  commissions.slice(0, 5).forEach((c, i) => {
    logger.debug(`  ${i + 1}. For: ${c.whopMembershipId}, Amount: $${c.memberShare}`);
  });

  await prisma.$disconnect();
}

checkLinda();
