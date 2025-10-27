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

  console.log('='.repeat(80));
  console.log('CACHED REVENUE FIELDS IN CREATOR TABLE');
  console.log('='.repeat(80));
  console.log('');
  console.log('Creator:', creator.companyName);
  console.log('totalRevenue (cached):', creator.totalRevenue.toFixed(2));
  console.log('monthlyRevenue (cached):', creator.monthlyRevenue.toFixed(2));
  console.log('');
  console.log('NOTE: These are cached fields updated by webhooks');
  console.log('They may not match real-time calculations');

  await prisma.$disconnect();
})();
