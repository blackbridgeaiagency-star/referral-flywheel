import logger from '../lib/logger';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    // Get a creator
    const creator = await prisma.creator.findFirst({
      select: { id: true, companyName: true }
    });

    if (!creator) {
      logger.debug('No creators found');
      return;
    }

    logger.debug('Creator:', creator.companyName);
    logger.debug('Creator ID:', creator.id);

    // Get members with referrals
    const members = await prisma.member.findMany({
      where: { creatorId: creator.id, totalReferred: { gt: 0 } },
      select: {
        username: true,
        referralCode: true,
        totalReferred: true,
      },
      orderBy: { totalReferred: 'desc' },
      take: 3
    });

    logger.debug('\nTop 3 members by referral count:');
    for (const m of members) {
      logger.debug(`- ${m.username}: ${m.totalReferred} referrals (code: ${m.referralCode})`);

      // Check how many referred members exist
      const referredMembers = await prisma.member.count({
        where: {
          referredBy: m.referralCode,
          creatorId: creator.id
        }
      });
      logger.debug(`  Referred members in DB: ${referredMembers}`);

      // Check commissions for those referred members
      const referredMemberIds = await prisma.member.findMany({
        where: {
          referredBy: m.referralCode,
          creatorId: creator.id
        },
        select: { membershipId: true }
      });

      const membershipIds = referredMemberIds.map(m => m.membershipId);

      const commissions = await prisma.commission.findMany({
        where: {
          whopMembershipId: { in: membershipIds },
          status: 'paid'
        },
        select: { saleAmount: true }
      });

      const totalRevenue = commissions.reduce((sum, c) => sum + c.saleAmount, 0);
      logger.debug(`  Paid commissions: ${commissions.length}`);
      logger.debug(`  Revenue generated: $${(totalRevenue / 100).toFixed(2)}`);
    }

    // Check total creator revenue
    const totalCommissions = await prisma.commission.findMany({
      where: { creatorId: creator.id, status: 'paid' },
      select: { saleAmount: true }
    });
    const totalRevenue = totalCommissions.reduce((sum, c) => sum + c.saleAmount, 0);
    logger.debug(`\nTotal creator revenue: $${(totalRevenue / 100).toFixed(2)}`);
    logger.debug(`Total paid commissions: ${totalCommissions.length}`);

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
