// Quick debug script to check if hero member exists
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for hero member...\n');

  const heroMember = await prisma.member.findUnique({
    where: { id: 'mem_hero_demo' },
  });

  if (heroMember) {
    console.log('✅ Hero member found!');
    console.log(JSON.stringify(heroMember, null, 2));
  } else {
    console.log('❌ Hero member NOT found');

    // Check all demo members
    const demoMembers = await prisma.member.findMany({
      where: {
        email: { contains: '@demo.com' },
      },
      select: { id: true, username: true, email: true },
      take: 10,
    });

    console.log(`\nFound ${demoMembers.length} demo members:`);
    demoMembers.forEach(m => console.log(`  - ${m.id}: ${m.username} (${m.email})`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
