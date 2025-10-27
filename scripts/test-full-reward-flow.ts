// scripts/test-full-reward-flow.ts
import { prisma } from '../lib/db/prisma';

async function testFullRewardFlow() {
  console.log('\n🧪 Testing Full Reward Flow\n');

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
      console.log('❌ Creator not found');
      return;
    }

    console.log(`📋 FitnessHub Current Settings:\n`);
    console.log(`🎁 Reward Tiers:`);
    console.log(`   Bronze: ${creator.tier1Count} refs → "${creator.tier1Reward}"`);
    console.log(`   Silver: ${creator.tier2Count} refs → "${creator.tier2Reward}"`);
    console.log(`   Gold: ${creator.tier3Count} refs → "${creator.tier3Reward}"`);
    console.log(`   Platinum: ${creator.tier4Count} refs → "${creator.tier4Reward}"`);

    console.log(`\n🏆 Custom Competition:`);
    console.log(`   Enabled: ${creator.customRewardEnabled}`);
    console.log(`   Timeframe: ${creator.customRewardTimeframe}`);
    console.log(`   Type: ${creator.customRewardType}`);
    console.log(`   1st Place: ${creator.customReward1st}`);

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

      console.log(`\n👤 Sample Member: ${member.username}`);
      console.log(`   Referrals: ${member.totalReferred}`);
      console.log(`   Current Rank: ${currentRank}`);
      console.log(`   Dashboard: http://localhost:3000/customer/${member.membershipId}`);
    }

    console.log(`\n📝 To Test:`);
    console.log(`   1. Go to: http://localhost:3000/seller-product/prod_fitnesshub_test`);
    console.log(`   2. Change Bronze from ${creator.tier1Count} to 7`);
    console.log(`   3. Change reward from "${creator.tier1Reward}" to "A Pat On The Back"`);
    console.log(`   4. Toggle custom competition ON/OFF`);
    console.log(`   5. Click "Save Changes"`);
    console.log(`   6. Refresh member dashboard`);
    console.log(`   7. Verify changes appear!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullRewardFlow();
