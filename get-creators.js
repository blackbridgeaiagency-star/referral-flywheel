import logger from './lib/logger';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const creators = await prisma.creator.findMany({
    select: {
      id: true,
      companyName: true,
      productId: true
    }
  });

  logger.debug('Available Creators:');
  creators.forEach(c => {
    logger.debug(`- ${c.companyName}: productId=${c.productId}`);
  });

  await prisma.$disconnect();
})();
