import logger from '../lib/logger';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseRevenue() {
  try {
    const productId = 'prod_ImvAT3IIRbPBT';

    logger.debug(`\n========================================`);
    logger.debug(`DIAGNOSING REVENUE FOR: ${productId}`);
    logger.debug(`========================================\n`);

    // Get the creator
    const creator = await prisma.creator.findFirst({
      where: { productId },
      select: { id: true, companyName: true }
    });

    if (!creator) {
      logger.error('Creator not found');
      return;
    }

    logger.info('Creator: ${creator.companyName}');
    logger.debug(`   ID: ${creator.id}\n`);

    // Get total creator revenue
    const totalCommissions = await prisma.commission.findMany({
      where: { creatorId: creator.id, status: 'paid' },
      select: { saleAmount: true }
    });
    const totalRevenue = totalCommissions.reduce((sum, c) => sum + c.saleAmount, 0);

    logger.info(' TOTAL CREATOR REVENUE:');
    logger.debug(`   Paid commissions: ${totalCommissions.length}`);
    logger.debug(`   Total revenue: $${(totalRevenue / 100).toFixed(2)}\n`);

    // Get top 3 referrers by total referrals
    const topReferrers = await prisma.member.findMany({
      where: { creatorId: creator.id },
      select: {
        id: true,
        username: true,
        referralCode: true,
        totalReferred: true,
        membershipId: true
      },
      orderBy: { totalReferred: 'desc' },
      take: 3
    });

    logger.info(' TOP 3 REFERRERS:\n');

    for (const referrer of topReferrers) {
      logger.debug(`${referrer.username} (${referrer.referralCode})`);
      logger.debug(`   Total referrals: ${referrer.totalReferred}`);
      logger.debug(`   MembershipId: ${referrer.membershipId}`);

      // Get referred members
      const referredMembers = await prisma.member.findMany({
        where: {
          referredBy: referrer.referralCode,
          creatorId: creator.id
        },
        select: {
          id: true,
          username: true,
          membershipId: true
        }
      });

      logger.debug(`   ✅ Referred members found: ${referredMembers.length}`);

      if (referredMembers.length > 0) {
        logger.debug(`   First 3 referred members:`);
        referredMembers.slice(0, 3).forEach(rm => {
          logger.debug(`     - ${rm.username} (membershipId: ${rm.membershipId})`);
        });

        // Get all membershipIds
        const membershipIds = referredMembers.map(m => m.membershipId);

        // Get commissions for these members
        const commissions = await prisma.commission.findMany({
          where: {
            whopMembershipId: { in: membershipIds },
            creatorId: creator.id
          },
          select: {
            id: true,
            whopMembershipId: true,
            saleAmount: true,
            status: true
          }
        });

        logger.debug(`   📦 Commissions found: ${commissions.length}`);

        if (commissions.length > 0) {
          const paidCommissions = commissions.filter(c => c.status === 'paid');
          const pendingCommissions = commissions.filter(c => c.status !== 'paid');

          logger.debug(`     - Paid: ${paidCommissions.length}`);
          logger.debug(`     - Other status: ${pendingCommissions.length}`);

          if (paidCommissions.length > 0) {
            const revenueGenerated = paidCommissions.reduce((sum, c) => sum + c.saleAmount, 0);
            logger.debug(`   💰 Revenue generated: $${(revenueGenerated / 100).toFixed(2)}`);
          } else {
            logger.debug(`   ❌ No paid commissions found`);
          }

          // Show commission statuses
          if (pendingCommissions.length > 0) {
            logger.debug(`   Pending commission statuses:`);
            const statusCounts = {};
            pendingCommissions.forEach(c => {
              statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
            });
            Object.entries(statusCounts).forEach(([status, count]) => {
              logger.debug(`     - ${status}: ${count}`);
            });
          }
        } else {
          logger.debug(`   ❌ No commissions found for referred members`);
          logger.debug(`   Checking if membershipIds exist in Commission table...`);

          // Check each membershipId
          for (const membershipId of membershipIds.slice(0, 3)) {
            const anyCommission = await prisma.commission.findFirst({
              where: { whopMembershipId: membershipId }
            });
            if (anyCommission) {
              logger.debug(`     ⚠️  ${membershipId} has commission but for different creator`);
            } else {
              logger.debug(`     ❌ ${membershipId} has no commissions at all`);
            }
          }
        }
      } else {
        logger.debug(`   ⚠️  No referred members found (mismatch with totalReferred: ${referrer.totalReferred})`);
      }

      logger.debug('');
    }

    // Summary
    logger.debug(`\n========================================`);
    logger.debug(`SUMMARY`);
    logger.debug(`========================================`);
    logger.debug(`Total Revenue: $${(totalRevenue / 100).toFixed(2)}`);
    logger.debug(`Top 3 Referrers have: ${topReferrers.reduce((sum, r) => sum + r.totalReferred, 0)} total referrals`);
    logger.debug(`\nIf percentage is 0%, it means:`);
    logger.debug(`  1. Referred members don't have membershipIds that match Commission.whopMembershipId`);
    logger.debug(`  2. Commissions exist but are not status='paid'`);
    logger.debug(`  3. Commissions don't exist for referred members`);

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseRevenue();
