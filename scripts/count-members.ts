// scripts/count-members.ts
import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';


async function countMembers() {
  try {
    const totalMembers = await prisma.member.count();
    logger.debug(`\n📊 Total Members: ${totalMembers}`);

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

    logger.debug('\n📋 Members by Creator:');
    creators.forEach((creator) => {
      logger.debug(`  - ${creator.companyName}: ${creator._count.members} members`);
    });

    await prisma.$disconnect();
  } catch (error) {
    logger.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

countMembers();
