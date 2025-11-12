// scripts/check-custom-rewards-status.ts
import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';


async function checkCustomRewardsStatus() {
  logger.debug('\n🔍 Checking Custom Rewards Status\n');

  try {
    const creators = await prisma.creator.findMany({
      select: {
        companyName: true,
        customRewardEnabled: true,
        customRewardTimeframe: true,
        customRewardType: true,
      },
    });

    creators.forEach(creator => {
      logger.info(' ${creator.companyName}:');
      logger.debug(`   Custom Rewards: ${creator.customRewardEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
      if (creator.customRewardEnabled) {
        logger.debug(`   Timeframe: ${creator.customRewardTimeframe}`);
        logger.debug(`   Type: ${creator.customRewardType}`);
      }
      logger.debug();
    });

    logger.info(' How it works:');
    logger.debug('   1. Toggle custom rewards ON/OFF in creator dashboard');
    logger.debug('   2. Click "Save Competition Settings"');
    logger.debug('   3. Refresh member dashboard');
    logger.debug('   4. Banner appears/disappears based on customRewardEnabled');

  } catch (error) {
    logger.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomRewardsStatus();
