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

  console.log('Available Creators:');
  creators.forEach(c => {
    console.log(`- ${c.companyName}: productId=${c.productId}`);
  });

  await prisma.$disconnect();
})();
