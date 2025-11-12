import logger from './lib/logger';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  logger.debug('='.repeat(80));
  logger.info(' CREATOR INSTALL DATES & REVENUE TIMELINE');
  logger.debug('='.repeat(80));
  logger.debug('');

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

  logger.debug('CREATOR "INSTALL" DATES (createdAt field):');
  creators.forEach(c => {
    logger.debug(`  ${c.companyName}: ${c.createdAt.toISOString()}`);
  });
  logger.debug('');

  // Get commission date range
  const oldestCommission = await prisma.commission.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });

  const newestCommission = await prisma.commission.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  });

  logger.debug('─'.repeat(80));
  logger.debug('COMMISSION DATE RANGE:');
  logger.debug('─'.repeat(80));
  logger.debug(`  Oldest: ${oldestCommission.createdAt.toISOString()}`);
  logger.debug(`  Newest: ${newestCommission.createdAt.toISOString()}`);
  logger.debug('');

  // Calculate days of data
  const daysDiff = Math.floor((newestCommission.createdAt - oldestCommission.createdAt) / (1000 * 60 * 60 * 24));
  logger.debug(`  Span: ${daysDiff} days of commission data`);
  logger.debug('');

  logger.debug('─'.repeat(80));
  logger.debug('HOW "TOTAL REVENUE" IS CALCULATED:');
  logger.debug('─'.repeat(80));
  logger.debug('');
  logger.debug('Formula:');
  logger.debug('  Total Revenue = SUM(commission.saleAmount)');
  logger.debug('                  WHERE creatorId = xxx');
  logger.debug('                  AND status = "paid"');
  logger.debug('');
  logger.debug('This sums ALL paid commissions from:');
  const oldestDate = oldestCommission.createdAt.toISOString().split('T')[0];
  const newestDate = newestCommission.createdAt.toISOString().split('T')[0];
  logger.debug('  - ' + oldestDate + ' (earliest)');
  logger.debug('  - ' + newestDate + ' (latest)');
  logger.debug('');
  logger.debug('NOTE: The "createdAt" field on Creator is when the seed script ran,');
  logger.debug('      NOT necessarily when they would have "installed" the app.');
  logger.debug('');

  logger.debug('─'.repeat(80));
  logger.debug('IN PRODUCTION:');
  logger.debug('─'.repeat(80));
  logger.debug('');
  logger.debug('When a real creator installs your Whop app:');
  logger.debug('  1. Whop OAuth flow completes');
  logger.debug('  2. Creator record created with createdAt = NOW');
  logger.debug('  3. From that point forward, all payments create commissions');
  logger.debug('  4. "Total Revenue" shows sum of all commissions since install');
  logger.debug('');
  logger.debug('The createdAt field AUTOMATICALLY tracks install date!');
  logger.debug('');

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

  logger.debug('─'.repeat(80));
  logger.debug('FITNESSHUB EXAMPLE:');
  logger.debug('─'.repeat(80));
  const installDate = fitnessHub.createdAt.toISOString().split('T')[0];
  const firstCommDate = fitnessDateRange._min.createdAt.toISOString().split('T')[0];
  const lastCommDate = fitnessDateRange._max.createdAt.toISOString().split('T')[0];
  logger.debug('  "Installed" on: ' + installDate);
  logger.debug('  First commission: ' + firstCommDate);
  logger.debug('  Latest commission: ' + lastCommDate);
  logger.debug('  Total commissions: ' + fitnessHub._count.commissions);
  logger.debug('  Total Revenue: $' + fitnessCommissions._sum.saleAmount.toFixed(2));
  logger.debug('');
  logger.debug('This $128,307.16 represents ALL revenue since "installing" the app.');
  logger.debug('');

  await prisma.$disconnect();
})();
