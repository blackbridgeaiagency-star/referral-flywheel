// scripts/add-share-events.ts
// Quick script to add share events for "Total Shares Sent" metric

import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';


const prisma = new PrismaClient();

async function main() {
  logger.info(' Adding share events for creator dashboard...\n');

  // Get all demo members
  const allMembers = await prisma.member.findMany({
    where: {
      OR: [
        { userId: 'hero_user_demo' },
        { userId: { startsWith: 'top_earner_' } },
        { userId: { startsWith: 'mid_member_' } },
        { userId: { startsWith: 'regular_member_' } },
        { userId: { startsWith: 'oct_member_' } },
        { email: { contains: '@demo.com' } },
      ],
    },
    select: { id: true, username: true },
  });

  logger.debug(`Found ${allMembers.length} demo members\n`);

  const platforms = ['twitter', 'facebook', 'email', 'linkedin', 'whatsapp', 'telegram', 'reddit', 'clipboard'];
  let shareEventCount = 0;

  // Create 300 share events spread across all members
  logger.debug('Creating 300 share events...');
  for (let i = 0; i < 300; i++) {
    const randomMember = allMembers[Math.floor(Math.random() * allMembers.length)];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    await prisma.shareEvent.create({
      data: {
        memberId: randomMember.id,
        platform,
        shareType: 'link',
      },
    });

    shareEventCount++;

    if (shareEventCount % 50 === 0) {
      logger.debug(`   Created ${shareEventCount}/300 share events...`);
    }
  }

  logger.info('Created ${shareEventCount} share events\n');

  // Get total count
  const totalShares = await prisma.shareEvent.count();
  logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('Total share events in database: ${totalShares}');
  logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  logger.info(' Creator Dashboard 'Total Shares Sent" should now show:', totalShares);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
