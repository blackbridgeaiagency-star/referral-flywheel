// scripts/count-members.ts
import { prisma } from '../lib/db/prisma';

async function countMembers() {
  try {
    const totalMembers = await prisma.member.count();
    console.log(`\n📊 Total Members: ${totalMembers}`);

    // Breakdown by creator
    const creators = await prisma.creator.findMany({
      select: {
        id: true,
        companyName: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    console.log('\n📋 Members by Creator:');
    creators.forEach((creator) => {
      console.log(`  - ${creator.companyName}: ${creator._count.members} members`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

countMembers();
