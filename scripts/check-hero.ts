// Quick debug script to check if hero member exists
import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';


const prisma = new PrismaClient();

async function main() {
  logger.info(' Checking for hero member...\n');

  const heroMember = await prisma.member.findUnique({
    where: { id: 'mem_hero_demo' },
  });

  if (heroMember) {
    logger.info('Hero member found!');
    logger.debug(JSON.stringify(heroMember, null, 2));
  } else {
    logger.error('Hero member NOT found');

    // Check all demo members
    const demoMembers = await prisma.member.findMany({
      where: {
        email: { contains: '@demo.com' },
      },
      select: { id: true, username: true, email: true },
      take: 10,
    });

    logger.debug(`\nFound ${demoMembers.length} demo members:`);
    demoMembers.forEach(m => logger.debug(`  - ${m.id}: ${m.username} (${m.email})`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
