// scripts/check-custom-rewards-status.ts
import { prisma } from '../lib/db/prisma';

async function checkCustomRewardsStatus() {
  console.log('\n🔍 Checking Custom Rewards Status\n');

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
      console.log(`📋 ${creator.companyName}:`);
      console.log(`   Custom Rewards: ${creator.customRewardEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
      if (creator.customRewardEnabled) {
        console.log(`   Timeframe: ${creator.customRewardTimeframe}`);
        console.log(`   Type: ${creator.customRewardType}`);
      }
      console.log();
    });

    console.log('💡 How it works:');
    console.log('   1. Toggle custom rewards ON/OFF in creator dashboard');
    console.log('   2. Click "Save Competition Settings"');
    console.log('   3. Refresh member dashboard');
    console.log('   4. Banner appears/disappears based on customRewardEnabled');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomRewardsStatus();
