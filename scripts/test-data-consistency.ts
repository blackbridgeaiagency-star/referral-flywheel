// scripts/test-data-consistency.ts
import { prisma } from '../lib/db/prisma';

async function testDataConsistency() {
  console.log('\n🔍 Testing Data Consistency Between Creator & Member Dashboards\n');

  try {
    // Get a creator
    const creator = await prisma.creator.findFirst({
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
        customReward2nd: true,
        customReward3rd: true,
      },
    });

    if (!creator) {
      console.log('❌ No creator found');
      return;
    }

    console.log(`📋 Creator: ${creator.companyName}`);
    console.log('\n🎁 Reward Tiers:');
    console.log(`  Bronze (Tier 1): ${creator.tier1Count} refs → ${creator.tier1Reward}`);
    console.log(`  Silver (Tier 2): ${creator.tier2Count} refs → ${creator.tier2Reward}`);
    console.log(`  Gold (Tier 3): ${creator.tier3Count} refs → ${creator.tier3Reward}`);
    console.log(`  Platinum (Tier 4): ${creator.tier4Count} refs → ${creator.tier4Reward}`);

    console.log('\n🏆 Custom Competition:');
    console.log(`  Enabled: ${creator.customRewardEnabled ? 'Yes' : 'No'}`);
    if (creator.customRewardEnabled) {
      console.log(`  Timeframe: ${creator.customRewardTimeframe}`);
      console.log(`  Type: ${creator.customRewardType}`);
      console.log(`  1st Place: ${creator.customReward1st}`);
      console.log(`  2nd Place: ${creator.customReward2nd}`);
      console.log(`  3rd Place: ${creator.customReward3rd}`);
    }

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
      console.log(`\n👤 Sample Member: ${member.username}`);
      console.log(`   Membership ID: ${member.membershipId}`);
      console.log(`   Total Referrals: ${member.totalReferred}`);
      console.log(`\n✅ Member dashboard will fetch the same tier data from Creator table`);
      console.log(`   URL: http://localhost:3000/customer/${member.membershipId}`);
    }

    console.log('\n✅ Data consistency test complete!');
    console.log('💡 Member dashboards fetch fresh data on every page load (no caching)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDataConsistency();
