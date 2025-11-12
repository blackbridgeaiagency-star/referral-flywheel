import logger from './lib/logger';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const creator = await prisma.creator.findFirst({
    where: { companyName: 'TechWhop' },
    select: {
      totalRevenue: true,
      monthlyRevenue: true,
      companyName: true
    }
  });

  logger.debug('='.repeat(80));
  logger.debug('CACHED REVENUE FIELDS IN CREATOR TABLE');
  logger.debug('='.repeat(80));
  logger.debug('');
  logger.debug('Creator:', creator.companyName);
  logger.debug('totalRevenue (cached):', creator.totalRevenue.toFixed(2));
  logger.debug('monthlyRevenue (cached):', creator.monthlyRevenue.toFixed(2));
  logger.debug('');
  logger.debug('NOTE: These are cached fields updated by webhooks');
  logger.debug('They may not match real-time calculations');

  await prisma.$disconnect();
})();
