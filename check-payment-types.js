import logger from './lib/logger';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const creator = await prisma.creator.findFirst({
    where: { companyName: 'TechWhop' }
  });

  if (!creator) {
    logger.debug('Creator not found');
    return;
  }

  const initial = await prisma.commission.aggregate({
    where: {
      creatorId: creator.id,
      status: 'paid',
      paymentType: 'initial'
    },
    _sum: {
      saleAmount: true,
      creatorShare: true
    },
    _count: true
  });

  const recurring = await prisma.commission.aggregate({
    where: {
      creatorId: creator.id,
      status: 'paid',
      paymentType: 'recurring'
    },
    _sum: {
      saleAmount: true,
      creatorShare: true
    },
    _count: true
  });

  const totalCount = initial._count + recurring._count;
  const totalRevenue = (initial._sum.saleAmount || 0) + (recurring._sum.saleAmount || 0);
  const totalCreatorShare = (initial._sum.creatorShare || 0) + (recurring._sum.creatorShare || 0);

  logger.debug('='.repeat(80));
  logger.debug('PAYMENT TYPE BREAKDOWN FOR TECHWHOP');
  logger.debug('='.repeat(80));
  logger.debug('');
  logger.debug('INITIAL PAYMENTS (First subscription payment):');
  logger.debug('  Count:', initial._count);
  logger.debug('  Total Revenue:', (initial._sum.saleAmount || 0).toFixed(2));
  logger.debug('  Creator Share (70%):', (initial._sum.creatorShare || 0).toFixed(2));
  logger.debug('');
  logger.debug('RECURRING PAYMENTS (Monthly renewals):');
  logger.debug('  Count:', recurring._count);
  logger.debug('  Total Revenue:', (recurring._sum.saleAmount || 0).toFixed(2));
  logger.debug('  Creator Share (70%):', (recurring._sum.creatorShare || 0).toFixed(2));
  logger.debug('');
  logger.debug('TOTAL:');
  logger.debug('  Count:', totalCount);
  logger.debug('  Total Revenue:', totalRevenue.toFixed(2));
  logger.debug('  Creator Share (70%):', totalCreatorShare.toFixed(2));
  logger.debug('');
  logger.debug('KEY INSIGHTS:');
  logger.debug('  - Recurring represents', ((recurring._count / totalCount) * 100).toFixed(1) + '% of all payments');
  logger.debug('  - Recurring revenue is', ((recurring._sum.saleAmount || 0) / totalRevenue * 100).toFixed(1) + '% of total revenue');
  logger.debug('  - This shows strong retention and compound growth!');
  logger.debug('');
  logger.debug('='.repeat(80));
  logger.debug('ABOUT PAYMENT TYPES:');
  logger.debug('='.repeat(80));
  logger.debug('');
  logger.debug('The distinction between "initial" and "recurring" is important because:');
  logger.debug('');
  logger.debug('1. TRACKING: Helps distinguish new customer acquisition vs retention');
  logger.debug('2. ANALYTICS: Shows how much revenue comes from renewals vs new signups');
  logger.debug('3. ATTRIBUTION: Initial payments = successful referral conversions');
  logger.debug('4. GROWTH METRICS: High recurring % = good retention = sustainable growth');
  logger.debug('');
  logger.debug('For Whop subscriptions:');
  logger.debug('  - "initial" = First payment when someone signs up');
  logger.debug('  - "recurring" = Every monthly renewal after that');
  logger.debug('  - Both count toward referrer commissions (10% lifetime)');
  logger.debug('');
  logger.debug('The creator gets 70% of BOTH types of payments.');
  logger.debug('The distinction helps with analytics, but both are "real" revenue.');

  await prisma.$disconnect();
})();
