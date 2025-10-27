const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const creator = await prisma.creator.findFirst({
    where: { companyName: 'TechWhop' }
  });

  if (!creator) {
    console.log('Creator not found');
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

  console.log('='.repeat(80));
  console.log('PAYMENT TYPE BREAKDOWN FOR TECHWHOP');
  console.log('='.repeat(80));
  console.log('');
  console.log('INITIAL PAYMENTS (First subscription payment):');
  console.log('  Count:', initial._count);
  console.log('  Total Revenue:', (initial._sum.saleAmount || 0).toFixed(2));
  console.log('  Creator Share (70%):', (initial._sum.creatorShare || 0).toFixed(2));
  console.log('');
  console.log('RECURRING PAYMENTS (Monthly renewals):');
  console.log('  Count:', recurring._count);
  console.log('  Total Revenue:', (recurring._sum.saleAmount || 0).toFixed(2));
  console.log('  Creator Share (70%):', (recurring._sum.creatorShare || 0).toFixed(2));
  console.log('');
  console.log('TOTAL:');
  console.log('  Count:', totalCount);
  console.log('  Total Revenue:', totalRevenue.toFixed(2));
  console.log('  Creator Share (70%):', totalCreatorShare.toFixed(2));
  console.log('');
  console.log('KEY INSIGHTS:');
  console.log('  - Recurring represents', ((recurring._count / totalCount) * 100).toFixed(1) + '% of all payments');
  console.log('  - Recurring revenue is', ((recurring._sum.saleAmount || 0) / totalRevenue * 100).toFixed(1) + '% of total revenue');
  console.log('  - This shows strong retention and compound growth!');
  console.log('');
  console.log('='.repeat(80));
  console.log('ABOUT PAYMENT TYPES:');
  console.log('='.repeat(80));
  console.log('');
  console.log('The distinction between "initial" and "recurring" is important because:');
  console.log('');
  console.log('1. TRACKING: Helps distinguish new customer acquisition vs retention');
  console.log('2. ANALYTICS: Shows how much revenue comes from renewals vs new signups');
  console.log('3. ATTRIBUTION: Initial payments = successful referral conversions');
  console.log('4. GROWTH METRICS: High recurring % = good retention = sustainable growth');
  console.log('');
  console.log('For Whop subscriptions:');
  console.log('  - "initial" = First payment when someone signs up');
  console.log('  - "recurring" = Every monthly renewal after that');
  console.log('  - Both count toward referrer commissions (10% lifetime)');
  console.log('');
  console.log('The creator gets 70% of BOTH types of payments.');
  console.log('The distinction helps with analytics, but both are "real" revenue.');

  await prisma.$disconnect();
})();
