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

  const result = await prisma.commission.aggregate({
    where: {
      creatorId: creator.id,
      status: 'paid'
    },
    _sum: {
      creatorShare: true,
      memberShare: true,
      platformShare: true,
      saleAmount: true
    }
  });

  const creatorShare = result._sum.creatorShare || 0;
  const memberShare = result._sum.memberShare || 0;
  const platformShare = result._sum.platformShare || 0;
  const saleAmount = result._sum.saleAmount || 0;

  console.log('='.repeat(80));
  console.log('REVENUE CALCULATION INVESTIGATION');
  console.log('='.repeat(80));
  console.log('');
  console.log('Total Sale Amount (100%):', saleAmount.toFixed(2));
  console.log('Member Share (10%):', memberShare.toFixed(2));
  console.log('Creator Share (70%):', creatorShare.toFixed(2));
  console.log('Platform Share (20%):', platformShare.toFixed(2));
  console.log('');
  console.log('INVESTIGATING $128,307.16:');
  console.log('As % of total revenue:', ((128307.16 / 236240.59) * 100).toFixed(2) + '%');
  console.log('As % of creatorShare:', ((128307.16 / 165366.79) * 100).toFixed(2) + '%');
  console.log('Difference from creatorShare:', (165366.79 - 128307.16).toFixed(2));
  console.log('');
  console.log('Could it be creatorShare - platformShare?');
  console.log(creatorShare.toFixed(2), '-', platformShare.toFixed(2), '=', (creatorShare - platformShare).toFixed(2));
  console.log('');
  console.log('Could it be saleAmount - memberShare - platformShare?');
  console.log(saleAmount.toFixed(2), '-', memberShare.toFixed(2), '-', platformShare.toFixed(2), '=', (saleAmount - memberShare - platformShare).toFixed(2));

  await prisma.$disconnect();
})();
