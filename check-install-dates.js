const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('='.repeat(80));
  console.log('📅 CREATOR INSTALL DATES & REVENUE TIMELINE');
  console.log('='.repeat(80));
  console.log('');

  // Get all creators with their install dates
  const creators = await prisma.creator.findMany({
    select: {
      companyName: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log('CREATOR "INSTALL" DATES (createdAt field):');
  creators.forEach(c => {
    console.log(`  ${c.companyName}: ${c.createdAt.toISOString()}`);
  });
  console.log('');

  // Get commission date range
  const oldestCommission = await prisma.commission.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });

  const newestCommission = await prisma.commission.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  });

  console.log('─'.repeat(80));
  console.log('COMMISSION DATE RANGE:');
  console.log('─'.repeat(80));
  console.log(`  Oldest: ${oldestCommission.createdAt.toISOString()}`);
  console.log(`  Newest: ${newestCommission.createdAt.toISOString()}`);
  console.log('');

  // Calculate days of data
  const daysDiff = Math.floor((newestCommission.createdAt - oldestCommission.createdAt) / (1000 * 60 * 60 * 24));
  console.log(`  Span: ${daysDiff} days of commission data`);
  console.log('');

  console.log('─'.repeat(80));
  console.log('HOW "TOTAL REVENUE" IS CALCULATED:');
  console.log('─'.repeat(80));
  console.log('');
  console.log('Formula:');
  console.log('  Total Revenue = SUM(commission.saleAmount)');
  console.log('                  WHERE creatorId = xxx');
  console.log('                  AND status = "paid"');
  console.log('');
  console.log('This sums ALL paid commissions from:');
  const oldestDate = oldestCommission.createdAt.toISOString().split('T')[0];
  const newestDate = newestCommission.createdAt.toISOString().split('T')[0];
  console.log('  - ' + oldestDate + ' (earliest)');
  console.log('  - ' + newestDate + ' (latest)');
  console.log('');
  console.log('NOTE: The "createdAt" field on Creator is when the seed script ran,');
  console.log('      NOT necessarily when they would have "installed" the app.');
  console.log('');

  console.log('─'.repeat(80));
  console.log('IN PRODUCTION:');
  console.log('─'.repeat(80));
  console.log('');
  console.log('When a real creator installs your Whop app:');
  console.log('  1. Whop OAuth flow completes');
  console.log('  2. Creator record created with createdAt = NOW');
  console.log('  3. From that point forward, all payments create commissions');
  console.log('  4. "Total Revenue" shows sum of all commissions since install');
  console.log('');
  console.log('The createdAt field AUTOMATICALLY tracks install date!');
  console.log('');

  // Show FitnessHub specific data
  const fitnessHub = await prisma.creator.findFirst({
    where: { companyName: 'FitnessHub' },
    select: {
      companyName: true,
      createdAt: true,
      _count: {
        select: {
          commissions: {
            where: { status: 'paid' }
          }
        }
      }
    }
  });

  const fitnessCommissions = await prisma.commission.aggregate({
    where: {
      creator: { companyName: 'FitnessHub' },
      status: 'paid'
    },
    _sum: {
      saleAmount: true
    }
  });

  const fitnessDateRange = await prisma.commission.aggregate({
    where: {
      creator: { companyName: 'FitnessHub' },
      status: 'paid'
    },
    _min: { createdAt: true },
    _max: { createdAt: true }
  });

  console.log('─'.repeat(80));
  console.log('FITNESSHUB EXAMPLE:');
  console.log('─'.repeat(80));
  const installDate = fitnessHub.createdAt.toISOString().split('T')[0];
  const firstCommDate = fitnessDateRange._min.createdAt.toISOString().split('T')[0];
  const lastCommDate = fitnessDateRange._max.createdAt.toISOString().split('T')[0];
  console.log('  "Installed" on: ' + installDate);
  console.log('  First commission: ' + firstCommDate);
  console.log('  Latest commission: ' + lastCommDate);
  console.log('  Total commissions: ' + fitnessHub._count.commissions);
  console.log('  Total Revenue: $' + fitnessCommissions._sum.saleAmount.toFixed(2));
  console.log('');
  console.log('This $128,307.16 represents ALL revenue since "installing" the app.');
  console.log('');

  await prisma.$disconnect();
})();
