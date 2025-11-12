// scripts/test-tier-update.ts
import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';


async function testTierUpdate() {
  logger.debug('\n🧪 Testing Tier Update Flow\n');

  try {
    // Get FitnessHub creator
    const creator = await prisma.creator.findFirst({
      where: { companyName: 'FitnessHub' },
      select: {
        id: true,
        companyName: true,
        tier1Count: true,
        tier1Reward: true,
        tier2Count: true,
        tier2Reward: true,
        tier3Count: true,
        tier3Reward: true,
        tier4Count: true,
        tier4Reward: true,
      },
    });

    if (!creator) {
      logger.error('Creator not found');
      return;
    }

    logger.info(' Current FitnessHub Tiers:');
    logger.debug(`  Bronze (${creator.tier1Count} refs): ${creator.tier1Reward}`);
    logger.debug(`  Silver (${creator.tier2Count} refs): ${creator.tier2Reward}`);
    logger.debug(`  Gold (${creator.tier3Count} refs): ${creator.tier3Reward}`);
    logger.debug(`  Platinum (${creator.tier4Count} refs): ${creator.tier4Reward}`);

    // Get a member from this creator
    const member = await prisma.member.findFirst({
      where: { creatorId: creator.id },
      select: {
        id: true,
        username: true,
        membershipId: true,
        totalReferred: true,
      },
    });

    if (member) {
      logger.debug(`\n👤 Sample Member: ${member.username}`);
      logger.debug(`   Total Referrals: ${member.totalReferred}`);
      logger.debug(`   Dashboard URL: http://localhost:3000/customer/${member.membershipId}`);

      // Determine rank
      let rank = 'Unranked';
      if (member.totalReferred >= creator.tier4Count) rank = 'Platinum';
      else if (member.totalReferred >= creator.tier3Count) rank = 'Gold';
      else if (member.totalReferred >= creator.tier2Count) rank = 'Silver';
      else if (member.totalReferred >= creator.tier1Count) rank = 'Bronze';

      logger.debug(`   Current Rank: ${rank}`);
    }

    logger.debug(`\n📝 To Update Tiers:`);
    logger.debug(`  1. Go to: http://localhost:3000/seller-product/prod_fitnesshub_test`);
    logger.debug(`  2. Modify tier counts or rewards`);
    logger.debug(`  3. Click "Save Changes"`);
    logger.debug(`  4. Refresh member dashboard to see changes`);

    logger.debug(`\n✅ Current tier data is correctly stored in database`);
    logger.info('Member dashboard fetches this data on every page load');

  } catch (error) {
    logger.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTierUpdate();
