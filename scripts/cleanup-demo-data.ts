// scripts/cleanup-demo-data.ts
// 🧹 CLEANUP DEMO DATA after taking screenshots
// SAFE: Only removes demo data, preserves real user data

import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';


const prisma = new PrismaClient();

async function main() {
  logger.debug('🧹 Starting demo data cleanup...\n');
  logger.warn('  This will ONLY delete demo data (emails with @demo.com and demo user IDs)\n');
  logger.info('Real user data will be preserved!\n');

  // Step 1: Find all demo member IDs
  logger.info(' Finding demo members...');
  const demoMembers = await prisma.member.findMany({
    where: {
      OR: [
        { userId: 'hero_user_demo' },
        { userId: { startsWith: 'top_earner_' } },
        { userId: { startsWith: 'mid_member_' } },
        { userId: { startsWith: 'regular_member_' } },
        { userId: { startsWith: 'oct_member_' } }, // October members from hero
        { userId: { startsWith: 'oct_ref_' } }, // October referrals from top performers
        { email: { contains: '@demo.com' } },
      ],
    },
    select: { id: true, userId: true, email: true },
  });
  const demoMemberIds = demoMembers.map(m => m.id);
  logger.debug(`   Found ${demoMembers.length} demo members\n`);

  // Step 2: Delete attribution clicks
  logger.info(' Deleting demo attribution clicks...');
  const attributions = await prisma.attributionClick.deleteMany({
    where: {
      memberId: { in: demoMemberIds },
    },
  });
  logger.debug(`   ✅ Deleted ${attributions.count} attribution clicks\n`);

  // Step 3: Delete share events
  logger.info(' Deleting demo share events...');
  const shares = await prisma.shareEvent.deleteMany({
    where: {
      memberId: { in: demoMemberIds },
    },
  });
  logger.debug(`   ✅ Deleted ${shares.count} share events\n`);

  // Step 4: Delete commissions
  logger.info(' Deleting demo commissions...');
  const commissions = await prisma.commission.deleteMany({
    where: {
      memberId: { in: demoMemberIds },
    },
  });
  logger.debug(`   ✅ Deleted ${commissions.count} commissions\n`);

  // Step 5: Delete demo members
  logger.info(' Deleting demo members...');
  const members = await prisma.member.deleteMany({
    where: {
      id: { in: demoMemberIds },
    },
  });
  logger.debug(`   ✅ Deleted ${members.count} members\n`);

  // Step 6: Reset creator stats (only if no real members exist)
  logger.info(' Checking for real members...');
  const realMemberCount = await prisma.member.count();

  if (realMemberCount === 0) {
    logger.debug('   No real members found, resetting creator stats...');
    await prisma.creator.updateMany({
      where: { companyId: 'biz_kkGoY7OvzWXRdK' },
      data: {
        totalReferrals: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
      },
    });
    logger.debug('   ✅ Creator stats reset\n');
  } else {
    logger.debug(`   ✅ Found ${realMemberCount} real members, keeping creator stats intact\n`);
  }

  logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('Demo data cleanup complete!\n');
  logger.info(' Summary:');
  logger.debug(`   • Members deleted: ${members.count}`);
  logger.debug(`   • Commissions deleted: ${commissions.count}`);
  logger.debug(`   • Attribution clicks deleted: ${attributions.count}`);
  logger.debug(`   • Share events deleted: ${shares.count}`);
  logger.debug(`   • Real members preserved: ${realMemberCount}`);
  logger.debug('\n🎯 Your database is now ready for real users!');
  logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    logger.error('❌ Error cleaning up demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
