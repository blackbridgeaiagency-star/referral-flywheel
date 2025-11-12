// scripts/test-full-reward-flow.ts
import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';


async function testFullRewardFlow() {
  logger.debug('\n🧪 Testing Full Reward Flow\n');

  try {
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
        customRewardEnabled: true,
        customRewardTimeframe: true,
        customRewardType: true,
        customReward1st: true,
      },
    });

    if (!creator) {
      logger.error('Creator not found');
      return;
    }

    logger.info(' FitnessHub Current Settings:\n');
    logger.info(' Reward Tiers:');
    logger.debug(`   Bronze: ${creator.tier1Count} refs → "${creator.tier1Reward}"`);
    logger.debug(`   Silver: ${creator.tier2Count} refs → "${creator.tier2Reward}"`);
    logger.debug(`   Gold: ${creator.tier3Count} refs → "${creator.tier3Reward}"`);
    logger.debug(`   Platinum: ${creator.tier4Count} refs → "${creator.tier4Reward}"`);

    logger.debug(`\n🏆 Custom Competition:`);
    logger.debug(`   Enabled: ${creator.customRewardEnabled}`);
    logger.debug(`   Timeframe: ${creator.customRewardTimeframe}`);
    logger.debug(`   Type: ${creator.customRewardType}`);
    logger.debug(`   1st Place: ${creator.customReward1st}`);

    const member = await prisma.member.findFirst({
      where: { creatorId: creator.id },
      select: {
        username: true,
        membershipId: true,
        totalReferred: true,
      },
    });

    if (member) {
      let currentRank = 'Unranked';
      if (member.totalReferred >= creator.tier4Count) currentRank = 'Platinum';
      else if (member.totalReferred >= creator.tier3Count) currentRank = 'Gold';
      else if (member.totalReferred >= creator.tier2Count) currentRank = 'Silver';
      else if (member.totalReferred >= creator.tier1Count) currentRank = 'Bronze';

      logger.debug(`\n👤 Sample Member: ${member.username}`);
      logger.debug(`   Referrals: ${member.totalReferred}`);
      logger.debug(`   Current Rank: ${currentRank}`);
      logger.debug(`   Dashboard: http://localhost:3000/customer/${member.membershipId}`);
    }

    logger.debug(`\n📝 To Test:`);
    logger.debug(`   1. Go to: http://localhost:3000/seller-product/prod_fitnesshub_test`);
    logger.debug(`   2. Change Bronze from ${creator.tier1Count} to 7`);
    logger.debug(`   3. Change reward from "${creator.tier1Reward}" to "A Pat On The Back"`);
    logger.debug(`   4. Toggle custom competition ON/OFF`);
    logger.debug(`   5. Click "Save Changes"`);
    logger.debug(`   6. Refresh member dashboard`);
    logger.debug(`   7. Verify changes appear!`);

  } catch (error) {
    logger.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullRewardFlow();
