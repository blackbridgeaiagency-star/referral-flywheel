require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const members = await prisma.member.findMany({
    take: 5,
    select: {
      id: true,
      membershipId: true,
      username: true,
      referralCode: true,
      whopUsername: true
    }
  });
  console.log('=== MEMBERS ===');
  console.log(JSON.stringify(members, null, 2));

  const creators = await prisma.creator.findMany({
    take: 3,
    select: {
      id: true,
      companyId: true,
      companyName: true
    }
  });
  console.log('\n=== CREATORS ===');
  console.log(JSON.stringify(creators, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
