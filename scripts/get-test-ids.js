require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    const creators = await prisma.creator.findMany();
    console.log('=== CREATORS ===');
    for (const c of creators) {
      console.log(JSON.stringify(c, null, 2));
    }

    const members = await prisma.member.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log('\n=== MEMBERS (5 most recent) ===');
    for (const m of members) {
      console.log(JSON.stringify(m, null, 2));
    }

    // Get membership IDs (used in customer/[experienceId] URL)
    const memberIds = await prisma.member.findMany({
      select: { membershipId: true, username: true, email: true }
    });
    console.log('\n=== MEMBERSHIP IDs (for /customer/[id]) ===');
    memberIds.forEach(m => console.log(m.membershipId, '|', m.username || m.email));
  } finally {
    await prisma.$disconnect();
  }
}

main();
